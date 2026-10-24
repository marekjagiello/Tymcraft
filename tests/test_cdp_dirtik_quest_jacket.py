import sys
import time
import socket
import json
import base64
import os
import subprocess
import urllib.request
import glob
import shutil

def get_chrome_binary():
    for cmd in ['google-chrome', 'chromium', 'chromium-browser']:
        if shutil.which(cmd):
            return cmd
    matches = glob.glob('/home/marek/.cache/ms-playwright/chromium-*/chrome-linux64/chrome')
    if matches:
        return matches[0]
    return 'google-chrome'

def run_test():
    chrome_bin = get_chrome_binary()
    port = 9227
    chrome_proc = subprocess.Popen([
        chrome_bin,
        '--headless=new',
        f'--remote-debugging-port={port}',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        req = urllib.request.urlopen(f'http://127.0.0.1:{port}/json')
        pages = json.loads(req.read().decode('utf-8'))
        page = next((p for p in pages if 'localhost:8000' in p.get('url', '')), None)
        if not page:
            print("ERROR: Minecraft page not found in CDP")
            sys.exit(1)

        ws_url = page['webSocketDebuggerUrl']
        parts = ws_url.replace('ws://', '').split('/', 1)
        host, ws_port = parts[0].split(':')
        path = '/' + parts[1]

        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((host, int(ws_port)))

        key = base64.b64encode(os.urandom(16)).decode('utf-8')
        handshake = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{ws_port}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n\r\n"
        )
        s.sendall(handshake.encode('utf-8'))
        resp = s.recv(4096).decode('utf-8')

        def eval_js(cmd_id, expr):
            msg = {"id": cmd_id, "method": "Runtime.evaluate", "params": {"expression": expr, "returnByValue": True}}
            data = json.dumps(msg).encode('utf-8')
            frame = bytearray([0x81])
            length = len(data)
            if length < 126:
                frame.append(0x80 | length)
            elif length <= 0xFFFF:
                frame.extend([0x80 | 126, (length >> 8) & 0xFF, length & 0xFF])
            else:
                frame.extend([0x80 | 127] + list(length.to_bytes(8, 'big')))
            mask = os.urandom(4)
            frame.extend(mask)
            frame.extend(bytes([b ^ mask[i % 4] for i, b in enumerate(data)]))
            s.sendall(frame)

            buf = bytearray()
            start = time.time()
            while time.time() - start < 10:
                chunk = s.recv(4096)
                if not chunk: break
                buf.extend(chunk)
                while len(buf) >= 2:
                    payload_len = buf[1] & 0x7f
                    idx = 2
                    if payload_len == 126:
                        if len(buf) < 4: break
                        payload_len = int.from_bytes(buf[2:4], 'big')
                        idx = 4
                    elif payload_len == 127:
                        if len(buf) < 10: break
                        payload_len = int.from_bytes(buf[2:10], 'big')
                        idx = 10
                    if len(buf) >= idx + payload_len:
                        payload = buf[idx:idx+payload_len]
                        del buf[:idx+payload_len]
                        res = json.loads(payload.decode('utf-8'))
                        if res.get('id') == cmd_id:
                            return res.get('result', {}).get('result', {}).get('value')
            return None

        # Wait for game to initialize
        for _ in range(20):
            res = eval_js(1, "typeof window.game !== 'undefined' && window.game.isInitialized")
            if res: break
            time.sleep(0.5)

        # 1. Initial quest state
        print("\n--- Test 1: Initial Dirtik Quest State ---")
        q_init = eval_js(10, """
        (() => {
            const q = window.game.questManager.quests.find(item => item.id === 'dirtik_hunt');
            return {
                id: q.id,
                name: q.name,
                current: q.current,
                target: q.target,
                completed: q.completed,
                hasJacket: window.game.ui.hasItem(46)
            };
        })()
        """)
        print("Initial state:", q_init)
        assert q_init['current'] == 0, f"Expected 0, got {q_init['current']}"
        assert q_init['target'] == 2, f"Expected target 2, got {q_init['target']}"
        assert q_init['completed'] == False, "Quest should not be completed initially"
        assert q_init['hasJacket'] == False, "Player should not have Warm Jacket yet"
        print("✓ Initial quest status is 0/2 and player has no jacket!")

        # 2. Defeat 1st Dirtik -> 1/2
        print("\n--- Test 2: Defeat 1st Dirtik ---")
        kill1_res = eval_js(20, """
        (() => {
            // Spawn a Dirtik directly in front of the player
            const dirtik1 = window.game.animals.spawnDirtikInFrontOfPlayer(window.game.player, 3.0);
            dirtik1.awaken();
            
            // Player attacks and kills Dirtik
            dirtik1.onAttacked(10, window.game.player.position);
            
            const q = window.game.questManager.quests.find(item => item.id === 'dirtik_hunt');
            return {
                dirtik1Dead: dirtik1.isDead,
                current: q.current,
                completed: q.completed,
                hasJacket: window.game.ui.hasItem(46)
            };
        })()
        """)
        print("After 1st kill:", kill1_res)
        assert kill1_res['dirtik1Dead'] == True, "Dirtik should be dead"
        assert kill1_res['current'] == 1, f"Expected progress 1, got {kill1_res['current']}"
        assert kill1_res['completed'] == False, "Quest should not be completed after 1st kill"
        assert kill1_res['hasJacket'] == False, "Player should not have Warm Jacket after 1st kill"
        print("✓ Progress successfully advanced to 1/2 on defeating Dirtik!")

        # 3. Test Death Reset Rule: Player dies -> Reset to 0/2
        print("\n--- Test 3: Player Dies Before Completing -> Reset to 0/2 ---")
        death_reset_res = eval_js(30, """
        (() => {
            window.game.survival.die();
            const q = window.game.questManager.quests.find(item => item.id === 'dirtik_hunt');
            
            // Respawn player for next test
            window.game.survival.respawn();
            
            return {
                current: q.current,
                completed: q.completed
            };
        })()
        """)
        print("After player death:", death_reset_res)
        assert death_reset_res['current'] == 0, f"Expected counter to reset to 0, got {death_reset_res['current']}"
        print("✓ Player death correctly resets counter back to 0/2 (bez zginięcia rule enforced)!")

        # 4. Defeat 2 Dirtiks without dying -> Complete quest & award Warm Jacket (ID 46)
        print("\n--- Test 4: Defeat 2 Dirtiks Without Dying -> Complete Quest & Award Warm Jacket ---")
        complete_res = eval_js(40, """
        (() => {
            const dirtikA = window.game.animals.spawnDirtikInFrontOfPlayer(window.game.player, 3.0);
            dirtikA.awaken();
            dirtikA.onAttacked(10, window.game.player.position);
            
            const dirtikB = window.game.animals.spawnDirtikInFrontOfPlayer(window.game.player, 3.0);
            dirtikB.awaken();
            dirtikB.onAttacked(10, window.game.player.position);
            
            const q = window.game.questManager.quests.find(item => item.id === 'dirtik_hunt');
            return {
                current: q.current,
                completed: q.completed,
                hasJacket: window.game.ui.hasItem(46),
                hasJacketOnPlayer: window.game.player.ui.hasItem(46)
            };
        })()
        """)
        print("After 2 kills:", complete_res)
        assert complete_res['current'] == 2, f"Expected 2, got {complete_res['current']}"
        assert complete_res['completed'] == True, "Quest should be completed!"
        assert complete_res['hasJacket'] == True, "Player must receive Warm Jacket (46) in inventory!"
        print("✓ Quest completed (2/2) and Warm Jacket 🧥 awarded to inventory!")

        # 5. Check Mountain peak cold immunity with Warm Jacket
        print("\n--- Test 5: Mountain Peak Cold Protection with Warm Jacket ---")
        mountain_res = eval_js(50, """
        (() => {
            // Position player on high mountain peak
            window.game.player.position.set(100, 18, 100);
            window.game.player.update(0.1);
            
            return {
                isFreezing: window.game.player.isFreezing,
                hasJacket: window.game.ui.hasItem(46)
            };
        })()
        """)
        print("Mountain test:", mountain_res)
        assert mountain_res['isFreezing'] != True, "Player in Warm Jacket should not freeze!"
        print("✓ Warm Jacket shields player from freezing on high snowy mountains!")

        print("\n==============================================")
        print("🎉 ALL TESTS FOR DIRTIK QUEST & JACKET PASSED!")
        print("==============================================")

    finally:
        chrome_proc.terminate()
        chrome_proc.wait()

if __name__ == '__main__':
    run_test()

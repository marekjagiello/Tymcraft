import sys
import time
import socket
import json
import base64
import os
import subprocess
import urllib.request

def run_test():
    # 1. Start headless Chrome with remote debugging
    chrome_proc = subprocess.Popen([
        'google-chrome',
        '--headless=new',
        '--remote-debugging-port=9222',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        # 2. Get pages from CDP
        req = urllib.request.urlopen('http://127.0.0.1:9222/json')
        pages = json.loads(req.read().decode('utf-8'))
        page = next((p for p in pages if 'localhost:8000' in p.get('url', '')), None)
        if not page:
            print("ERROR: Minecraft page not found in CDP:", pages)
            sys.exit(1)

        ws_url = page['webSocketDebuggerUrl']
        print(f"Connecting to CDP WebSocket: {ws_url}")

        # Connect via raw socket and perform websocket handshake
        # Parse ws://host:port/path
        parts = ws_url.replace('ws://', '').split('/', 1)
        host, port = parts[0].split(':')
        path = '/' + parts[1]

        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((host, int(port)))

        key = base64.b64encode(os.urandom(16)).decode('utf-8')
        handshake = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n\r\n"
        )
        s.sendall(handshake.encode('utf-8'))

        response = b""
        while b"\r\n\r\n" not in response:
            chunk = s.recv(4096)
            if not chunk: break
            response += chunk

        print("WebSocket connected successfully!")

        def send_cdp(cmd_id, method, params=None):
            payload = json.dumps({"id": cmd_id, "method": method, "params": params or {}}).encode('utf-8')
            length = len(payload)
            frame = bytearray()
            frame.append(0x81) # FIN + text opcode
            mask = os.urandom(4)
            if length < 126:
                frame.append(0x80 | length)
            elif length < 65536:
                frame.append(0x80 | 126)
                frame.extend(length.to_bytes(2, 'big'))
            else:
                frame.append(0x80 | 127)
                frame.extend(length.to_bytes(8, 'big'))
            frame.extend(mask)
            for i in range(length):
                frame.append(payload[i] ^ mask[i % 4])
            s.sendall(frame)

        def recv_cdp_until_id(target_id, timeout=10):
            start = time.time()
            buf = bytearray()
            while time.time() - start < timeout:
                chunk = s.recv(4096)
                if not chunk: break
                buf.extend(chunk)
                while len(buf) >= 2:
                    first = buf[0]
                    second = buf[1]
                    masked = (second & 0x80) != 0
                    payload_len = second & 0x7f
                    idx = 2
                    if payload_len == 126:
                        if len(buf) < 4: break
                        payload_len = int.from_bytes(buf[2:4], 'big')
                        idx = 4
                    elif payload_len == 127:
                        if len(buf) < 10: break
                        payload_len = int.from_bytes(buf[2:10], 'big')
                        idx = 10
                    mask_key = None
                    if masked:
                        if len(buf) < idx + 4: break
                        mask_key = buf[idx:idx+4]
                        idx += 4
                    if len(buf) < idx + payload_len:
                        break
                    raw_data = buf[idx:idx+payload_len]
                    del buf[:idx+payload_len]
                    if masked and mask_key:
                        unmasked = bytearray(payload_len)
                        for i in range(payload_len):
                            unmasked[i] = raw_data[i] ^ mask_key[i % 4]
                        msg = unmasked.decode('utf-8', errors='ignore')
                    else:
                        msg = raw_data.decode('utf-8', errors='ignore')
                    try:
                        res = json.loads(msg)
                        if res.get('id') == target_id:
                            return res
                    except:
                        pass
            return None

        # 3. Test In-Browser JS Execution
        print("\n--- TEST 1: Check Game Loaded ---")
        send_cdp(1, "Runtime.evaluate", {
            "expression": "Boolean(window.game && window.game.ui && window.game.player)",
            "returnByValue": True
        })
        res1 = recv_cdp_until_id(1)
        print("Game loaded:", res1['result']['result']['value'])
        assert res1['result']['result']['value'] == True

        print("\n--- TEST 2: Secret Code '3' grants Ciepła Kurtka (ID 46) ---")
        send_cdp(2, "Runtime.evaluate", {
            "expression": """
            (() => {
                const ui = window.game.ui;
                const hadJacketBefore = ui.hasItem(46);
                ui.chatInputEl.value = '3';
                ui.submitChat();
                const hasJacketAfter = ui.hasItem(46);
                return { hadJacketBefore, hasJacketAfter };
            })()
            """,
            "returnByValue": True
        })
        res2 = recv_cdp_until_id(2)
        print("Code 3 result:", res2['result']['result']['value'])
        assert res2['result']['result']['value']['hasJacketAfter'] == True

        print("\n--- TEST 3: Enter Dark Dimension ---")
        send_cdp(3, "Runtime.evaluate", {
            "expression": """
            (() => {
                window.game.enterDarkDimension();
                return {
                    isInDarkDimension: window.game.isInDarkDimension,
                    playerX: window.game.player.position.x,
                    playerZ: window.game.player.position.z,
                    playerY: window.game.player.position.y
                };
            })()
            """,
            "returnByValue": True
        })
        res3 = recv_cdp_until_id(3)
        print("Dark Dimension entered:", res3['result']['result']['value'])
        assert res3['result']['result']['value']['isInDarkDimension'] == True
        assert res3['result']['result']['value']['playerX'] == 1000

        print("\n--- TEST 4: Boss Robot & Mini-Robots Summoning ---")
        send_cdp(4, "Runtime.evaluate", {
            "expression": """
            (() => {
                const boss = window.game.animals.animals.find(a => a.type === 'boss_robot' && !a.isDead);
                if (!boss) return { error: 'No boss found' };
                boss.summonMiniRobots();
                const minis = window.game.animals.animals.filter(a => a.type === 'mini_robot' && !a.isDead);
                return {
                    bossFound: true,
                    bossMaxHealth: boss.maxHealth,
                    miniRobotsCount: minis.length,
                    miniRobotDamage: minis[0]?.attackDamage,
                    miniRobotMaxHealth: minis[0]?.maxHealth
                };
            })()
            """,
            "returnByValue": True
        })
        res4 = recv_cdp_until_id(4)
        print("Boss & MiniRobots result:", res4['result']['result']['value'])
        val4 = res4['result']['result']['value']
        assert val4['bossFound'] == True
        assert val4['miniRobotsCount'] >= 2
        assert val4['miniRobotDamage'] == 2 # 2 HP as requested!
        assert val4['miniRobotMaxHealth'] == 12

        print("\n--- TEST 5: Boss Attack Flash Effect ---")
        send_cdp(5, "Runtime.evaluate", {
            "expression": """
            (() => {
                window.game.eventBus.emit('boss:attack_flash', { color: 0x38bdf8, intensity: 4.2 });
                return {
                    flashIntensity: window.game.bossFlashIntensity,
                    lightColor: window.game.bossFlashLight.color.getHexString()
                };
            })()
            """,
            "returnByValue": True
        })
        res5 = recv_cdp_until_id(5)
        print("Boss Flash Effect result:", res5['result']['result']['value'])
        assert res5['result']['result']['value']['flashIntensity'] >= 4.0

        print("\n--- TEST 6: Boss Defeat, Victory Portal, Loot & Defeated Flag ---")
        send_cdp(6, "Runtime.evaluate", {
            "expression": """
            (() => {
                const boss = window.game.animals.animals.find(a => a.type === 'boss_robot' && !a.isDead);
                boss.die();
                const isDefeatedStored = localStorage.getItem('m2_boss_robot_defeated');
                const remainingMinis = window.game.animals.animals.filter(a => a.type === 'mini_robot' && !a.isDead);
                return {
                    isDefeatedStored,
                    remainingMinisCount: remainingMinis.length,
                    bossIsDead: boss.isDead
                };
            })()
            """,
            "returnByValue": True
        })
        res6 = recv_cdp_until_id(6)
        print("Boss Defeat result:", res6['result']['result']['value'])
        assert res6['result']['result']['value']['isDefeatedStored'] == 'true'
        assert res6['result']['result']['value']['remainingMinisCount'] == 0

        print("\n--- TEST 7: Exit Dark Dimension back to Overworld ---")
        send_cdp(7, "Runtime.evaluate", {
            "expression": """
            (() => {
                window.game.exitDarkDimension();
                return {
                    isInDarkDimension: window.game.isInDarkDimension,
                    playerX: window.game.player.position.x,
                    playerZ: window.game.player.position.z
                };
            })()
            """,
            "returnByValue": True
        })
        res7 = recv_cdp_until_id(7)
        print("Exit Dimension result:", res7['result']['result']['value'])
        assert res7['result']['result']['value']['isInDarkDimension'] == False
        assert res7['result']['result']['value']['playerX'] < 800

        print("\n🎉 ALL IN-BROWSER TESTS PASSED FLAWLESSLY! 🚀")

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except:
            chrome_proc.kill()

if __name__ == '__main__':
    run_test()

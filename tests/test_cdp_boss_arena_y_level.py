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
    port = 9226
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

        test_code = """
        (() => {
            window.game.enterPigKingdom();
            const king = window.game.animals.animals.find(a => a.type === 'boss_pig_king');
            const minions = window.game.animals.animals.filter(a => a.type === 'red_eyed_pig');
            
            // Advance animation / physics updates
            for (let i = 0; i < 20; i++) {
                king.update(0.05, window.game.player);
                for (const m of minions) m.update(0.05, window.game.player);
            }
            
            const kingY = king.position.y;
            const minionYs = minions.map(m => m.position.y);
            const kingMeshVisible = king.group.visible;

            // Test interaction raycasting on Pig King from player distance 5.0m
            window.game.player.position.set(2000, 12.5, 1995);
            window.game.camera.position.copy(window.game.player.position);
            window.game.camera.lookAt(king.position.x, king.position.y + 2, king.position.z);
            const hitKing = window.game.interaction.raycastAnimal(8.0);
            
            // Now enter Dark Dimension and test Boss Robot
            window.game.enterDarkDimension();
            const robot = window.game.animals.animals.find(a => a.type === 'boss_robot');
            for (let i = 0; i < 20; i++) {
                robot.update(0.05, window.game.player);
            }
            const robotY = robot.position.y;
            const robotMeshVisible = robot.group.visible;

            // Test interaction raycasting on Boss Robot
            window.game.player.position.set(1000, 12.5, 994);
            window.game.camera.position.copy(window.game.player.position);
            window.game.camera.lookAt(robot.position.x, robot.position.y + 3, robot.position.z);
            const hitRobot = window.game.interaction.raycastAnimal(8.0);

            return {
                kingY,
                minionYs,
                kingMeshVisible,
                hitKingType: hitKing ? hitKing.type : null,
                robotY,
                robotMeshVisible,
                hitRobotType: hitRobot ? hitRobot.type : null
            };
        })()
        """
        res = eval_js(100, test_code)
        print("Boss Arena Y Level and Hitbox Test Result:", res)

        assert res['kingY'] == 12, f"Pig King Y was {res['kingY']}, expected 12"
        assert all(y == 12 for y in res['minionYs']), f"Minions Y error: {res['minionYs']}"
        assert res['kingMeshVisible'] == True, "Pig King mesh not visible"
        assert res['hitKingType'] == 'boss_pig_king', f"Hit king failed: {res['hitKingType']}"
        assert res['robotY'] == 12, f"Boss Robot Y was {res['robotY']}, expected 12"
        assert res['robotMeshVisible'] == True, "Boss Robot mesh not visible"
        assert res['hitRobotType'] == 'boss_robot', f"Hit robot failed: {res['hitRobotType']}"

        print("✓ ALL ASSERTIONS PASSED: Bosses stay at y=12 under ceiling, visible and hitboxes work perfectly!")

    finally:
        chrome_proc.terminate()
        chrome_proc.wait()

if __name__ == '__main__':
    run_test()

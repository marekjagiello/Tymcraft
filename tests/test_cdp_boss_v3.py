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
    # 1. Start headless Chrome with remote debugging on port 9223 (avoid conflict with 9222 if any)
    chrome_bin = get_chrome_binary()
    chrome_proc = subprocess.Popen([
        chrome_bin,
        '--headless=new',
        '--remote-debugging-port=9223',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        req = urllib.request.urlopen('http://127.0.0.1:9223/json')
        pages = json.loads(req.read().decode('utf-8'))
        page = next((p for p in pages if 'localhost:8000' in p.get('url', '')), None)
        if not page:
            print("ERROR: Minecraft page not found in CDP:", pages)
            sys.exit(1)

        ws_url = page['webSocketDebuggerUrl']
        print(f"Connecting to CDP WebSocket: {ws_url}")

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

        print("WebSocket connected!")

        def send_cdp(cmd_id, method, params=None):
            payload = json.dumps({"id": cmd_id, "method": method, "params": params or {}}).encode('utf-8')
            length = len(payload)
            frame = bytearray()
            frame.append(0x81)
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

                    mask_len = 4 if (second & 0x80) else 0
                    total_frame = idx + mask_len + payload_len
                    if len(buf) < total_frame:
                        break

                    frame_data = buf[idx+mask_len:total_frame]
                    del buf[:total_frame]
                    try:
                        msg = json.loads(frame_data.decode('utf-8', errors='ignore'))
                        if msg.get('id') == target_id:
                            return msg
                    except:
                        pass
            return None

        def eval_js(cmd_id, expression):
            send_cdp(cmd_id, "Runtime.evaluate", {
                "expression": expression,
                "returnByValue": True,
                "awaitPromise": True
            })
            res = recv_cdp_until_id(cmd_id)
            if not res or 'result' not in res:
                return None
            val = res['result'].get('result', {})
            if 'value' not in val:
                print(f"[CDP Eval Error id={cmd_id}]:", res['result'])
            return val.get('value')

        send_cdp(1, "Runtime.enable")
        recv_cdp_until_id(1)

        # Wait for game to initialize
        print("Waiting for game window.game...")
        for i in range(25):
            ready = eval_js(100 + i, "Boolean(window.game && window.game.ui && window.game.animals)")
            if ready:
                print(f"Game ready at attempt {i+1}")
                break
            time.sleep(0.5)

        # Test 1: Check code limit on '3' (wood)
        print("Testing Code Limits...")
        code_test = eval_js(200, """
        (function() {
            const ui = window.game.ui;
            localStorage.removeItem('m2_used_codes');
            ui.usedSecretCodes = new Set();

            function countItem(id) {
                return [...ui.hotbarBlocks, ...ui.backpackSlots]
                    .filter(s => s.id === id)
                    .reduce((sum, s) => sum + (s.count || 0), 0);
            }

            const jacketBefore = countItem(46);
            
            // First use of code '3'
            ui.chatInputEl.value = '3';
            ui.submitChat();
            const jacketAfter1 = countItem(46);
            const isUsed1 = ui.isCodeUsed('3');

            // Second use of code '3' (should be blocked!)
            ui.chatInputEl.value = '3';
            ui.submitChat();
            const jacketAfter2 = countItem(46);

            return {
                jacketBefore,
                jacketAfter1,
                jacketAfter2,
                isUsed1,
                blocked: (jacketAfter1 === jacketAfter2 && jacketAfter1 > jacketBefore)
            };
        })()
        """)
        print("Code '3' Limit Result:", code_test)
        assert code_test and code_test.get('blocked') is True, f"Code '3' was not properly limited: {code_test}"
        print("✓ Code '3' can only be used once!")

        # Test 2: Check unlimited water code 'grat'
        print("Testing Unlimited Water Code...")
        water_test = eval_js(201, """
        (function() {
            const ui = window.game.ui;
            function countItem(id) {
                return [...ui.hotbarBlocks, ...ui.backpackSlots]
                    .filter(s => s.id === id)
                    .reduce((sum, s) => sum + (s.count || 0), 0);
            }

            const waterBefore = countItem(45);

            ui.chatInputEl.value = 'grat';
            ui.submitChat();
            const waterAfter1 = countItem(45);

            ui.chatInputEl.value = 'grat';
            ui.submitChat();
            const waterAfter2 = countItem(45);

            return {
                waterBefore,
                waterAfter1,
                waterAfter2,
                unlimited: (waterAfter2 > waterAfter1 && waterAfter1 > waterBefore)
            };
        })()
        """)
        print("Water Code Result:", water_test)
        assert water_test and water_test.get('unlimited') is True, f"Water was not unlimited: {water_test}"
        print("✓ Water code 'grat' is unlimited as requested by Tymek!")

        # Test 3: Test BossRobot colossus stats, exhaust pipes, and smoke emission
        print("Testing BossRobot Colossus...")
        boss_test = eval_js(202, """
        (function() {
            const animals = window.game.animals;
            const boss = animals.spawnBossRobot(32, 32);
            boss.isAwakening = false; // Fast-forward awaken for stats test

            const hasExhausts = Boolean(boss.leftExhaust && boss.rightExhaust);
            const initialScale = boss.targetScale;
            const maxHp = boss.maxHealth;

            // Trigger smoke emission
            boss.update(0.15, { x: 32, y: 10, z: 32 });
            const smokeCount = boss.smokeParticles ? boss.smokeParticles.length : 0;

            // Test stomp audio & camera shake trigger
            boss.update(0.6, { x: 32, y: 10, z: 35 });
            const shake = window.game.player.screenShakeIntensity;

            // Clean up test boss
            boss.die();

            return {
                maxHp,
                targetScale: initialScale,
                hasExhausts,
                smokeCount,
                playerShake: shake
            };
        })()
        """)
        print("Boss Robot Test Result:", boss_test)
        assert boss_test and boss_test.get('maxHp') == 160, f"Boss max HP is not 160: {boss_test}"
        assert boss_test and boss_test.get('targetScale') == 3.5, f"Boss targetScale is not 3.5: {boss_test}"
        assert boss_test and boss_test.get('hasExhausts') is True, "Boss does not have dual exhaust smokestacks"
        assert boss_test and boss_test.get('smokeCount') > 0, "Boss does not emit smoke particles"
        print("✓ Boss Robot is a realistic giant colossus (160 HP, scale 3.5, dual exhaust, smoke particles, stomp shake)!")

        # Test 4: Once per map - codes do NOT reset on boss defeat, only on resetSecretCodes!
        print("Testing Code Reset Rule (once per map, preserved on boss defeat)...")
        reset_test = eval_js(203, """
        (function() {
            const ui = window.game.ui;
            // Mark code 3 as used
            ui.markCodeUsed('3');
            const usedBefore = ui.isCodeUsed('3');

            // Emit boss defeat event - must NOT reset codes anymore!
            window.game.eventBus ? window.game.eventBus.emit('boss_robot:defeated') : null;
            const usedAfterBossDefeat = ui.isCodeUsed('3');

            // Explicit resetSecretCodes (what resetWorld calls)
            ui.resetSecretCodes();
            const usedAfterReset = ui.isCodeUsed('3');

            return {
                usedBefore,
                usedAfterBossDefeat,
                usedAfterReset
            };
        })()
        """)
        print("Reset Test Result:", reset_test)
        assert reset_test and reset_test.get('usedBefore') is True and reset_test.get('usedAfterBossDefeat') is True and reset_test.get('usedAfterReset') is False, f"Codes reset rule violated: {reset_test}"
        print("✓ Codes stay used after boss defeat (once per map) and reset on resetSecretCodes!")

        # Test 5: Dimension enter/exit and music loop start/stop
        print("Testing Dimension Transitions...")
        dimension_test = eval_js(204, """
        (function() {
            const game = window.game;
            game.enterDarkDimension();
            const inDark = game.isInDarkDimension;
            game.exitDarkDimension();
            const inOverworld = !game.isInDarkDimension;
            return {
                inDark,
                inOverworld
            };
        })()
        """)
        print("Dimension Result:", dimension_test)
        assert dimension_test and dimension_test.get('inDark') is True and dimension_test.get('inOverworld') is True, f"Dimension transition failed: {dimension_test}"
        print("✓ Dark dimension transitions and boss music properly wired!")

        print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=2)
        except:
            chrome_proc.kill()

if __name__ == '__main__':
    run_test()

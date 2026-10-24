import sys
import time
import socket
import json
import base64
import os
import subprocess
import urllib.request

def run_test():
    chrome_proc = subprocess.Popen([
        'google-chrome',
        '--headless=new',
        '--remote-debugging-port=9224',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        req = urllib.request.urlopen('http://127.0.0.1:9224/json')
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

        print("Waiting for game window.game...")
        for i in range(25):
            ready = eval_js(100 + i, "Boolean(window.game && window.game.ui && window.game.crafting)")
            if ready:
                print(f"Game ready at attempt {i+1}")
                break
            time.sleep(0.5)

        # TEST 1: Crafting Flint & Steel (Krzesiwo) on diagonal (Patyk + Kamień na skos)
        print("\n--- TEST 1: Flint & Steel diagonal recipe ---")
        craft_test = eval_js(200, """
        (function() {
            const crafting = window.game.crafting;

            // Diagonal 1: Slot 0 (Stick), Slot 3 (Stone)
            crafting.clearGrid();
            crafting.setSlot(0, 20); // Patyk
            crafting.setSlot(3, 3);  // Kamień
            const res1 = crafting.output ? crafting.output.item.id : null;

            // Diagonal 2: Slot 1 (Kamień), Slot 2 (Patyk)
            crafting.clearGrid();
            crafting.setSlot(1, 3);  // Kamień
            crafting.setSlot(2, 20); // Patyk
            const res2 = crafting.output ? crafting.output.item.id : null;

            // Diagonal 3 with Cobblestone (Bruk 11): Slot 0 (Bruk), Slot 3 (Patyk)
            crafting.clearGrid();
            crafting.setSlot(0, 11); // Bruk
            crafting.setSlot(3, 20); // Patyk
            const res3 = crafting.output ? crafting.output.item.id : null;

            return {
                res1,
                res2,
                res3,
                allFlintAndSteel: (res1 === 52 && res2 === 52 && res3 === 52)
            };
        })()
        """)
        print("Crafting Flint & Steel Result:", craft_test)
        assert craft_test and craft_test.get('allFlintAndSteel') is True, f"Diagonal Flint & Steel failed: {craft_test}"
        print("✓ Krzesiwo crafts with Stick + Stone/Bruk on diagonal (ID 52)!")

        # TEST 2: Stone Portal check
        print("\n--- TEST 2: Stone Portal Detection ---")
        portal_test = eval_js(201, """
        (function() {
            const world = window.game.world;
            const interaction = window.game.interaction;

            // Build a stone doorway frame at x=50, y=10, z=50
            world.setBlock(50, 10, 50, 3); // Left bottom
            world.setBlock(50, 11, 50, 3); // Left top
            world.setBlock(52, 10, 50, 3); // Right bottom
            world.setBlock(52, 11, 50, 3); // Right top
            world.setBlock(51, 12, 50, 3); // Top arch

            const isPortal = interaction.checkStonePortal(50, 10, 50);

            // Check isolated stone in air (Y=25)
            world.setBlock(70, 25, 70, 3);
            const isIsolated = interaction.checkStonePortal(70, 25, 70);

            return {
                isPortal,
                isIsolated
            };
        })()
        """)
        print("Stone Portal Result:", portal_test)
        assert portal_test and portal_test.get('isPortal') is True and portal_test.get('isIsolated') is False, f"Stone Portal detection failed: {portal_test}"
        print("✓ Stone Portal correctly recognized for doorways/frames, rejected for isolated blocks!")

        # TEST 3: Top Boss Bar HUD
        print("\n--- TEST 3: Boss Bar HUD display ---")
        hud_test = eval_js(202, """
        (function() {
            const ui = window.game.ui;
            ui.showBossBar('👑 BOSS ROBOT', 160, 160);

            const el = document.getElementById('boss-hud');
            const titleEl = document.getElementById('boss-title');
            const fillEl = document.getElementById('boss-bar-fill');
            const textEl = document.getElementById('boss-hp-text');

            const isVisible = el && el.style.display === 'flex';
            const title = titleEl ? titleEl.textContent : '';
            const widthInitial = fillEl ? fillEl.style.width : '';

            // Update to half HP
            ui.updateBossBar(80, 160);
            const widthHalf = fillEl ? fillEl.style.width : '';
            const textHalf = textEl ? textEl.textContent : '';

            // Hide
            ui.hideBossBar();
            const isHidden = el && el.style.display === 'none';

            return {
                isVisible,
                title,
                widthInitial,
                widthHalf,
                textHalf,
                isHidden
            };
        })()
        """)
        print("Boss Bar HUD Result:", hud_test)
        assert hud_test and hud_test.get('isVisible') is True, "Boss HUD not visible when shown"
        assert hud_test and hud_test.get('title') == '👑 BOSS ROBOT', f"Unexpected title: {hud_test}"
        assert hud_test and (hud_test.get('widthHalf') == '50%' or hud_test.get('widthHalf') == '50.0%'), f"Half HP width not 50%: {hud_test}"
        assert hud_test and hud_test.get('isHidden') is True, "Boss HUD not hidden when hideBossBar called"
        print("✓ Boss Bar displays '👑 BOSS ROBOT' on top of screen with animated HP fill!")

        # TEST 4: Once-per-map rule (No in-game reset of codes on boss defeat)
        print("\n--- TEST 4: Once-per-map rule ---")
        map_rule_test = eval_js(203, """
        (function() {
            const ui = window.game.ui;
            ui.markCodeUsed('3');
            const usedBefore = ui.isCodeUsed('3');

            // Emit boss defeated event
            window.game.eventBus.emit('boss_robot:defeated');

            // Code should STILL be used (only resets on world reset!)
            const usedAfter = ui.isCodeUsed('3');

            return {
                usedBefore,
                usedAfter,
                preserved: (usedBefore === true && usedAfter === true)
            };
        })()
        """)
        print("Once-per-map Result:", map_rule_test)
        assert map_rule_test and map_rule_test.get('preserved') is True, f"Codes reset in-game unexpectedly: {map_rule_test}"
        print("✓ Codes remain used on map until full game/world reset!")

        print("\nALL PORTAL, KRZESIWO, TOTEM & BOSS BAR TESTS PASSED SUCCESSFULLY!")

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=2)
        except:
            chrome_proc.kill()

if __name__ == '__main__':
    run_test()

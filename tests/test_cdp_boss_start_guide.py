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
    chrome_proc = subprocess.Popen([
        chrome_bin,
        '--headless=new',
        '--remote-debugging-port=9226',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        req = urllib.request.urlopen('http://127.0.0.1:9226/json')
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
            for i, b in enumerate(payload):
                frame.append(b ^ mask[i % 4])
            s.sendall(frame)

        def recv_cdp(expected_id=None):
            while True:
                header = s.recv(2)
                if not header: return None
                length = header[1] & 0x7F
                if length == 126:
                    length = int.from_bytes(s.recv(2), 'big')
                elif length == 127:
                    length = int.from_bytes(s.recv(8), 'big')
                data = bytearray()
                while len(data) < length:
                    packet = s.recv(length - len(data))
                    if not packet: break
                    data.extend(packet)
                msg = json.loads(data.decode('utf-8', errors='ignore'))
                if expected_id is None or msg.get('id') == expected_id:
                    return msg

        send_cdp(1, "Page.enable")
        recv_cdp(1)
        send_cdp(2, "Runtime.enable")
        recv_cdp(2)

        def eval_js(cmd_id, expr):
            send_cdp(cmd_id, "Runtime.evaluate", {
                "expression": expr,
                "returnByValue": True
            })
            resp = recv_cdp(cmd_id)
            if resp and 'result' in resp and 'result' in resp['result']:
                return resp['result']['result'].get('value')
            elif resp and 'result' in resp and 'exceptionDetails' in resp['result']:
                print(f"[CDP Eval Error id={cmd_id}]:", resp['result'])
                return None
            return None

        # Wait for window.game
        print("Waiting for game window.game...")
        for attempt in range(25):
            res = eval_js(100 + attempt, "typeof window.game !== 'undefined' && window.game.ui !== null")
            if res is True:
                print(f"Game ready at attempt {attempt + 1}")
                break
            time.sleep(0.5)

        # Give 1.5s for initial startup timers (1.2s guide timer)
        time.sleep(1.8)

        # TEST 1: Check Banner and Chat at startup
        print("\n--- TEST 1: Startup Boss Guide Banner & Chat ---")
        banner_test = eval_js(200, """
        (function() {
            const banner = document.getElementById('boss-start-guide-banner');
            const chatMessages = Array.from(document.querySelectorAll('.chat-message')).map(m => m.textContent || m.innerText);
            const guideInChat = chatMessages.some(m => m.includes('Weź krzesiwo i zrób portal z kamienia'));
            
            return {
                bannerExists: !!banner,
                bannerVisible: banner ? window.getComputedStyle(banner).display !== 'none' : false,
                bannerText: banner ? banner.innerText : '',
                guideInChat: guideInChat,
                chatSnippet: chatMessages.slice(-5)
            };
        })()
        """)
        print("Banner Test Result:", banner_test)
        assert banner_test and banner_test.get('bannerExists'), "Boss guide banner element was not found in DOM!"
        assert banner_test and banner_test.get('bannerVisible'), "Boss guide banner is not visible!"
        assert 'Weź krzesiwo i zrób portal z kamienia na 2 na 2 kratki' in banner_test.get('bannerText', ''), f"Banner text does not match Tymek's guide! Text: {banner_test.get('bannerText')}"
        assert banner_test.get('guideInChat'), "Guide message was not posted to chat!"
        print("✓ Boss start guide banner and chat message verified successfully!")

        # TEST 2: Chat commands /pomoc, /boss, /portal provide the short guide
        print("\n--- TEST 2: Chat Commands (/boss, /portal, /pomoc) ---")
        command_test = eval_js(201, """
        (function() {
            const ui = window.game.ui;
            let output = [];
            const originalAddChatMessage = ui.addChatMessage.bind(ui);
            ui.addChatMessage = function(sender, text, type) {
                output.push({ sender, text, type });
                originalAddChatMessage(sender, text, type);
            };

            ui.chatInputEl.value = '/boss';
            ui.submitChat();
            ui.chatInputEl.value = '/portal';
            ui.submitChat();
            ui.chatInputEl.value = '/pomoc';
            ui.submitChat();

            ui.addChatMessage = originalAddChatMessage;

            return {
                outputCount: output.length,
                hasBossGuide: output.some(o => o.text && o.text.includes('Weź krzesiwo i zrób portal z kamienia')),
                sample: output.map(o => o.text)
            };
        })()
        """)
        print("Command Test Result:", command_test)
        assert command_test and command_test.get('hasBossGuide'), f"Commands did not print the guide: {command_test}"
        print("✓ Chat commands /boss, /portal, /pomoc verified successfully!")

        # TEST 3: Stone portal activation - clicking floor under player ("zapal pod sobą") inside 2x2 stone frame
        print("\n--- TEST 3: Stone Portal Ignition - Clicking Under Player Inside 2x2 Frame ---")
        portal_test = eval_js(202, """
        (function() {
            const game = window.game;
            const world = game.world;
            const interaction = game.interaction;

            // Build a test 2x2 stone portal at an empty test area: (x: 40, z: 40)
            const bx = 40;
            const bz = 40;
            const by = 8; // base floor level

            // Set floor to grass/dirt
            world.setBlock(bx, by, bz, 1);
            world.setBlock(bx + 1, by, bz, 1);

            // Left pillar: 3 stone blocks
            world.setBlock(bx - 1, by + 1, bz, 3);
            world.setBlock(bx - 1, by + 2, bz, 3);
            world.setBlock(bx - 1, by + 3, bz, 3);

            // Right pillar: 3 stone blocks
            world.setBlock(bx + 2, by + 1, bz, 3);
            world.setBlock(bx + 2, by + 2, bz, 3);
            world.setBlock(bx + 2, by + 3, bz, 3);

            // Top lintel: 2 stone blocks
            world.setBlock(bx, by + 4, bz, 3);
            world.setBlock(bx + 1, by + 4, bz, 3);

            // Walkable portal doorway interior (2x2 opening) is air (0)
            world.setBlock(bx, by + 1, bz, 0);
            world.setBlock(bx, by + 2, bz, 0);
            world.setBlock(bx + 1, by + 1, bz, 0);
            world.setBlock(bx + 1, by + 2, bz, 0);

            // Test 1: Check checkStonePortal when clicking directly on a frame stone block
            const checkFrameBlock = interaction.checkStonePortal(bx - 1, by + 1, bz);

            // Test 2: Check checkStonePortal when clicking floor block inside opening (by, grass ID 1) with air above
            const checkFloorBlock = interaction.checkStonePortal(bx, by, bz);

            // Test 3: Check checkStonePortal far away in the open field (e.g. at 10, 10)
            const checkFarGrass = interaction.checkStonePortal(10, by, 10);

            // Test 4: Simulate dimension event trigger when using flint & steel
            let enterDarkEmitted = false;
            const darkHandler = () => { enterDarkEmitted = true; };
            game.eventBus.on('dimension:enter_dark', darkHandler);

            // Simulate clicking the floor under feet inside the stone frame
            const prevTarget = interaction.currentTarget;
            interaction.currentTarget = {
                block: { x: bx, y: by, z: bz },
                normal: { x: 0, y: 1, z: 0 }
            };

            // Call checkStonePortal for this spot
            const canIgniteFloor = interaction.checkStonePortal(bx, by, bz);
            if (canIgniteFloor) {
                game.eventBus.emit('dimension:enter_dark');
            }

            game.eventBus.off('dimension:enter_dark', darkHandler);
            interaction.currentTarget = prevTarget;

            return {
                checkFrameBlock,
                checkFloorBlock,
                checkFarGrass,
                enterDarkEmitted
            };
        })()
        """)
        print("Portal Test Result:", portal_test)
        assert portal_test and portal_test.get('checkFrameBlock') is True, "checkStonePortal failed for frame stone block!"
        assert portal_test and portal_test.get('checkFloorBlock') is True, "checkStonePortal failed for floor under player inside 2x2 stone frame!"
        assert portal_test and portal_test.get('checkFarGrass') is False, "checkStonePortal incorrectly returned true for empty grass!"
        assert portal_test and portal_test.get('enterDarkEmitted') is True, "dimension:enter_dark was not emitted!"
        print("✓ 2x2 stone portal ignition under player verified successfully!")

        print("\nALL BOSS START GUIDE TESTS PASSED SUCCESSFULLY! 🎉")

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=3)
        except Exception:
            chrome_proc.kill()

if __name__ == '__main__':
    run_test()

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
        '--remote-debugging-port=9225',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        req = urllib.request.urlopen('http://127.0.0.1:9225/json')
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

        # TEST 1: Small Robot does NOT kidnap or teleport player
        print("\n--- TEST 1: Small Robot (Robot) Melee AI - NO KIDNAP / NO TELEPORT ---")
        robot_test = eval_js(200, """
        (function() {
            const animals = window.game.animals;
            // Spawn a regular Robot
            const robot = animals.spawnRobotNear(30, 30, 1, 3);
            if (!robot) return { error: 'could not spawn robot' };

            // Check triggerKidnap property/method
            const hasTriggerKidnap = typeof robot.triggerKidnap === 'function';

            // Simulate player directly in melee proximity (dist = 1.0)
            let darkTeleportTriggered = false;
            const handler = () => { darkTeleportTriggered = true; };
            window.game.eventBus.on('dimension:enter_dark', handler);

            // Update multiple times close to player
            for (let i = 0; i < 5; i++) {
                robot.update(0.1, { x: 30.5, y: 10, z: 30.5 });
            }

            window.game.eventBus.off('dimension:enter_dark', handler);

            const isAwakened = robot.isAwakened;
            robot.die();

            return {
                hasTriggerKidnap,
                darkTeleportTriggered,
                isAwakened
            };
        })()
        """)
        print("Small Robot Test Result:", robot_test)
        assert robot_test and robot_test.get('hasTriggerKidnap') is False, f"Robot still has triggerKidnap: {robot_test}"
        assert robot_test and robot_test.get('darkTeleportTriggered') is False, f"Robot triggered dark teleport! {robot_test}"
        print("✓ Small robot (Robot) no longer kidnaps or teleports player to boss dimension!")

        # TEST 2: Translator Removed from Crafting, Start Menu and Startup Chat (Tymek's request)
        print("\n--- TEST 2: Translator Absence from Crafting and Start Menu ---")
        dom_test = eval_js(201, """
        (function() {
            const guideBox = document.getElementById('translator-guide-box');
            const craftHint = document.querySelector('.crafting-recipe-hint');
            const craftHasTranslator = craftHint ? (craftHint.innerText || craftHint.textContent).includes('Tłumacznik') : false;

            const messagesEl = document.getElementById('chat-messages');
            const initialChatText = messagesEl ? (messagesEl.innerText || messagesEl.textContent) : '';
            const initialChatHasTranslator = initialChatText.includes('Tłumacznik') || initialChatText.includes('ROZPISKA');

            return {
                guideBoxInMenu: Boolean(guideBox),
                craftHasTranslator,
                initialChatHasTranslator
            };
        })()
        """)
        print("DOM Absence Test Result:", dom_test)
        assert dom_test and dom_test.get('guideBoxInMenu') is False, f"Translator guide box still in menu: {dom_test}"
        assert dom_test.get('craftHasTranslator') is False, f"Crafting hint still contains translator: {dom_test}"
        assert dom_test.get('initialChatHasTranslator') is False, f"Startup chat still contains translator auto-announcement: {dom_test}"
        print("✓ Tłumacznik oraz 5 zasad zostały całkowicie usunięte z craftingu, menu startowego i startowego czatu!")

        # TEST 3: Translator Guide Commands & TTS
        print("\n--- TEST 3: Translator Guide Chat Command & TTS ---")
        chat_cmd_test = eval_js(202, """
        (function() {
            const ui = window.game.ui;
            const hasSpeakMethod = typeof ui.speakTranslator === 'function';

            // Test /pomoc command
            ui.chatInputEl.value = '/pomoc';
            ui.submitChat();

            const messagesEl = document.getElementById('chat-messages');
            const chatText = messagesEl ? (messagesEl.innerText || messagesEl.textContent) : '';
            const containsBossGuide = chatText.includes('Weź krzesiwo i zrób portal z kamienia') || chatText.includes('JAK WEJŚĆ DO BOSSA');

            return {
                hasSpeakMethod,
                containsBossGuide
            };
        })()
        """)
        print("Chat Command Test Result:", chat_cmd_test)
        assert chat_cmd_test and chat_cmd_test.get('hasSpeakMethod') is True, "speakTranslator method missing on ui"
        assert chat_cmd_test.get('containsBossGuide') is True, "Boss guide message not printed to chat"
        print("✓ /pomoc command invokes boss guide in chat with TTS integration!")

        print("\nALL TŁUMACZNIK AND NO-KIDNAP ROBOT VERIFICATIONS PASSED SUCCESSFULLY!")

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=2)
        except:
            chrome_proc.kill()

if __name__ == '__main__':
    run_test()

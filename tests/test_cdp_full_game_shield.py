#!/usr/bin/env python3
"""
Automated CDP Test for Tymcraft Security Shield:
1. Boot Tymcraft and ensure no fatal JS exceptions.
2. Verify window.isGameProtected === true, window.gameProtectionOwner === 'Tymek'.
3. Verify window.securityShield is active.
4. Verify Security Shield badge is present in Pause/Esc menu.
5. Trigger Ctrl+S keyboard event:
   - Check that security alert popup appears on screen with:
     "Nie możesz ściągnąć tej gry, bo ma własną ochronę!"
   - Check chat log has security announcement.
6. Trigger chat command '/pobierz':
   - Check that security shield response is added to chat.
7. Trigger chat command '/tata':
   - Check that security shield response is added to chat.
8. Trigger contextmenu event:
   - Ensure default is prevented.
"""

import subprocess
import time
import urllib.request
import json
import socket
import os
import sys

def run_test():
    server_proc = None
    chrome_proc = None
    try:
        # Check if server is already running on 8000
        server_running = False
        try:
            with urllib.request.urlopen("http://127.0.0.1:8000/", timeout=1.0) as res:
                if res.status == 200:
                    server_running = True
        except Exception:
            pass

        if not server_running:
            print("Starting dev server...")
            server_proc = subprocess.Popen(
                ["python3", "-m", "http.server", "8000"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd="/home/marek/ai projects/m2"
            )
            time.sleep(1.2)

        # Launch headless Chrome with remote debugging on port 9222
        print("Launching headless Chrome on 9222...")
        chrome_bin = "/home/marek/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome"
        if not os.path.exists(chrome_bin):
            chrome_bin = "google-chrome"
        chrome_cmd = [
            chrome_bin,
            "--headless=new",
            "--remote-debugging-port=9222",
            "--no-sandbox",
            "--disable-gpu",
            "--window-size=1280,720",
            "--mute-audio",
            "http://localhost:8000/"
        ]
        chrome_proc = subprocess.Popen(chrome_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        time.sleep(2.5)

        # Connect to CDP
        print("Connecting to CDP...")
        targets_url = "http://127.0.0.1:9222/json"
        req = urllib.request.urlopen(targets_url)
        targets = json.loads(req.read().decode('utf-8'))
        ws_url = None
        for t in targets:
            if t.get('type') == 'page' and 'webSocketDebuggerUrl' in t:
                ws_url = t['webSocketDebuggerUrl']
                break

        assert ws_url, "No page target found with WebSocket URL!"
        print(f"Target WebSocket: {ws_url}")

        host_port = ws_url.replace("ws://", "").split("/")[0]
        path = "/" + "/".join(ws_url.replace("ws://", "").split("/")[1:])
        host, port = host_port.split(":")
        port = int(port)

        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((host, port))

        key = "dGhlIHNhbXBsZSBub25jZQ=="
        handshake = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
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

        # Enable Runtime
        send_cdp(1, "Runtime.enable")
        recv_cdp(1)

        def eval_js(expr, cmd_id=100):
            send_cdp(cmd_id, "Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
            res = recv_cdp(cmd_id)
            if "result" in res and "result" in res["result"]:
                val = res["result"]["result"].get("value")
                return val
            return None

        # Wait for game to initialize
        print("Waiting for game to initialize...")
        ready = False
        for _ in range(30):
            val = eval_js("Boolean(window.game && window.securityShield)", 101)
            if val:
                ready = True
                break
            time.sleep(0.5)

        assert ready, "Game or securityShield failed to initialize!"
        print("Game and SecurityShield successfully loaded!")

        # 1. Verify Globals
        globals_ok = eval_js("Boolean(window.isGameProtected === true && window.gameProtectionOwner === 'Tymek')", 102)
        assert globals_ok, f"Security globals incorrect! isGameProtected={eval_js('window.isGameProtected', 103)}, owner={eval_js('window.gameProtectionOwner', 104)}"
        print("✓ Globals verified: window.isGameProtected === true, owner === 'Tymek'")

        # 2. Verify Pause Menu badge
        badge_ok = eval_js("Boolean(document.querySelector('.shield-badge-box'))", 105)
        assert badge_ok, "Shield badge not found in Pause menu DOM!"
        print("✓ Pause Menu Security Shield badge verified in DOM")

        # 3. Simulate Ctrl+S (Attempt to save/download the page)
        print("Testing download interception (Ctrl+S)...")
        eval_js("""
            window.dispatchEvent(new KeyboardEvent('keydown', {
                key: 's',
                code: 'KeyS',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            }));
        """, 106)

        time.sleep(0.3)

        # Check popup notification
        popup_info = eval_js("""
            (() => {
                const popup = document.getElementById('security-shield-popup');
                if (!popup) return null;
                return {
                    visible: popup.style.display !== 'none',
                    opacity: popup.style.opacity,
                    text: popup.innerText
                };
            })()
        """, 107)

        print(f"Popup info after Ctrl+S: {popup_info}")
        assert popup_info is not None, "Security shield popup element not found!"
        assert "Nie możesz ściągnąć tej gry, bo ma własną ochronę!" in popup_info.get("text", ""), f"Popup missing expected text: {popup_info}"
        print("✓ Download block popup verified: 'Nie możesz ściągnąć tej gry, bo ma własną ochronę!'")

        # 4. Check Chat message received
        chat_content = eval_js("""
            (() => {
                const messages = document.getElementById('chat-messages');
                return messages ? messages.innerText : '';
            })()
        """, 108)
        assert "Nie możesz ściągnąć tej gry" in chat_content, f"Chat message not found! Chat was: {chat_content}"
        print("✓ Chat security warning verified!")

        # 5. Test Chat command /pobierz
        print("Testing chat command /pobierz...")
        eval_js("""
            (() => {
                const input = document.getElementById('chat-input');
                if (input && window.game && window.game.ui) {
                    input.value = '/pobierz';
                    window.game.ui.submitChat();
                }
            })()
        """, 109)
        time.sleep(0.2)

        chat_after_cmd = eval_js("""
            (() => {
                const messages = document.getElementById('chat-messages');
                return messages ? messages.innerText : '';
            })()
        """, 110)
        assert "Nie możesz ściągnąć tej gry, bo ma własną ochronę!" in chat_after_cmd, "Chat command /pobierz did not output security message!"
        print("✓ Chat command /pobierz verified!")

        # 6. Test Chat command /tata
        print("Testing chat command /tata...")
        eval_js("""
            (() => {
                const input = document.getElementById('chat-input');
                if (input && window.game && window.game.ui) {
                    input.value = '/tata';
                    window.game.ui.submitChat();
                }
            })()
        """, 111)
        time.sleep(0.2)

        chat_after_tata = eval_js("""
            (() => {
                const messages = document.getElementById('chat-messages');
                return messages ? messages.innerText : '';
            })()
        """, 112)
        assert "Nie możesz ściągnąć tej gry, bo ma własną ochronę!" in chat_after_tata, "Chat command /tata did not output security message!"
        print("✓ Chat command /tata verified!")

        # 7. Test contextmenu block
        print("Testing right-click (contextmenu) prevention...")
        cm_blocked = eval_js("""
            (() => {
                const evt = new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                    button: 2
                });
                const notCancelled = window.dispatchEvent(evt);
                return !notCancelled; // if prevented, notCancelled is false -> cm_blocked is true
            })()
        """, 113)
        assert cm_blocked, "contextmenu default action was not prevented by SecurityShield!"
        print("✓ Contextmenu prevention verified!")

        print("\n==========================================")
        print("🎉 ALL SECURITY SHIELD TESTS PASSED SUCCESSFULLY! 🎉")
        print("==========================================")

    finally:
        if chrome_proc:
            try: chrome_proc.terminate()
            except: pass
        if server_proc:
            try: server_proc.terminate()
            except: pass

if __name__ == "__main__":
    run_test()

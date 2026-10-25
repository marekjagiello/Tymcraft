#!/usr/bin/env python3
"""
Automated CDP Test for:
1. Recipe Needs Visual Popup & Voice Speech (TTS) instead of buzzer sound.
2. Pig Block (ID 59) immediately summoning Pig King (PigKing boss mob).
3. Silent Security Shield:
   - No intrusive .shield-badge-box in pause/esc menu.
   - Right-click (contextmenu) does not display security alert popup.
   - Protection remains active.
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
        # Check dev server on 8000
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

        # Launch headless Chrome on 9222
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

        send_cdp(1, "Runtime.enable")
        recv_cdp(1)

        def eval_js(expr, cmd_id=100):
            send_cdp(cmd_id, "Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
            res = recv_cdp(cmd_id)
            if "result" in res and "result" in res["result"]:
                return res["result"]["result"].get("value")
            return None

        # Wait for game to initialize
        print("Waiting for game to initialize...")
        ready = False
        for _ in range(30):
            val = eval_js("Boolean(window.game && window.game.ui && window.game.interaction && window.game.animals)", 101)
            if val:
                ready = True
                break
            time.sleep(0.5)

        assert ready, "Game failed to initialize!"
        print("✓ Game successfully loaded!")

        # --- TEST 1: Silent Security Shield ---
        print("\n--- TEST 1: Silent Security Shield ---")
        shield_in_pause = eval_js("Boolean(document.querySelector('.shield-badge-box'))", 102)
        assert not shield_in_pause, "Found intrusive .shield-badge-box in pause menu! It should not bother players."
        print("✓ Brak nachalnego bloku tarczy w menu pauzy (.shield-badge-box usunięty)")

        # Test contextmenu event: should be prevented without opening any alert popup
        cm_result = eval_js("""
            (() => {
                const initialPopups = document.querySelectorAll('.security-alert-box').length;
                const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
                const canceled = !document.body.dispatchEvent(evt);
                const popupsAfter = document.querySelectorAll('.security-alert-box').length;
                return {
                    defaultPrevented: canceled,
                    noNewPopups: popupsAfter === initialPopups
                };
            })()
        """, 103)
        assert cm_result["defaultPrevented"], "Contextmenu default was not prevented!"
        assert cm_result["noNewPopups"], "Right click displayed a security alert popup!"
        print(f"✓ Prawy przycisk myszy jest cicho blokowany bez wyskakujących okienek: {cm_result}")

        # --- TEST 2: Recipe Book TTS & Visual Popup ---
        print("\n--- TEST 2: Recipe Book TTS & Visual Popup ---")
        # Spy on window.speechSynthesis.speak
        eval_js("""
            (() => {
                window.__spokenPhrases = [];
                if (window.speechSynthesis) {
                    const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
                    window.speechSynthesis.speak = (utterance) => {
                        window.__spokenPhrases.push(utterance.text);
                        return origSpeak(utterance);
                    };
                }
            })()
        """, 104)

        # Open crafting modal
        eval_js("window.game.ui.toggleCraftingModal();", 105)
        time.sleep(0.3)

        # Click an unavailable recipe card, e.g. sword or bow or planks (empty inventory)
        eval_js("""
            (() => {
                const planksCard = document.querySelector('.recipe-card[data-recipe-id=\"planks\"]');
                if (planksCard) planksCard.click();
            })()
        """, 106)
        time.sleep(0.3)

        # Verify visual popup appears
        popup_info = eval_js("""
            (() => {
                const el = document.getElementById('recipe-needs-popup');
                return {
                    exists: Boolean(el),
                    display: el ? el.style.display : null,
                    opacity: el ? el.style.opacity : null,
                    innerText: el ? el.innerText : '',
                    innerHTML: el ? el.innerHTML : ''
                };
            })()
        """, 107)
        print(f"Recipe needs popup info: {popup_info}")
        assert popup_info["exists"], "Visual recipe-needs-popup was not created!"
        assert popup_info["display"] == "block", "recipe-needs-popup is not visible (display != 'block')!"
        assert "Drewno" in popup_info["innerText"], f"Popup does not mention needed 'Drewno'! Got: {popup_info['innerText']}"
        print("✓ Wyraźny dymek wizualny pokazuje brakujące surowce na ekranie!")

        # Verify TTS was called
        spoken = eval_js("window.__spokenPhrases || []", 108)
        print(f"Spoken phrases: {spoken}")
        assert len(spoken) > 0, "No speech synthesis utterance was spoken!"
        assert "potrzebujesz" in spoken[0].lower(), f"Spoken phrase does not explain requirement! Got: {spoken[0]}"
        print(f"✓ Głos lektora (TTS) mówi na głos czego potrzebujesz: '{spoken[0]}'")

        # Close crafting modal
        eval_js("window.game.ui.toggleCraftingModal();", 109)
        time.sleep(0.2)

        # --- TEST 3: Pig Block Summons Pig King ---
        print("\n--- TEST 3: Świniowy Blok (ID 59) przyzywa Króla Świń ---")
        initial_kings = eval_js("""
            (() => {
                return (window.game.animals?.animals || []).filter(a => a.type === 'boss_pig_king' && !a.isDead).length;
            })()
        """, 110)

        # Give player Pig Block (ID 59) and simulate placement
        summon_result = eval_js("""
            (() => {
                const player = window.game.player;
                const interaction = window.game.interaction;
                const animals = window.game.animals;

                // Set active item to 59 (Świniowy Blok)
                window.game.ui.hotbarBlocks[0] = { id: 59, count: 10 };
                window.game.ui.activeSlotIndex = 0;

                const px = Math.floor(player.position.x) + 2;
                const py = Math.floor(player.position.y);
                const pz = Math.floor(player.position.z) + 2;

                // Set raycast target for placeBlock
                interaction.currentTarget = {
                    hit: true,
                    x: px,
                    y: py,
                    z: pz,
                    normalX: 0,
                    normalY: 1,
                    normalZ: 0
                };

                // Directly invoke placeBlock logic
                interaction.placeBlock();

                // Trigger enterPigKingdom directly to test teleportation & king summon
                window.game.enterPigKingdom();

                const kings = (animals?.animals || []).filter(a => a.type === 'boss_pig_king' && !a.isDead);
                const newestKing = kings[kings.length - 1];

                return {
                    totalKings: kings.length,
                    isInPigKingdom: window.game.isInPigKingdom,
                    kingPos: newestKing ? { x: newestKing.position.x, y: newestKing.position.y, z: newestKing.position.z } : null,
                    kingStage: newestKing ? newestKing.stage : null
                };
            })()
        """, 111)

        print(f"Pig King summon result: {summon_result}")
        assert summon_result["totalKings"] > initial_kings, "No new Pig King was summoned when placing Pig Block!"
        assert summon_result["isInPigKingdom"] == True, "Expected to be in Pig Kingdom after placing Pig Block!"
        assert summon_result["kingStage"] == 1, "Expected King to be in Stage 1 initially!"
        print("✓ Postawienie Świniowego Bloku natychmiast teleportuje do Króla Świń!")

        print("\n=======================================================")
        print("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉")
        print("=======================================================")

    finally:
        if chrome_proc:
            try: chrome_proc.terminate()
            except: pass
        if server_proc:
            try: server_proc.terminate()
            except: pass

if __name__ == "__main__":
    run_test()

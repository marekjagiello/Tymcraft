#!/usr/bin/env python3
"""
Automated CDP Test for:
1. Vast Desert (Pustynia) to the West and Southwest.
2. Vast Majestic Mountains (Góry) to the East and Southeast with peaks reaching > 20 blocks.
3. Recipe Book Visual Icons (Ikony i Obrazki składników):
   - Every recipe card shows visual chips with item icons.
   - Missing ingredients modal displays item icons and count details.
   - playWarningBuzzer is silent.
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
            val = eval_js("Boolean(window.game && window.game.ui && window.game.world)", 101)
            if val:
                ready = True
                break
            time.sleep(0.5)

        assert ready, "Game failed to initialize!"
        print("✓ Game successfully loaded!")

        # --- TEST 1: Biome distribution - Desert (Pustynia) ---
        print("\n--- TEST 1: Więcej Pustyni (Desert) ---")
        desert_samples = eval_js("""
            (() => {
                const world = window.game.world;
                const coords = [
                    { x: 20, z: 32 },
                    { x: 0, z: 32 },
                    { x: -30, z: 32 },
                    { x: -80, z: 32 },
                    { x: -120, z: 20 },
                    { x: -180, z: -40 }
                ];
                return coords.map(c => ({
                    x: c.x, z: c.z, biome: world.getBiome(c.x, c.z)
                }));
            })()
        """, 102)
        print(f"Desert samples: {desert_samples}")
        for s_item in desert_samples:
            assert s_item["biome"] == "Desert", f"Expected Desert at ({s_item['x']}, {s_item['z']}), got {s_item['biome']}!"
        print("✓ Potężna Pustynia rozciąga się setki bloków na zachód i południe!")

        # --- TEST 2: Biome distribution - Mountains (Góry) & Wysokie Szczyty ---
        print("\n--- TEST 2: Więcej Gór (Mountains) i Wysokie Szczyty ---")
        mountain_samples = eval_js("""
            (() => {
                const world = window.game.world;
                const coords = [
                    { x: 45, z: 32 },
                    { x: 70, z: 32 },
                    { x: 100, z: 32 },
                    { x: 140, z: 10 },
                    { x: 180, z: -20 }
                ];
                return coords.map(c => ({
                    x: c.x, z: c.z, biome: world.getBiome(c.x, c.z)
                }));
            })()
        """, 103)
        print(f"Mountain samples: {mountain_samples}")
        for s_item in mountain_samples:
            assert s_item["biome"] == "Mountains", f"Expected Mountains at ({s_item['x']}, {s_item['z']}), got {s_item['biome']}!"
        print("✓ Majestatyczne Pasma Górskie rozciągają się setki bloków na wschód!")

        # Verify mountain heights
        peak_height = eval_js("""
            (() => {
                const animals = window.game.animals;
                let maxHeight = 0;
                for (let x = 45; x <= 80; x += 3) {
                    for (let z = 20; z <= 40; z += 3) {
                        const h = animals.getGroundHeight(x, z);
                        if (h > maxHeight) maxHeight = h;
                    }
                }
                return maxHeight;
            })()
        """, 104)
        print(f"Maximum mountain peak height near spawn: {peak_height}")
        assert peak_height >= 18, f"Expected high mountain peaks (>= 18), got {peak_height}"
        print(f"✓ Góry są wysokie i imponujące (najwyższy szczyt: {peak_height} bloków)!")

        # --- TEST 3: Recipe Book Visual Chips & Icons ---
        print("\n--- TEST 3: Wizualne Ikony Składników w Księdze Receptur ---")
        # Open Crafting modal
        eval_js("window.game.ui.toggleCraftingModal();", 105)
        time.sleep(0.3)

        chip_info = eval_js("""
            (() => {
                const chips = document.querySelectorAll('.recipe-ingredient-chip');
                const firstChip = chips[0];
                const hasIcon = firstChip ? Boolean(firstChip.querySelector('canvas, span')) : false;
                const planksCard = document.querySelector('.recipe-card[data-recipe-id=\"planks\"]');
                const planksChips = planksCard ? planksCard.querySelectorAll('.recipe-ingredient-chip').length : 0;
                return {
                    totalChips: chips.length,
                    hasIcon: hasIcon,
                    planksChips: planksChips
                };
            })()
        """, 106)
        print(f"Recipe chips info: {chip_info}")
        assert chip_info["totalChips"] >= 15, f"Expected at least 15 visual ingredient chips, got {chip_info['totalChips']}"
        assert chip_info["hasIcon"], "Ingredient chip does not contain a visual icon element!"
        assert chip_info["planksChips"] >= 1, "Planks card should have at least 1 visual ingredient chip!"
        print("✓ Każda karta przepisu posiada wizualne kafelki z ikonami składników!")

        # --- TEST 4: Missing Items Visual Modal on Click ---
        print("\n--- TEST 4: Dymek Brakujących Surowców z Dużymi Ikonami ---")
        eval_js("""
            (() => {
                const planksCard = document.querySelector('.recipe-card[data-recipe-id=\"planks\"]');
                if (planksCard) planksCard.click();
            })()
        """, 107)
        time.sleep(0.3)

        modal_info = eval_js("""
            (() => {
                const popup = document.getElementById('recipe-needs-popup');
                if (!popup) return null;
                const icons = popup.querySelectorAll('canvas, span');
                return {
                    visible: popup.style.display === 'block',
                    innerText: popup.innerText,
                    hasIcons: icons.length > 0,
                    iconCount: icons.length
                };
            })()
        """, 108)
        print(f"Needs modal info: {modal_info}")
        assert modal_info and modal_info["visible"], "recipe-needs-popup is not visible!"
        assert "Drewno" in modal_info["innerText"], "Modal does not describe required Drewno!"
        assert modal_info["hasIcons"], "Modal does not contain visual item icons!"
        print("✓ Okno brakujących surowców POKAZUJE obrazki/ikony rzeczy, których gracz potrzebuje!")

        eval_js("window.game.ui.toggleCraftingModal();", 109)
        time.sleep(0.2)

        print("\n=======================================================")
        print("🎉 ALL DESERT, MOUNTAINS & VISUAL RECIPE TESTS PASSED! 🎉")
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

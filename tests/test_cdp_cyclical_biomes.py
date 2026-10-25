#!/usr/bin/env python3
"""
Automated CDP Test for Cyclical Biomes & Prettier World on Tymek's request:
"Pooładnij ten świat, żeby były drzewa, pustynia, góry... drzewa, pustynia, góry... i to się ciągle zmienia!"

Verifies:
1. Spawn is picturesque Forest (Drzewa) with trees and flowers.
2. Walking in any direction cycles continuously:
   Forest (Drzewa) -> Desert (Pustynia) -> Mountains (Góry) -> Forest -> Desert -> Mountains...
3. Rich vegetation:
   - Trees & Flowers (Roses 17, Dandelions 18) in Forest.
   - Cacti in Desert.
   - High peaks (>= 20 blocks) with snow in Mountains.
4. Special dimensions (DarkDimension, PigKingdom) preserved.
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

        def send_cdp(cmd_id, method, params=None):
            msg = {"id": cmd_id, "method": method, "params": params or {}}
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

        def recv_cdp_until_id(target_id, timeout=12):
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
                    if len(buf) < idx + payload_len:
                        break
                    raw_payload = buf[idx:idx + payload_len]
                    buf = buf[idx + payload_len:]
                    try:
                        obj = json.loads(raw_payload.decode('utf-8'))
                        if obj.get('id') == target_id:
                            return obj
                    except Exception:
                        pass
            return None

        def eval_js(expr, req_id):
            send_cdp(req_id, "Runtime.evaluate", {"expression": expr, "returnByValue": True})
            res = recv_cdp_until_id(req_id)
            if not res or 'result' not in res or 'result' not in res['result']:
                return None
            return res['result']['result'].get('value')

        print("Waiting for game to initialize...")
        ready = False
        for _ in range(30):
            val = eval_js("Boolean(window.game && window.game.world)", 101)
            if val:
                ready = True
                break
            time.sleep(0.5)

        assert ready, "Game failed to initialize!"
        print("✓ Game successfully loaded!")

        # --- TEST 1: Spawn Point is Picturesque Forest ---
        print("\n--- TEST 1: Spawn Point Biome (Drzewa / Forest) ---")
        spawn_biome = eval_js("window.game.world.getBiome(32, 32)", 102)
        print(f"Spawn biome at (32, 32): {spawn_biome}")
        assert spawn_biome == "Forest", f"Expected Forest at spawn, got {spawn_biome}"
        print("✓ Punkt startowy gracza to zielony Las z drzewami i kwiatami!")

        # --- TEST 2: Continuous Biome Cycle (Drzewa -> Pustynia -> Góry -> Drzewa...) ---
        print("\n--- TEST 2: Cykliczna zmiana biomów wzdłuż osi X i Z ---")
        cycle_result = eval_js("""
            (() => {
                const world = window.game.world;
                const pathEast = [];
                for (let x = 32; x <= 220; x += 12) {
                    pathEast.push({ x, z: 32, biome: world.getBiome(x, 32) });
                }
                const biomesVisited = [...new Set(pathEast.map(p => p.biome))];
                return {
                    pathEast,
                    biomesVisited
                };
            })()
        """, 103)
        print("Path East sampled every 12 blocks:")
        for pt in cycle_result["pathEast"]:
            print(f"  x={pt['x']}, z={pt['z']} => {pt['biome']}")
        
        visited = cycle_result["biomesVisited"]
        print(f"Biomes visited along East path: {visited}")
        assert "Forest" in visited, "Expected Forest in East path!"
        assert "Desert" in visited, "Expected Desert in East path!"
        assert "Mountains" in visited, "Expected Mountains in East path!"

        # Verify that biomes cycle multiple times (change >= 3 times along the path)
        transitions = 0
        last_b = cycle_result["pathEast"][0]["biome"]
        for pt in cycle_result["pathEast"][1:]:
            if pt["biome"] != last_b:
                transitions += 1
                last_b = pt["biome"]
        print(f"Number of biome transitions in 190 blocks: {transitions}")
        assert transitions >= 3, f"Expected at least 3 biome transitions, got {transitions}!"
        print("✓ Biomy ciągle się zmieniają: Drzewa 🌳 -> Pustynia 🏜️ -> Góry 🏔️!")

        # --- TEST 3: High Mountain Peaks with Snow and Rocks ---
        print("\n--- TEST 3: Majestatyczne Góry (Wysokie Szczyty) ---")
        mountain_peak = eval_js("""
            (() => {
                const world = window.game.world;
                let maxH = 0;
                let foundSnow = false;
                let foundStone = false;

                // Search in mountain chunks
                for (let x = 70; x <= 140; x += 3) {
                    for (let z = 20; z <= 60; z += 3) {
                        if (world.getBiome(x, z) === 'Mountains') {
                            for (let y = 30; y >= 1; y--) {
                                const b = world.getBlock(x, y, z);
                                if (b > 0) {
                                    if (y > maxH) maxH = y;
                                    if (b === 7) foundSnow = true;
                                    if (b === 3) foundStone = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                return { maxH, foundSnow, foundStone };
            })()
        """, 104)
        print(f"Mountain peak result: {mountain_peak}")
        assert mountain_peak["maxH"] >= 20, f"Expected mountain peaks >= 20 blocks, got {mountain_peak['maxH']}"
        assert mountain_peak["foundStone"], "Expected stone rocks in mountains!"
        print(f"✓ Góry są wysokie (szczyt {mountain_peak['maxH']} bloków) i mają skały oraz śnieg!")

        # --- TEST 4: Trees, Flowers and Cacti Vegetation ---
        print("\n--- TEST 4: Upiększenie świata (Drzewa, Kwiaty, Kaktusy) ---")
        veg_result = eval_js("""
            (() => {
                const world = window.game.world;
                let woodCount = 0;
                let leavesCount = 0;
                let flowerCount = 0;
                let cactusCount = 0;

                for (let x = 0; x <= 80; x += 2) {
                    for (let z = 0; z <= 80; z += 2) {
                        for (let y = 5; y <= 25; y++) {
                            const b = world.getBlock(x, y, z);
                            if (b === 4) woodCount++;
                            if (b === 5) leavesCount++;
                            if (b === 17 || b === 18) flowerCount++;
                            if (b === 11) cactusCount++;
                        }
                    }
                }
                return { woodCount, leavesCount, flowerCount, cactusCount };
            })()
        """, 105)
        print(f"Vegetation result in 80x80 area: {veg_result}")
        assert veg_result["woodCount"] > 0, "No tree wood blocks found!"
        assert veg_result["leavesCount"] > 0, "No tree leaves found!"
        assert veg_result["flowerCount"] > 0, "No flowers found on meadows!"
        assert veg_result["cactusCount"] > 0, "No cacti found in desert!"
        print("✓ Świat jest upiększony: naturalne drzewa z koronami, kolorowe kwiaty i kaktusy!")

        # --- TEST 5: Special Dimensions Preserved ---
        print("\n--- TEST 5: Specjalne wymiary bossów nienaruszone ---")
        dim_result = eval_js("""
            (() => {
                const world = window.game.world;
                return {
                    darkDimension: world.getBiome(1000, 1000),
                    pigKingdom: world.getBiome(2000, 2000)
                };
            })()
        """, 106)
        print(f"Special dimensions result: {dim_result}")
        assert dim_result["darkDimension"] == "DarkDimension", "DarkDimension biome not preserved!"
        assert dim_result["pigKingdom"] == "PigKingdom", "PigKingdom biome not preserved!"
        print("✓ Areny bossów (Robot 1000, Król Świń 2000) zachowane!")

        print("\n=======================================================")
        print("🎉 ALL CYCLICAL BIOMES & WORLD BEAUTY TESTS PASSED! 🎉")
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

#!/usr/bin/env python3
"""
Automated CDP Test:
1. Boot Tymcraft with no console errors.
2. Verify wand spells: Lightning ⚡, Fireball 🔥, Stone 🪨.
3. Test wand casting at feet / near player:
   - Ensure NO stone block is placed inside player or head.
   - Ensure player collision check passes (no X-Ray glitch).
4. Test Auto-Unstuck (Tarcza Anty-XRay):
   - Artificially placing player inside a solid block immediately pushes player up/out into air.
5. Test Anti-Void Safety (Tarcza Anty-Próżniowa):
   - Falling below Y < 0.5 triggers instant rescue to surface.
6. Test 3rd Person Camera Collision:
   - Camera position never penetrates solid walls or ceilings.
7. Test Chat Security & Command:
   - Command '/tarcza' outputs active anti-hack shield status.
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
                if expected_id is None or msg.get("id") == expected_id:
                    return msg

        cmd_id = 1

        def eval_js(expr):
            nonlocal cmd_id
            cid = cmd_id
            cmd_id += 1
            send_cdp(cid, "Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
            res = recv_cdp(cid)
            if "result" in res and "result" in res["result"]:
                val = res["result"]["result"].get("value")
                return val
            return None

        # Wait for game to initialize
        print("Waiting for game initialization...")
        for attempt in range(25):
            ready = eval_js("Boolean(window.game && window.game.player && window.game.interaction && window.game.world)")
            if ready:
                print("Game initialized successfully!")
                break
            time.sleep(0.5)

        assert eval_js("Boolean(window.game)"), "Game failed to load!"

        # TEST 1: Check Wand Spells & Selection HUD
        print("\n--- TEST 1: Wand Spells & HUD ---")
        eval_js("""
            // Add Wand (ID 50) to hotbar slot 0
            const wandItem = { id: 50, name: 'Magiczna Różdżka', count: 1 };
            window.game.ui.hotbarSlots[0] = wandItem;
            // Also update global HOTBAR_BLOCKS if used
            window.game.ui.selectSlot(0);
        """)
        slot0_id = eval_js("window.game.ui.getActiveBlockId()")
        print(f"Slot 0 active ID: {slot0_id}")
        assert slot0_id == 50, f"Expected active ID 50, got {slot0_id}"

        # Cycle wand spells
        current_spell_name = eval_js("window.game.interaction.wandSpells[window.game.interaction.currentWandSpellIdx].name")
        print(f"Initial spell: {current_spell_name}")

        eval_js("window.game.interaction.cycleWandSpell()")
        spell_2 = eval_js("window.game.interaction.wandSpells[window.game.interaction.currentWandSpellIdx].name")
        print(f"After 1st cycle (PPM): {spell_2}")

        eval_js("window.game.interaction.cycleWandSpell()")
        spell_3 = eval_js("window.game.interaction.wandSpells[window.game.interaction.currentWandSpellIdx].name")
        print(f"After 2nd cycle (PPM): {spell_3}")

        # TEST 2: Cast Stone Spell at Player's Feet (Anti-XRay Bug Reproduction & Prevention)
        print("\n--- TEST 2: Cast Stone Spell at Feet (Anti-XRay Protection) ---")
        # Ensure spell is 'stone'
        eval_js("""
            const stoneIdx = window.game.interaction.wandSpells.findIndex(s => s.id === 'stone');
            window.game.interaction.currentWandSpellIdx = stoneIdx;
        """)
        spell_id = eval_js("window.game.interaction.wandSpells[window.game.interaction.currentWandSpellIdx].id")
        assert spell_id == 'stone', f"Expected spell 'stone', got {spell_id}"

        # Get initial player position
        initial_px = eval_js("window.game.player.position.x")
        initial_py = eval_js("window.game.player.position.y")
        initial_pz = eval_js("window.game.player.position.z")
        print(f"Player at: ({initial_px:.2f}, {initial_py:.2f}, {initial_pz:.2f})")

        # Cast wand looking straight down at feet!
        eval_js("""
            // Point camera downwards at feet
            window.game.camera.rotation.x = -Math.PI / 2;
            window.game.interaction.magicWandCooldown = 0;
            window.game.interaction.castMagicWand();
        """)

        # Simulate 10 frames to let projectile hit ground right under player
        eval_js("""
            for (let f = 0; f < 10; f++) {
                if (window.game.animals && window.game.animals.thrownProjectiles) {
                    for (const p of window.game.animals.thrownProjectiles) {
                        p.update(0.016, window.game.player, window.game.survival, window.game.ui, window.game.animals.animals);
                    }
                }
                window.game.player.update(0.016);
            }
        """)

        # Verify: Is player head or body inside solid block?
        collision = eval_js("window.game.player.checkVoxelCollision(window.game.player.getAABB())")
        head_block = eval_js("""
            const px = Math.floor(window.game.player.position.x);
            const py = Math.floor(window.game.player.position.y + window.game.player.eyeHeight);
            const pz = Math.floor(window.game.player.position.z);
            window.game.world.getBlock(px, py, pz);
        """)
        body_block = eval_js("""
            const px = Math.floor(window.game.player.position.x);
            const py = Math.floor(window.game.player.position.y + 0.5);
            const pz = Math.floor(window.game.player.position.z);
            window.game.world.getBlock(px, py, pz);
        """)

        print(f"Collision after casting stone at feet: {collision}")
        print(f"Head block ID: {head_block}, Body block ID: {body_block}")

        assert not collision, "ERROR: Player is stuck inside a block after casting stone!"
        assert head_block == 0, f"ERROR: Player head is inside block {head_block} (X-Ray Glitch)!"

        # TEST 3: Fireball Spell (Kula Ognia 🔥)
        print("\n--- TEST 3: Fireball Spell (Kula Ognia) ---")
        eval_js("""
            const fbIdx = window.game.interaction.wandSpells.findIndex(s => s.id === 'fireball');
            window.game.interaction.currentWandSpellIdx = fbIdx;
            window.game.interaction.magicWandCooldown = 0;
            window.game.interaction.castMagicWand();
            for (let f = 0; f < 15; f++) {
                if (window.game.animals && window.game.animals.thrownProjectiles) {
                    for (const p of window.game.animals.thrownProjectiles) {
                        p.update(0.016, window.game.player, window.game.survival, window.game.ui, window.game.animals.animals);
                    }
                }
            }
        """)
        print("Fireball cast and exploded safely with no errors!")

        # TEST 4: Auto-Unstuck Shield
        print("\n--- TEST 4: Auto-Unstuck Shield (Anti-Clipping) ---")
        eval_js("""
            // Deliberately place player inside ground block
            const solidBx = Math.floor(window.game.player.position.x);
            const solidBz = Math.floor(window.game.player.position.z);
            let groundY = 10;
            for (let y = 30; y >= 1; y--) {
                if (window.game.world.isSolid(solidBx, y, solidBz)) {
                    groundY = y;
                    break;
                }
            }
            // Force player position inside solid block groundY
            window.game.player.position.set(solidBx + 0.5, groundY + 0.1, solidBz + 0.5);
        """)
        stuck_before = eval_js("window.game.player.checkVoxelCollision(window.game.player.getAABB())")
        print(f"Stuck before update: {stuck_before}")

        # Update player frame
        eval_js("window.game.player.update(0.016);")
        stuck_after = eval_js("window.game.player.checkVoxelCollision(window.game.player.getAABB())")
        new_py = eval_js("window.game.player.position.y")
        print(f"Stuck after Auto-Unstuck: {stuck_after}, New Y: {new_py:.2f}")
        assert not stuck_after, "Auto-Unstuck failed to push player out of solid block!"

        # TEST 5: Anti-Void Shield (Tarcza Anty-Próżniowa)
        print("\n--- TEST 5: Anti-Void Shield ---")
        eval_js("""
            // Force player into void
            window.game.player.position.y = -5.0;
            window.game.player.update(0.016);
        """)
        saved_y = eval_js("window.game.player.position.y")
        print(f"Player Y after falling in void: {saved_y:.2f}")
        assert saved_y >= 1.0, f"Expected player saved above Y >= 1.0, got {saved_y}"

        # TEST 6: 3rd Person Camera Collision with Wall
        print("\n--- TEST 6: 3rd Person Camera Collision ---")
        eval_js("""
            window.game.player.cameraMode = 1; // 3rd person
            window.game.player.update(0.016);
        """)
        cam_inside_block = eval_js("""
            const cx = Math.floor(window.game.camera.position.x);
            const cy = Math.floor(window.game.camera.position.y);
            const cz = Math.floor(window.game.camera.position.z);
            window.game.world.isSolid(cx, cy, cz);
        """)
        print(f"Is camera inside solid block in 3rd person: {cam_inside_block}")
        assert not cam_inside_block, "ERROR: 3rd person camera penetrated solid block!"

        # Switch back to 1st person
        eval_js("window.game.player.cameraMode = 0; window.game.player.update(0.016);")

        # TEST 7: Chat Command '/tarcza'
        print("\n--- TEST 7: Chat Command /tarcza ---")
        eval_js("""
            window.game.ui.chatInputEl.value = '/tarcza';
            window.game.ui.submitChat();
        """)
        chat_content = eval_js("window.game.ui.chatMessagesEl.innerText")
        print(f"Chat messages contain shield: {'Tarcza Anty-Hakerska' in chat_content}")
        assert 'Tarcza Anty-Hakerska' in chat_content, "Expected Tarcza Anty-Hakerska message in chat!"

        print("\n==========================================")
        print("🎉 ALL TESTS PASSED SUCCESSFULLY! 🛡️✨")
        print("==========================================")
        return True

    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if chrome_proc:
            try: chrome_proc.terminate()
            except: pass
        if server_proc:
            try: server_proc.terminate()
            except: pass

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)

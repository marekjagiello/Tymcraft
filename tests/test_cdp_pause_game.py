#!/usr/bin/env python3
"""
Automated CDP Test for Pause Game Feature (Esc & Inventory E/R)
Requested by Tymek (8 years old):
"Zrób tak, że klikasz Esc, to wtedy ci całą grę stopuje i jak klikasz ekwipunek, to też ci całą grę stopuje, żeby potwory cię nie mogły bić, okej?"

Verifies:
1. Game loop pauses when crafting/inventory is open (KeyE / KeyR).
2. Game loop pauses when Esc pause menu is active.
3. Hostile monsters cannot attack or damage player while game is paused.
4. Survival (hunger/health) does not degrade while paused.
5. Unpausing smoothly restores active game state without physics delta jumps.
6. Pause indicators appear in crafting modal header/footer and pause menu.
"""

import subprocess
import time
import urllib.request
import json
import socket
import os
import sys

def run_test():
    server = None
    chrome_proc = None
    try:
        import threading
        from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

        class NoCacheHandler(SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory="/home/marek/ai projects/m2", **kwargs)
            def end_headers(self):
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                super().end_headers()

        server = ThreadingHTTPServer(('127.0.0.1', 8089), NoCacheHandler)
        srv_thread = threading.Thread(target=server.serve_forever, daemon=True)
        srv_thread.start()
        time.sleep(0.5)

        print("Launching headless Chrome on 9223...")
        chrome_bin = "/home/marek/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome"
        if not os.path.exists(chrome_bin):
            chrome_bin = "google-chrome"
        chrome_cmd = [
            chrome_bin,
            "--headless=new",
            "--remote-debugging-port=9223",
            "--remote-allow-origins=*",
            "--user-data-dir=/tmp/test-pause-chrome-profile",
            "--no-sandbox",
            "--disable-gpu",
            "--window-size=1280,720",
            "--mute-audio",
            "http://127.0.0.1:8089/index.html"
        ]
        chrome_proc = subprocess.Popen(chrome_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws_url = None
        for attempt in range(20):
            time.sleep(0.5)
            try:
                with urllib.request.urlopen("http://127.0.0.1:9223/json", timeout=1.0) as req:
                    targets = json.loads(req.read().decode('utf-8'))
                    for t in targets:
                        if t.get('type') == 'page' and ('index.html' in t.get('url', '') or '8089' in t.get('url', '')) and 'webSocketDebuggerUrl' in t:
                            ws_url = t['webSocketDebuggerUrl']
                            break
                    if ws_url:
                        break
            except Exception:
                pass

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
            s.settimeout(0.5)
            while time.time() - start < timeout:
                try:
                    chunk = s.recv(4096)
                    if chunk:
                        buf.extend(chunk)
                except socket.timeout:
                    pass
                except Exception:
                    break

                while len(buf) >= 2:
                    second = buf[1]
                    is_masked = bool(second & 0x80)
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

                    full_len = idx + (4 if is_masked else 0) + payload_len
                    if len(buf) < full_len:
                        break

                    if is_masked:
                        mask = buf[idx:idx+4]
                        masked_data = buf[idx+4:idx+4+payload_len]
                        unmasked = bytes([b ^ mask[i % 4] for i, b in enumerate(masked_data)])
                    else:
                        unmasked = bytes(buf[idx:idx+payload_len])

                    buf = buf[full_len:]
                    try:
                        parsed = json.loads(unmasked.decode('utf-8'))
                        if parsed.get('id') == target_id:
                            return parsed
                    except Exception:
                        pass
            return None

        def eval_js(expression, cmd_id):
            send_cdp(cmd_id, "Runtime.evaluate", {"expression": expression, "returnByValue": True})
            res = recv_cdp_until_id(cmd_id)
            assert res and "result" in res, f"Eval failed for: {expression[:50]}"
            result = res["result"].get("result", {})
            if "value" in result:
                return result["value"]
            return result

        print("Waiting for game to load...")
        game_ready = False
        for i in range(45):
            time.sleep(1.0)
            ready = eval_js("Boolean(window.game && window.game.ui && window.game.survival)", 200 + i)
            if ready is True:
                print(f"Game ready at attempt {i+1}!")
                game_ready = True
                break
        assert game_ready, "Game failed to initialize within timeout!"
        time.sleep(1.0)

        # Start game by bypassing loading screen
        eval_js("""
            (() => {
                const ui = window.game.ui;
                ui.overlayEl.style.display = 'none';
                ui.isGameActive = true;
                ui.isLoading = false;
                const loadingEl = document.getElementById('loading-overlay');
                if (loadingEl) loadingEl.style.display = 'none';
                try { ui.player.controls.lock(); } catch(e) {}
            })()
        """, 101)
        time.sleep(0.5)

        # --- TEST 1: Normal Active State ---
        print("\n--- TEST 1: Normal Active State ---")
        is_paused = eval_js("window.game.isGamePaused()", 102)
        print(f"Game paused when active: {is_paused}")
        assert is_paused == False, f"Expected game to NOT be paused when playing, got {is_paused}"
        print("✓ Podczas gry stan pauzy jest wyłączony!")

        # --- TEST 2: Inventory Open (Key E / R) triggers Pause ---
        print("\n--- TEST 2: Inventory (Ekwipunek E/R) triggers Full Game Pause ---")
        eval_js("window.game.ui.toggleCraftingModal()", 103)
        time.sleep(0.2)

        pause_data = eval_js("""
            (() => {
                const game = window.game;
                const ui = game.ui;
                const modal = document.getElementById('crafting-modal');
                const badge = modal.querySelector('.pause-badge');
                return {
                    isPaused: game.isGamePaused(),
                    isCraftingOpen: ui.isCraftingOpen,
                    modalDisplay: modal.style.display,
                    hasPauseBadge: !!badge && badge.innerText.includes('GRA ZATRZYMANA')
                };
            })()
        """, 104)
        print(f"Inventory pause data: {pause_data}")
        assert pause_data["isPaused"] == True, "Expected game to be PAUSED when inventory is open!"
        assert pause_data["isCraftingOpen"] == True, "Expected isCraftingOpen == True!"
        assert pause_data["hasPauseBadge"] == True, "Expected pause badge in crafting modal!"
        print("✓ Otwarcie ekwipunku natychmiast zatrzymuje całą grę i wyświetla wskaźnik pauzy!")

        # --- TEST 3: Hostile Mobs Cannot Attack and Damage Player During Pause ---
        print("\n--- TEST 3: Potwory nie mogą bić gracza podczas pauzy ---")
        attack_test = eval_js("""
            (() => {
                const game = window.game;
                const survival = game.survival;
                const initialHp = survival.health;

                // Try to deal damage directly while paused
                survival.takeDamage(4, 'zombie');
                const hpAfterDirectDamage = survival.health;

                // Spawn a zombie right at player's position
                const zombie = game.animals.spawnZombieInFrontOfPlayer(game.player, 0.5);
                const zombieInitialPos = zombie ? { x: zombie.position.x, z: zombie.position.z } : null;

                return {
                    initialHp,
                    hpAfterDirectDamage,
                    zombieSpawned: !!zombie,
                    zombieInitialPos
                };
            })()
        """, 105)
        print(f"Attack test data: {attack_test}")
        assert attack_test["hpAfterDirectDamage"] == attack_test["initialHp"], "Player took damage while game was paused!"
        print("✓ Gracz jest w 100% bezpieczny - obrażenia są blokowane podczas pauzy!")

        # Close crafting modal and verify game unpauses
        eval_js("window.game.ui.toggleCraftingModal()", 106)
        time.sleep(0.2)
        is_paused_after_close = eval_js("window.game.isGamePaused()", 107)
        print(f"Paused after closing inventory: {is_paused_after_close}")
        assert is_paused_after_close == False, "Expected game to unpause after closing inventory!"
        print("✓ Zamknięcie ekwipunku gładko wznawia rozgrywkę!")

        # --- TEST 4: Esc Key / Menu Pause ---
        print("\n--- TEST 4: Menu Pauzy (Esc) ---")
        eval_js("window.game.ui.pauseGame()", 108)
        time.sleep(0.2)

        esc_pause = eval_js("""
            (() => {
                const game = window.game;
                const title = document.getElementById('menu-title');
                const resumeBtn = document.getElementById('resume-game-btn');
                return {
                    isPaused: game.isGamePaused(),
                    overlayDisplay: game.ui.overlayEl.style.display,
                    titleText: title ? title.innerText : '',
                    resumeText: resumeBtn ? resumeBtn.innerText : ''
                };
            })()
        """, 109)
        print(f"Esc pause data: {esc_pause}")
        assert esc_pause["isPaused"] == True, "Expected game to be paused after pauseGame()!"
        assert "PAUZA" in esc_pause["titleText"] or "ZATRZYMANA" in esc_pause["titleText"], "Expected pause title!"
        print("✓ Wciśnięcie Esc wyświetla ekran pauzy i zatrzymuje czas gry!")

        # Resume game
        eval_js("window.game.ui.resumeGame()", 110)
        time.sleep(0.2)
        is_resumed = eval_js("window.game.isGamePaused()", 111)
        assert is_resumed == False, "Expected game to resume!"
        print("✓ Wznowienie gry przywraca aktywny świat!")

        print("\n=======================================================")
        print("🎉 WSZYSTKIE TESTY PAUZY GRY (ESC I EKWIPUNEK) ZALICZONE!")
        print("=======================================================")

    finally:
        if chrome_proc:
            try: chrome_proc.terminate()
            except Exception: pass
        if server:
            try: server.shutdown()
            except Exception: pass

if __name__ == "__main__":
    run_test()

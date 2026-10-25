#!/usr/bin/env python3
"""
Automated CDP Test for Recipe Book (Księga Receptur) & Monster Repellent (Odstraszacz Potworów):
1. Boot Tymcraft in Chrome.
2. Open Crafting & Inventory modal (R/E key).
3. Verify Recipe Book presence, category tabs, and toggle button (📗).
4. Verify initial red state (unavailable) for recipes when starting empty.
5. Click red recipe -> verify warning: "Nie masz dobrych surowców, żeby to zrobić!".
6. Add 1x Wood -> verify 'planks' recipe dynamically turns green (available).
7. Click green 'planks' -> verify 4x Planks are crafted and Wood consumed.
8. Verify 'stick' recipe turns green -> craft 4x Sticks.
9. Add Stone & Bone -> verify 'monster_repellent' turns green -> craft Odstraszacz Potworów (ID 60).
10. Test Monster Repellent AI: Hostile mob fears player and runs away without attacking.
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
            val = eval_js("Boolean(window.game && window.game.ui && window.game.crafting)", 101)
            if val:
                ready = True
                break
            time.sleep(0.5)

        assert ready, "Game failed to initialize!"
        print("✓ Game successfully loaded!")

        # 1. Open Crafting Modal
        print("\n--- TEST 1: Otwarcie Okna Ekwipunku i Księgi Receptur ---")
        eval_js("window.game.ui.toggleCraftingModal();", 102)
        time.sleep(0.3)

        modal_open = eval_js("window.game.ui.isCraftingOpen && document.getElementById('crafting-modal').style.display === 'block'", 103)
        assert modal_open, "Crafting modal did not open!"
        print("✓ Okno craftingu i ekwipunku otwarte!")

        # 2. Check Recipe Book container and toggle button
        has_recipe_book = eval_js("Boolean(document.getElementById('recipe-book-container') && document.getElementById('toggle-recipe-book-btn'))", 104)
        assert has_recipe_book, "Recipe Book elements missing from DOM!"
        print("✓ Księga Receptur i przycisk 📗 obecne w interfejsie!")

        # 3. Check that initial recipes are RED (unavailable) on empty inventory
        cards_status = eval_js("""
            (() => {
                const cards = document.querySelectorAll('.recipe-card');
                const planksCard = document.querySelector('.recipe-card[data-recipe-id=\"planks\"]');
                const repellentCard = document.querySelector('.recipe-card[data-recipe-id=\"monster_repellent\"]');
                return {
                    totalCards: cards.length,
                    planksUnavailable: planksCard ? planksCard.classList.contains('unavailable') : false,
                    repellentUnavailable: repellentCard ? repellentCard.classList.contains('unavailable') : false
                };
            })()
        """, 105)

        print(f"Recipe cards status on empty start: {cards_status}")
        assert cards_status["totalCards"] >= 15, f"Expected at least 15 recipes, found {cards_status['totalCards']}"
        assert cards_status["planksUnavailable"], "Planks recipe should be unavailable (red) on empty start!"
        assert cards_status["repellentUnavailable"], "Monster Repellent recipe should be unavailable (red) on empty start!"
        print("✓ Karty przepisów świecą na czerwono (brak surowców na starcie)!")

        # 4. Click unavailable red card -> verify warning popup: "Nie masz dobrych surowców, żeby to zrobić!"
        print("\n--- TEST 2: Kliknięcie czerwonej karty -> komunikat o braku surowców ---")
        eval_js("""
            (() => {
                const planksCard = document.querySelector('.recipe-card[data-recipe-id=\"planks\"]');
                if (planksCard) planksCard.click();
            })()
        """, 106)
        time.sleep(0.2)

        popup_text = eval_js("document.getElementById('block-name-popup')?.innerText || ''", 107)
        print(f"Popup text on clicking red card: '{popup_text}'")
        assert "Nie masz dobrych surowców" in popup_text, f"Expected warning popup, got '{popup_text}'"
        print("✓ Wyświetla ostrzeżenie: 'Nie masz dobrych surowców, żeby to zrobić!'")

        # 5. Add 1x Drewno (ID 4) -> verify Planks card turns GREEN (available)
        print("\n--- TEST 3: Dodanie Drewna -> Karta Desek świeci na ZIELONO ---")
        eval_js("window.game.ui.addItem(4, 'Drewno', 1);", 108)
        time.sleep(0.2)

        planks_green = eval_js("""
            (() => {
                const planksCard = document.querySelector('.recipe-card[data-recipe-id=\"planks\"]');
                return planksCard ? planksCard.classList.contains('available') : false;
            })()
        """, 109)
        assert planks_green, "Planks card did not turn green (available) after adding Wood!"
        print("✓ Karta 'Deski' świeci na zielono (gotowa do wytworzenia)!")

        # 6. Click green Planks card -> auto-crafts 4x Deski (ID 8) and removes 1x Drewno
        print("\n--- TEST 4: Kliknięcie zielonej karty -> Natychmiastowe wytworzenie Desek (x4) ---")
        eval_js("""
            (() => {
                const planksCard = document.querySelector('.recipe-card[data-recipe-id=\"planks\"]');
                if (planksCard) planksCard.click();
            })()
        """, 110)
        time.sleep(0.2)

        craft_result = eval_js("""
            (() => {
                const ui = window.game.ui;
                return {
                    hasPlanks: ui.hasItem(8, 4),
                    woodCount: ui.hotbarBlocks.concat(ui.backpackSlots).filter(s => s.id === 4).reduce((a, b) => a + b.count, 0)
                };
            })()
        """, 111)
        print(f"Craft result: {craft_result}")
        assert craft_result["hasPlanks"], "Player does not have 4 Planks after clicking recipe!"
        assert craft_result["woodCount"] == 0, f"Wood was not consumed! Wood remaining: {craft_result['woodCount']}"
        print("✓ Pomyślnie wytworzono 4x Deski, a Drewno zostało pobrane z ekwipunku!")

        # 7. Check that Stick (Patyk) now turned GREEN (since we have 4 Planks, need 2)
        print("\n--- TEST 5: Karta Patyka świeci na zielono -> Wytworzenie Patyków ---")
        stick_green = eval_js("""
            (() => {
                const stickCard = document.querySelector('.recipe-card[data-recipe-id=\"stick\"]');
                return stickCard ? stickCard.classList.contains('available') : false;
            })()
        """, 112)
        assert stick_green, "Stick recipe did not become available after crafting planks!"

        eval_js("""
            (() => {
                const stickCard = document.querySelector('.recipe-card[data-recipe-id=\"stick\"]');
                if (stickCard) stickCard.click();
            })()
        """, 113)
        time.sleep(0.2)

        has_sticks = eval_js("window.game.ui.hasItem(20, 4)", 114)
        assert has_sticks, "Player does not have 4 Sticks after clicking recipe!"
        print("✓ Pomyślnie wytworzono 4x Patyki!")

        # 8. Test crafting Monster Repellent (Odstraszacz Potworów ID 60)
        print("\n--- TEST 6: Odstraszacz Potworów (ID 60) ---")
        eval_js("""
            window.game.ui.addItem(3, 'Kamień', 1);
            window.game.ui.addItem(27, 'Kość', 1);
        """, 115)
        time.sleep(0.2)

        repellent_green = eval_js("""
            (() => {
                const c = document.querySelector('.recipe-card[data-recipe-id=\"monster_repellent\"]');
                return c ? c.classList.contains('available') : false;
            })()
        """, 116)
        assert repellent_green, "Monster Repellent recipe did not become available with Stick + Stone + Bone!"

        # Click to craft Odstraszacz Potworów
        eval_js("""
            (() => {
                const c = document.querySelector('.recipe-card[data-recipe-id=\"monster_repellent\"]');
                if (c) c.click();
            })()
        """, 117)
        time.sleep(0.2)

        has_repellent = eval_js("window.game.ui.hasItem(60, 1)", 118)
        assert has_repellent, "Player does not have Odstraszacz Potworów (ID 60)!"
        print("✓ Pomyślnie wytworzono Odstraszacz Potworów (ID 60)!")

        # 9. Test AI effect of Odstraszacz Potworów on Zombie
        print("\n--- TEST 7: Działanie Odstraszacza Potworów na Zombie (ucieczka w popłochu) ---")
        zombie_test = eval_js("""
            (() => {
                const player = window.game.player;
                const animals = window.game.animals;

                // Spawn a zombie with a helmet in front of player
                const zombie = animals.spawnZombieInFrontOfPlayer(player, 5.0, true);
                if (!zombie) return { success: false, reason: 'Failed to spawn zombie' };

                const startDist = zombie.position.distanceTo(player.position);
                // Run 10 ticks of update during night (isDay = false)
                for (let i = 0; i < 15; i++) {
                    zombie.update(0.1, player.position, false);
                }
                const endDist = zombie.position.distanceTo(player.position);

                return {
                    success: true,
                    startDist: startDist,
                    endDist: endDist,
                    ranAway: endDist > startDist,
                    walkSpeed: zombie.walkSpeed
                };
            })()
        """, 119)
        print(f"Zombie repellent test result: {zombie_test}")
        assert zombie_test["success"], f"Zombie test failed: {zombie_test}"
        assert zombie_test["ranAway"], f"Zombie did not flee from player! Start: {zombie_test['startDist']}, End: {zombie_test['endDist']}"
        print("✓ Zombie panikuje i ucieka przed graczem z Odstraszaczem Potworów!")

        # 10. Close crafting modal
        eval_js("window.game.ui.toggleCraftingModal();", 120)
        time.sleep(0.2)
        closed = eval_js("!window.game.ui.isCraftingOpen", 121)
        assert closed, "Crafting modal failed to close!"
        print("✓ Zamknięcie okna craftingu zweryfikowane!")

        print("\n=======================================================")
        print("🎉 ALL RECIPE BOOK & MONSTER REPELLENT TESTS PASSED! 🎉")
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

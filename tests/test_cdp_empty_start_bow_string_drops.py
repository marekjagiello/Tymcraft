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
    print(f"Using Chrome binary: {chrome_bin}")

    chrome_proc = subprocess.Popen([
        chrome_bin,
        '--headless=new',
        '--remote-debugging-port=9227',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        req = urllib.request.urlopen('http://127.0.0.1:9227/json')
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

        # -------------------------------------------------------------
        # TEST 1: Pusty Start Ekwipunku (Brak jakichkolwiek rzeczy na start)
        # -------------------------------------------------------------
        print("\n--- TEST 1: Pusty start ekwipunku (brak kamienia, łuku i jakichkolwiek itemów) ---")
        empty_start_test = eval_js(200, """
        (function() {
            // Czyścimy localStorage i inicjujemy czysty start
            localStorage.removeItem('minecraft_poc_player_state_v1');
            
            const ui = window.game.ui;
            const hotbar = ui.hotbarBlocks;
            const backpack = ui.backpackSlots;

            let nonZeroHotbar = 0;
            for (let i = 0; i < hotbar.length; i++) {
                if (hotbar[i].id !== 0 && hotbar[i].count > 0) {
                    nonZeroHotbar++;
                }
            }

            let nonZeroBackpack = 0;
            for (let i = 0; i < backpack.length; i++) {
                if (backpack[i].id !== 0 && backpack[i].count > 0) {
                    nonZeroBackpack++;
                }
            }

            const hasStone = hotbar.some(s => s.id === 3) || backpack.some(s => s.id === 3);
            const hasBow = hotbar.some(s => s.id === 29) || backpack.some(s => s.id === 29);
            const hasArrows = hotbar.some(s => s.id === 28) || backpack.some(s => s.id === 28);

            return {
                hotbarLength: hotbar.length,
                backpackLength: backpack.length,
                nonZeroHotbar,
                nonZeroBackpack,
                hasStone,
                hasBow,
                hasArrows,
                allEmpty: (nonZeroHotbar === 0 && nonZeroBackpack === 0)
            };
        })()
        """)
        print("Empty start test result:", empty_start_test)
        assert empty_start_test and empty_start_test['allEmpty'] is True, f"Inventory is not empty: {empty_start_test}"
        assert empty_start_test['hasStone'] is False, "Player still has stone!"
        assert empty_start_test['hasBow'] is False, "Player still has bow!"
        assert empty_start_test['hasArrows'] is False, "Player still has arrows!"
        print("✓ Gracz zaczyna grę w 100% bez rzeczy (0 bloków, brak kamienia, brak łuku)!")

        # -------------------------------------------------------------
        # TEST 2: Pokonanie Robota -> Drop Żelaza (58) i Linki (57)
        # -------------------------------------------------------------
        print("\n--- TEST 2: Pokonanie Robota -> Drop Żelaza (58) i Linki (57) ---")
        robot_drops_test = eval_js(300, """
        (function() {
            const game = window.game;
            game.drops.items = []; // czyścimy poprzednie dropy na ziemi

            // Spawn Robota
            const robot = game.animals.spawnRobot(32, 32);
            robot.health = 0;
            try {
                robot.die();
            } catch (err) {
                return { error: err.message, stack: err.stack };
            }

            const drops = game.drops.items;
            const hasString = drops.some(d => d.id === 57 && d.name === 'Linka');
            const hasIron = drops.some(d => d.id === 58 && d.name === 'Żelazo');

            return {
                dropCount: drops.length,
                hasString,
                hasIron,
                droppedIds: drops.map(d => ({ id: d.id, name: d.name }))
            };
        })()
        """)
        print("Robot drops test result:", robot_drops_test)
        assert robot_drops_test and robot_drops_test['hasString'] is True, f"Robot did not drop Linka (57): {robot_drops_test}"
        assert robot_drops_test['hasIron'] is True, f"Robot did not drop Żelazo (58): {robot_drops_test}"
        print("✓ Pokonany Robot dropi Żelazo (58) oraz Linkę (57) do stworzenia łuku!")

        # -------------------------------------------------------------
        # TEST 3: Receptura Łuku: Linka nad Patykiem (57 góra, 20 dół)
        # -------------------------------------------------------------
        print("\n--- TEST 3: Nowa receptura Łuku (Linka nad Patykiem w craftingu 2x2) ---")
        bow_craft_test = eval_js(400, """
        (function() {
            const crafting = window.game.crafting;

            // Kolumna 1: Slot 0 (Linka 57), Slot 2 (Patyk 20)
            crafting.clearGrid();
            crafting.setSlot(0, 57); // Linka góra
            crafting.setSlot(2, 20); // Patyk dół
            const out1 = crafting.output ? { id: crafting.output.item.id, name: crafting.output.item.name, count: crafting.output.count } : null;

            // Kolumna 2: Slot 1 (Linka 57), Slot 3 (Patyk 20)
            crafting.clearGrid();
            crafting.setSlot(1, 57); // Linka góra
            crafting.setSlot(3, 20); // Patyk dół
            const out2 = crafting.output ? { id: crafting.output.item.id, name: crafting.output.item.name, count: crafting.output.count } : null;

            // Test negatywny: 3 Patyki (stara receptura) NIE powinna już dawać łuku!
            crafting.clearGrid();
            crafting.setSlot(0, 20);
            crafting.setSlot(1, 20);
            crafting.setSlot(2, 20);
            const outOld = crafting.output ? crafting.output.item.id : null;

            return {
                out1,
                out2,
                outOld,
                craftSuccess: (out1 && out1.id === 29 && out2 && out2.id === 29),
                oldRecipeBlocked: (outOld !== 29)
            };
        })()
        """)
        print("Bow craft test result:", bow_craft_test)
        assert bow_craft_test and bow_craft_test['craftSuccess'] is True, f"Bow crafting failed: {bow_craft_test}"
        assert bow_craft_test['oldRecipeBlocked'] is True, f"Old 3-sticks recipe still produces bow: {bow_craft_test}"
        print("✓ Łuk pomyślnie tworzy się z Linki nad Patykiem (ID 29), a 3 patyki już nie dają łuku!")

        # -------------------------------------------------------------
        # TEST 4: Zebranie i Wytworzenie Łuku przez Gracza
        # -------------------------------------------------------------
        print("\n--- TEST 4: Wytworzenie i pobranie Łuku do ekwipunku ---")
        produce_bow_test = eval_js(500, """
        (function() {
            const ui = window.game.ui;
            const crafting = window.game.crafting;

            // Ustawienie Linki nad Patykiem
            crafting.clearGrid();
            crafting.setSlot(0, 57);
            crafting.setSlot(2, 20);

            // Craft
            const crafted = crafting.craft();
            if (crafted && crafted.item) {
                ui.addItem(crafted.item.id, crafted.item.name, crafted.count);
            }

            const hotbarHasBow = ui.hotbarBlocks.some(s => s.id === 29 && s.count >= 1);
            return {
                craftedId: crafted ? crafted.item.id : null,
                hotbarHasBow
            };
        })()
        """)
        print("Produce bow test result:", produce_bow_test)
        assert produce_bow_test and produce_bow_test['craftedId'] == 29, f"Crafted wrong item: {produce_bow_test}"
        assert produce_bow_test['hotbarHasBow'] is True, "Bow was not added to player hotbar!"
        print("✓ Gracz wytworzył Łuk z Linki i Patyka i otrzymał go do paska podręcznego!")

        print("\n==========================================")
        print("🎉 ALL TESTS PASSED SUCCESSFULLY! 100% OK! 🎉")
        print("==========================================")

    finally:
        try:
            chrome_proc.terminate()
            chrome_proc.wait(timeout=2)
        except:
            pass

if __name__ == '__main__':
    run_test()

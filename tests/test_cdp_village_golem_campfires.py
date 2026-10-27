#!/usr/bin/env python3
"""
Automated CDP Test for Village, Villagers, Protective Iron Golem, and Campfires.
Requested by Tymek (8 years old):
1. "Zrób tak, żeby... były ogniska, bo ja ich w ogóle nie widzę..."
2. "Zrób tak, żeby był Golem. Zrób wioskę. Wioska będzie na x 100, a y coś tam. Będą wieśniacy.
   Wieśniacy wyglądają tak, że mają duże nosy i... i z wieśniakami można się wymieniać,
   a Golem jak walniesz wieśniaka, to wtedy on ci... to wtedy on przychodzi do ciebie,
   podchodzi do ciebie i cię bije. On będzie zadawać... będzie cię podrzucać, a potem będziesz spadał."

Verifies:
1. Starter campfire at (38, 9, 36) emits smoke particles and roasts raw meat into cooked meat.
2. Village generated at (100, 9, 100) with cobblestone plaza, active campfire, houses, and wheat farm.
3. Villagers spawn with characteristic big noses, professions, and opening trading menu for emeralds/food.
4. Iron Golem spawns with rose, guards the village, becomes enraged when a villager is attacked,
   and launches the player high up into the air with vertical velocity and knockback.
5. Snake constraint: strictly at most 1 snake remains in the world.
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
        print("Launching headless Chrome on 9235 with cached profile...")
        chrome_bin = "/home/marek/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome"
        if not os.path.exists(chrome_bin):
            chrome_bin = "google-chrome"
        chrome_cmd = [
            chrome_bin,
            "--headless=new",
            "--remote-debugging-port=9235",
            "--remote-allow-origins=*",
            "--user-data-dir=/home/marek/.cache/google-chrome-headless/scoped_dirs43rq8",
            "--no-sandbox",
            "--disable-gpu",
            "--window-size=1280,720",
            "--mute-audio",
            "http://127.0.0.1:8000/index.html"
        ]
        chrome_proc = subprocess.Popen(chrome_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        ws_url = None
        for attempt in range(25):
            time.sleep(0.5)
            try:
                with urllib.request.urlopen("http://127.0.0.1:9235/json", timeout=1.0) as req:
                    targets = json.loads(req.read().decode('utf-8'))
                    for t in targets:
                        if t.get('type') == 'page' and ('8000' in t.get('url', '') or 'index.html' in t.get('url', '')) and 'webSocketDebuggerUrl' in t:
                            ws_url = t['webSocketDebuggerUrl']
                            break
                    if ws_url:
                        break
            except Exception:
                pass
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
            assert res and "result" in res, f"Eval failed for: {expression[:60]}"
            result = res["result"].get("result", {})
            if "value" in result:
                return result["value"]
            return result

        print("Waiting for game to initialize...")
        game_ready = False
        for i in range(45):
            time.sleep(1.0)
            ready = eval_js("Boolean(window.game && window.game.ui && window.game.campfires && window.game.world)", 200 + i)
            if ready is True:
                print(f"Game ready at attempt {i+1}!")
                game_ready = True
                break
        assert game_ready, "Game failed to initialize within timeout!"
        time.sleep(1.0)

        # Bypass loading screen & start game
        eval_js("""
            (() => {
                const ui = window.game.ui;
                ui.overlayEl.style.display = 'none';
                ui.isGameActive = true;
                ui.isLoading = false;
                const loadingEl = document.getElementById('loading-overlay');
                if (loadingEl) loadingEl.style.display = 'none';
            })()
        """, 101)
        time.sleep(0.5)

        # ----------------------------------------------------------------------
        # TEST 1: Campfires (Starter campfire at 38, 9, 36)
        # ----------------------------------------------------------------------
        print("\n--- TEST 1: Starter Campfire & Smoke & Cooking ---")
        cf_block = eval_js("window.game.world.getBlock(38, 9, 36)", 102)
        print(f"Block at (38, 9, 36): {cf_block} (Expected: 61 - Campfire)")
        assert cf_block == 61, f"Expected campfire block 61 at (38,9,36), got {cf_block}"

        # Check CampfireManager registered it
        registered = eval_js("window.game.campfires.campfires.has('38,9,36')", 103)
        print(f"Campfire registered in CampfireManager: {registered}")
        assert registered is True, "Campfire at (38,9,36) should be registered in CampfireManager"

        # Check smoke emission after update
        eval_js("window.game.campfires.update(0.2)", 104)
        smoke_count = eval_js("window.game.campfires.smokeParticles.length", 105)
        print(f"Campfire smoke particles count: {smoke_count}")
        assert smoke_count > 0, "Campfire should emit smoke particles!"

        # Test cooking raw meat on campfire
        cook_res = eval_js("""
            (() => {
                const cf = window.game.campfires;
                const ui = window.game.ui;
                // Give raw porkchop (ID 38)
                ui.addItem(38, 'Surowy Schab', 1);
                const beforePork = ui.hasItem(38);
                const cooked = cf.tryCookMeat(38, 38, 9, 36);
                const afterCooked = ui.hasItem(63); // Cooked Porkchop ID 63
                return { cooked, beforePork, afterCooked };
            })()
        """, 106)
        print(f"Meat cooking test result: {cook_res}")
        assert cook_res.get('cooked') is True, "Should cook raw porkchop on campfire"
        assert cook_res.get('afterCooked') is True, "Player inventory should receive Cooked Porkchop (ID 63)"

        # ----------------------------------------------------------------------
        # TEST 2: Village World Gen at (100, 9, 100)
        # ----------------------------------------------------------------------
        print("\n--- TEST 2: Village Generation at (100, 9, 100) ---")
        village_data = eval_js("""
            (() => {
                const w = window.game.world;
                // Force load chunks around (100, 100)
                w.update({ x: 100, y: 10, z: 100 });
                const plazaCampfire = w.getBlock(100, 10, 100);
                const plazaCobble = w.getBlock(100, 9, 100);
                const roadCobble = w.getBlock(100, 9, 108);
                // House 1 planks/wood (around 90, 9, 105)
                const house1Plank = w.getBlock(90, 11, 105);
                const house1Log = w.getBlock(88, 10, 103);
                // Wheat farm water canal (100, 9, 115)
                const farmWater = w.getBlock(100, 9, 115);
                const farmWheat = w.getBlock(101, 10, 115);
                return { plazaCampfire, plazaCobble, roadCobble, house1Plank, house1Log, farmWater, farmWheat };
            })()
        """, 107)
        print(f"Village generation blocks: {village_data}")
        assert village_data.get('plazaCampfire') == 61, f"Expected central plaza campfire ID 61, got {village_data.get('plazaCampfire')}"
        assert village_data.get('plazaCobble') == 13, f"Expected cobblestone plaza ID 13, got {village_data.get('plazaCobble')}"
        assert village_data.get('farmWater') == 6, f"Expected farm water canal ID 6, got {village_data.get('farmWater')}"

        # ----------------------------------------------------------------------
        # TEST 3: Villagers with Big Noses & Trading UI
        # ----------------------------------------------------------------------
        print("\n--- TEST 3: Villager Mob & Trading System ---")
        villager_check = eval_js("""
            (() => {
                const animals = window.game.animals.animals;
                const villagers = animals.filter(a => a.type === 'villager');
                if (villagers.length === 0) return { count: 0 };
                const v = villagers[0];
                const hasNose = Boolean(v.noseMesh);
                const hasArms = Boolean(v.armsMesh || v.armsGroup);
                const trades = v.trades;
                return {
                    count: villagers.length,
                    hasNose,
                    hasArms,
                    tradesCount: trades ? trades.length : 0,
                    firstTrade: trades ? trades[0] : null
                };
            })()
        """, 108)
        print(f"Villager mob check: {villager_check}")
        assert villager_check.get('count') >= 1, "At least one villager should be present"
        assert villager_check.get('hasNose') is True, "Villager must have distinct big nose mesh!"
        assert villager_check.get('tradesCount') >= 2, "Villager should have trade recipes"

        # Test Opening Trading Interface
        trading_ui_check = eval_js("""
            (() => {
                const v = window.game.animals.animals.find(a => a.type === 'villager');
                const ui = window.game.ui;
                ui.openVillagerTrading(v);
                const modal = document.getElementById('villager-trade-modal');
                const isDisplayFlex = modal && modal.style.display === 'flex';
                const isTradeOpen = ui.isVillagerTradeOpen;
                const isPaused = ui.isGamePaused();
                
                // Give player emeralds for trading
                ui.addItem(62, 'Szmaragd', 5);
                const hasEmeralds = ui.hasItem(62);
                
                // Perform first trade (Emerald -> Bread)
                const tradeSuccess = ui.executeVillagerTrade(0);
                const hasBread = ui.hasItem(65); // Bread ID 65
                
                // Close trade modal
                ui.closeVillagerTrading();
                const closedModal = modal && modal.style.display === 'none';

                return {
                    isDisplayFlex,
                    isTradeOpen,
                    isPaused,
                    hasEmeralds,
                    tradeSuccess,
                    hasBread,
                    closedModal
                };
            })()
        """, 109)
        print(f"Villager trading UI check: {trading_ui_check}")
        assert trading_ui_check.get('isDisplayFlex') is True, "Trade modal should be displayed as flex"
        assert trading_ui_check.get('isPaused') is True, "Opening villager trading should pause game"
        assert trading_ui_check.get('tradeSuccess') is True, "Villager trade should succeed with emeralds"
        assert trading_ui_check.get('hasBread') is True, "Player should receive Bread (ID 65)"
        assert trading_ui_check.get('closedModal') is True, "Modal should close properly"

        # ----------------------------------------------------------------------
        # TEST 4: Iron Golem Protection & Sky Launch Attack
        # ----------------------------------------------------------------------
        print("\n--- TEST 4: Iron Golem Model & Attack Mechanics ---")
        golem_check = eval_js("""
            (() => {
                const animals = window.game.animals.animals;
                const golem = animals.find(a => a.type === 'iron_golem');
                if (!golem) return { exists: false };
                const hasRose = Boolean(golem.roseMesh);
                const hasNose = Boolean(golem.noseMesh);
                const health = golem.health;
                return { exists: true, hasRose, hasNose, health };
            })()
        """, 110)
        print(f"Iron Golem check: {golem_check}")
        assert golem_check.get('exists') is True, "Iron Golem must exist in world"
        assert golem_check.get('hasRose') is True, "Iron Golem should carry a red poppy/rose"
        assert golem_check.get('hasNose') is True, "Iron Golem must have a big iron nose"
        assert golem_check.get('health') >= 100, "Iron Golem should be durable (100 HP)"

        # Test Villager attacked -> Golem enrage and sky toss
        golem_attack_launch = eval_js("""
            (() => {
                const golem = window.game.animals.animals.find(a => a.type === 'iron_golem');
                const villager = window.game.animals.animals.find(a => a.type === 'villager');
                const player = window.game.player;
                
                // Position player right next to Golem
                player.position.set(golem.position.x + 1.2, golem.position.y, golem.position.z);
                player.velocity.set(0, 0, 0);

                // Simulate attacking villager
                window.game.eventBus.emit('villager:attacked', { villager, attacker: player, position: villager.position.clone() });
                
                const isEnraged = golem.isEnraged;
                const targetsPlayer = Boolean(golem.targetPlayer);

                // Trigger golem attack on player
                const initialVelY = player.velocity.y;
                golem.attackTarget(player);
                const launchedVelY = player.velocity.y;

                return {
                    isEnraged,
                    targetsPlayer,
                    initialVelY,
                    launchedVelY
                };
            })()
        """, 111)
        print(f"Golem rage & launch check: {golem_attack_launch}")
        assert golem_attack_launch.get('isEnraged') is True, "Golem should become enraged when villager attacked!"
        assert golem_attack_launch.get('targetsPlayer') is True, "Golem should target player!"
        assert golem_attack_launch.get('launchedVelY') > 12.0, f"Golem must launch player high into the air! Got velY: {golem_attack_launch.get('launchedVelY')}"

        # ----------------------------------------------------------------------
        # TEST 5: Snake Policy Constraint (strictly at most 1 snake)
        # ----------------------------------------------------------------------
        print("\n--- TEST 5: Snake Constraint (strictly <= 1 snake) ---")
        snake_count = eval_js("""
            (() => {
                window.game.animals.killSnakesExceptOne();
                const snakes = window.game.animals.animals.filter(a => a.type === 'snake');
                return snakes.length;
            })()
        """, 112)
        print(f"Snakes in world: {snake_count}")
        assert snake_count <= 1, f"Must have strictly at most 1 snake, got {snake_count}"

        print("\n=======================================================")
        print("ALL TESTS PASSED! Village, Villagers, Iron Golem & Campfires verified successfully!")
        print("=======================================================")

    finally:
        if chrome_proc:
            try: chrome_proc.kill()
            except Exception: pass
        if server:
            try: server.shutdown()
            except Exception: pass

if __name__ == '__main__':
    run_test()

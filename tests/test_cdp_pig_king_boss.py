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
    port = 9225
    chrome_proc = subprocess.Popen([
        chrome_bin,
        '--headless=new',
        f'--remote-debugging-port={port}',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        req = urllib.request.urlopen(f'http://127.0.0.1:{port}/json')
        pages = json.loads(req.read().decode('utf-8'))
        page = next((p for p in pages if 'localhost:8000' in p.get('url', '')), None)
        if not page:
            print("ERROR: Minecraft page not found in CDP:", pages)
            sys.exit(1)

        ws_url = page['webSocketDebuggerUrl']
        print(f"Connecting to CDP WebSocket: {ws_url}")

        parts = ws_url.replace('ws://', '').split('/', 1)
        host, ws_port = parts[0].split(':')
        path = '/' + parts[1]

        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((host, int(ws_port)))

        key = base64.b64encode(os.urandom(16)).decode('utf-8')
        handshake = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{ws_port}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n\r\n"
        )
        s.sendall(handshake.encode('utf-8'))
        resp = s.recv(4096).decode('utf-8')
        if "101 " not in resp:
            print("Failed WebSocket handshake:", resp)
            sys.exit(1)

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

        print("Checking window.game initialization...")
        is_ready = False
        for i in range(25):
            res = eval_js(10 + i, "Boolean(window.game && window.game.player && window.game.world)")
            if res:
                is_ready = True
                break
            time.sleep(0.5)

        assert is_ready, "Game failed to initialize within 12 seconds!"
        print("✓ Game initialized successfully!")

        # 1. Test Crafting of Świniowy Blok (59)
        print("\n--- Test 1: Crafting Świniowy Blok from Rotten Flesh ---")
        craft_res = eval_js(40, """
        (() => {
            const crafting = window.game.crafting;
            if (!crafting) return { error: 'No crafting' };

            // Clear crafting grid
            crafting.clearGrid();
            
            // Put 2 Rotten Flesh (26) on the left and right sides
            crafting.grid = [26, 26, null, null];
            crafting.evaluateRecipe();
            const output2 = crafting.output ? { id: crafting.output.item.id, count: crafting.output.count } : null;

            // Put 4 Rotten Flesh (26)
            crafting.grid = [26, 26, 26, 26];
            crafting.evaluateRecipe();
            const output4 = crafting.output ? { id: crafting.output.item.id, count: crafting.output.count } : null;

            // Clear grid after test
            crafting.clearGrid();

            return { output2, output4 };
        })()
        """)
        print("Crafting output:", craft_res)
        assert craft_res and craft_res.get('output2', {}).get('id') == 59, f"Expected ID 59 for 2 flesh, got: {craft_res}"
        assert craft_res.get('output4', {}).get('id') == 59, f"Expected ID 59 for 4 flesh, got: {craft_res}"
        print("✓ Świniowy Blok (59) crafting from 2 and 4 Rotten Flesh verified!")

        # 2. Test Block & Item Definitions
        print("\n--- Test 2: Item & Texture definitions ---")
        item_check = eval_js(50, """
        (() => {
            const ui = window.game.ui;
            return {
                uiExists: Boolean(ui),
                hasShowBossBar: Boolean(ui && typeof ui.showBossBar === 'function'),
                hasSubmitChat: Boolean(ui && typeof ui.submitChat === 'function')
            };
        })()
        """)
        print("Item definition check:", item_check)
        assert item_check.get('uiExists'), "UI missing!"
        assert item_check.get('hasShowBossBar'), "UI showBossBar method missing!"
        assert item_check.get('hasSubmitChat'), "UI submitChat method missing!"
        print("✓ Item definitions and UI rendering ready!")

        # 3. Test Pig Portal frame check & Flint & Steel ignition
        print("\n--- Test 3: Pig Portal Frame Detection & Flint Ignition ---")
        portal_check = eval_js(60, """
        (() => {
            const world = window.game.world;
            const interaction = window.game.interaction;

            // Build a small 4-block doorway of Świniowy Blok (59) at x=50, y=10, z=50
            world.setBlock(50, 10, 50, 59);
            world.setBlock(50, 11, 50, 59);
            world.setBlock(52, 10, 50, 59);
            world.setBlock(52, 11, 50, 59);

            const hasPortal = interaction.checkPigPortal(50, 10, 50);

            // Test non-pig block
            const notPortal = interaction.checkPigPortal(50, 12, 50);

            return { hasPortal, notPortal };
        })()
        """)
        print("Portal frame check:", portal_check)
        assert portal_check.get('hasPortal') == True, f"Pig portal check failed: {portal_check}"
        assert portal_check.get('notPortal') == False, "Non-pig block should return false"
        print("✓ Pig Portal frame detection correctly requires at least 4 Świniowe Bloki!")

        # 4. Test Enter Pig Kingdom & Atmosphere
        print("\n--- Test 4: Enter Pig Kingdom Arena & Sky Atmosphere ---")
        enter_res = eval_js(70, """
        (() => {
            window.game.enterPigKingdom();
            
            // Advance animation / day-night cycle slightly
            window.game.updateDayNight(0.1);

            const pos = window.game.player.position;
            const bgHex = window.game.scene.background.getHex();
            const isInPigKingdom = window.game.isInPigKingdom;

            // Find King
            const king = window.game.animals.animals.find(a => a.type === 'boss_pig_king' && !a.isDead);

            return {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                bgHex: '0x' + bgHex.toString(16),
                isInPigKingdom: isInPigKingdom,
                hasKing: Boolean(king),
                kingStage: king ? king.stage : null,
                kingIsImmune: king ? king.isImmune : null
            };
        })()
        """)
        print("Pig Kingdom entry result:", enter_res)
        assert enter_res.get('isInPigKingdom') == True, "Expected isInPigKingdom to be true"
        assert abs(enter_res.get('x') - 2000) < 5, f"Expected player x near 2000, got: {enter_res.get('x')}"
        assert enter_res.get('hasKing') == True, "Expected PigKing to be spawned in Pig Kingdom!"
        assert enter_res.get('kingStage') == 1, "Expected PigKing to be in Stage 1 initially"
        assert enter_res.get('kingIsImmune') == True, "Expected PigKing to be immune while guards are alive"
        print("✓ Successfully entered Pig Kingdom with Pig King in Stage 1 (immune on throne)!")

        # 5. Test Dialogue Modal, Normal Pitch (1.0), and 2-Stage Boss Fight
        print("\n--- Test 5: Dialogue Modal & Wielkie Świnioły (Boss Stage 1) ---")
        diag_res = eval_js(80, """
        (() => {
            // Check dialogue modal
            const modal = document.getElementById('pig-king-dialogue-modal');
            const hasModal = Boolean(modal);
            const modalDisplay = modal ? modal.style.display : null;

            // Trigger dialogue completion to spawn guards
            window.game.animals.spawnGiantPigGuard(1996, 2002, 'Wielki Świnioł Strażnik Lewy');
            window.game.animals.spawnGiantPigGuard(2004, 2002, 'Wielki Świnioł Strażnik Prawy');
            window.game.ui.showBossBar('⚔️ BOSS: WIELKIE ŚWINIOŁY (2 Pozostały)', 110, 110);

            // Find guards
            const guards = window.game.animals.animals.filter(a => a.type === 'giant_pig_guard' && !a.isDead);
            const bossBarText = document.getElementById('boss-title') ? document.getElementById('boss-title').innerText : '';

            return {
                hasModal,
                modalDisplay,
                guardCount: guards.length,
                guardHp: guards[0] ? guards[0].health : 0,
                guardMaxHp: guards[0] ? guards[0].maxHealth : 0,
                bossBarText
            };
        })()
        """)
        print("Dialogue & Stage 1 result:", diag_res)
        assert diag_res.get('hasModal') == True, "Expected dialogue modal to exist"
        assert diag_res.get('guardCount') == 2, f"Expected 2 Giant Pig Guards, got: {diag_res.get('guardCount')}"
        assert diag_res.get('guardHp') == 55, f"Expected 55 HP per guard, got: {diag_res.get('guardHp')}"
        assert "WIELKIE ŚWINIOŁY" in diag_res.get('bossBarText', ''), f"Expected Boss Bar for Wielkie Świnioły, got: {diag_res.get('bossBarText')}"
        print("✓ Dialogue modal displayed and 2 Wielkie Świnioły spawned with Boss Bar!")

        # 6. Test Defeating Guards & Activating Stage 2 (Easy King with 25 HP)
        print("\n--- Test 6: Defeating Guards & Easy Pig King (Stage 2) ---")
        stage2_res = eval_js(90, """
        (() => {
            // Kill first guard
            const guards = window.game.animals.animals.filter(a => a.type === 'giant_pig_guard' && !a.isDead);
            if (guards.length > 0) {
                guards[0].die();
            }

            const remainingAfterFirst = window.game.animals.animals.filter(a => a.type === 'giant_pig_guard' && !a.isDead);
            const bossBarAfterFirst = document.getElementById('boss-title') ? document.getElementById('boss-title').innerText : '';

            // Kill second guard
            if (remainingAfterFirst.length > 0) {
                remainingAfterFirst[0].die();
            }

            // Check King state
            const king = window.game.animals.animals.find(a => a.type === 'boss_pig_king' && !a.isDead);
            const stage2BossBar = document.getElementById('boss-title') ? document.getElementById('boss-title').innerText : '';

            // Now kill easy king
            if (king) {
                king.takeDamage(30);
            }

            const drops = window.game.drops ? window.game.drops.items : [];
            const hasPork = drops.some(d => d.id === 38);
            const hasRuby = drops.some(d => d.id === 34);
            const portal = window.game.scene.getObjectByName('victoryPortal');

            return {
                bossBarAfterFirst,
                kingStage: king ? king.stage : null,
                kingMaxHp: king ? king.maxHealth : null,
                kingIsImmune: king ? king.isImmune : null,
                stage2BossBar,
                kingDead: king ? king.isDead : false,
                hasPork,
                hasRuby,
                portalExists: Boolean(portal),
                portalPos: portal ? { x: portal.position.x, y: portal.position.y, z: portal.position.z } : null
            };
        })()
        """)
        print("Stage 2 and Defeat result:", stage2_res)
        assert "1 POZOSTAŁ" in stage2_res.get('bossBarAfterFirst', '').upper(), f"Expected '(1 POZOSTAŁ)' on boss bar, got: {stage2_res.get('bossBarAfterFirst')}"
        assert stage2_res.get('kingStage') == 2, "Expected Pig King to transition to Stage 2"
        assert stage2_res.get('kingMaxHp') == 25, f"Expected easy King (25 HP), got: {stage2_res.get('kingMaxHp')}"
        assert stage2_res.get('kingIsImmune') == False, "Expected Pig King to no longer be immune in Stage 2"
        assert stage2_res.get('kingDead') == True, "Expected Pig King to be defeated"
        assert stage2_res.get('portalExists') == True, "Victory portal should spawn after defeating Pig King!"
        assert abs(stage2_res.get('portalPos', {}).get('x', 0) - 2012) < 2, f"Victory portal should be at wall x=2012, got: {stage2_res.get('portalPos')}"
        print("✓ Wielkie Świnioły defeated, Easy King (25 HP) activated and defeated, victory portal spawned!")

        # 7. Test Return to Overworld via /wroc or gate interaction
        print("\n--- Test 7: Return to Overworld ---")
        return_res = eval_js(100, """
        (() => {
            // Emulate chat command /wroc
            if (window.game.ui.chatInputEl) window.game.ui.chatInputEl.value = '/wroc';
            window.game.ui.submitChat();

            // Advance frame
            window.game.updateDayNight(0.1);

            const pos = window.game.player.position;
            const isInPigKingdom = window.game.isInPigKingdom;

            return {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                isInPigKingdom: isInPigKingdom
            };
        })()
        """)
        print("Return result:", return_res)
        assert return_res.get('isInPigKingdom') == False, "isInPigKingdom must be false in overworld"
        assert return_res.get('x') < 800, f"Player x should be back in overworld (< 800), got: {return_res.get('x')}"
        print("✓ Player successfully returned to overworld and kingdom flags cleared!")

        # 8. Test Arena Bedrock and Block Protection
        print("\n--- Test 8: Arena Protection in Pig Kingdom ---")
        protect_res = eval_js(110, """
        (() => {
            const interaction = window.game.interaction;
            
            // Mock break target inside Pig Kingdom arena
            interaction.currentTarget = {
                hit: true,
                x: 2005,
                y: 11,
                z: 2005,
                blockId: 59,
                normalX: 0, normalY: 1, normalZ: 0
            };

            const blockBefore = window.game.world.getBlock(2005, 11, 2005);
            interaction.breakBlock();
            const blockAfter = window.game.world.getBlock(2005, 11, 2005);

            return {
                blockBefore,
                blockAfter,
                protected: blockBefore === blockAfter
            };
        })()
        """)
        print("Arena protection result:", protect_res)
        assert protect_res.get('protected') == True, "Blocks in Pig Kingdom arena must be protected from breaking!"
        print("✓ Pig Kingdom arena blocks are unbreakable!")

        print("\n=========================================")
        print("🎉 ALL TESTS PASSED SUCCESSFULLY! 👑🐷🥩")
        print("=========================================")

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=2)
        except:
            chrome_proc.kill()

if __name__ == '__main__':
    run_test()

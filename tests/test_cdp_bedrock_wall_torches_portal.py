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
        '--remote-debugging-port=9225',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        req = urllib.request.urlopen('http://127.0.0.1:9225/json')
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
            ready = eval_js(100 + i, "Boolean(window.game && window.game.ui && window.game.world)")
            if ready:
                print(f"Game ready at attempt {i+1}")
                break
            time.sleep(0.5)

        # -------------------------------------------------------------
        # TEST 1: Wysoka ściana z Bedrocka (100% bedrock, 8 bloków wysokości)
        # -------------------------------------------------------------
        print("\n--- TEST 1: Ściana areny z Bedrocka (8 bloków wysokości, y=12..19) ---")
        wall_test = eval_js(200, """
        (function() {
            const game = window.game;
            // Pre-generowanie chunków areny
            game.enterDarkDimension();

            const world = game.world;
            const floorY = 11;
            const wallAngles = [0, Math.PI / 4, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
            const radius = 14.2;

            let allBedrock = true;
            let checkedCount = 0;
            const heightChecks = [];

            for (const angle of wallAngles) {
                const wx = Math.floor(1000 + Math.cos(angle) * radius);
                const wz = Math.floor(1000 + Math.sin(angle) * radius);

                for (let y = floorY + 1; y <= floorY + 8; y++) {
                    const blockId = world.getBlock(wx, y, wz);
                    checkedCount++;
                    if (blockId !== 14) { // 14 to BEDROCK
                        allBedrock = false;
                        heightChecks.push({ wx, y, wz, expected: 14, got: blockId });
                    }
                }

                // Nad ścianą na poziomie y=20 (floorY + 9) znajduje się dach z Bedrocka (14) lub bloków piorunowych (53)
                const roofBlock = world.getBlock(wx, floorY + 9, wz);
                if (roofBlock !== 14 && roofBlock !== 53) {
                    allBedrock = false;
                    heightChecks.push({ wx, y: floorY + 9, wz, expected: '14 or 53 (roof)', got: roofBlock });
                }
                // Ponad dachem (floorY + 10) jest otwarte powietrze (0)
                const aboveRoof = world.getBlock(wx, floorY + 10, wz);
                if (aboveRoof !== 0) {
                    allBedrock = false;
                    heightChecks.push({ wx, y: floorY + 10, wz, expected: 0, got: aboveRoof });
                }
            }

            return {
                allBedrock,
                checkedCount,
                heightChecks: heightChecks.slice(0, 5)
            };
        })()
        """)
        print("Bedrock wall test result:", wall_test)
        assert wall_test and wall_test['allBedrock'] is True, f"Bedrock wall failed: {wall_test}"
        assert wall_test['checkedCount'] >= 40, f"Expected at least 40 wall blocks checked, got {wall_test['checkedCount']}"
        print(f"✓ Ściana z Bedrocka jest solidna i ma pełne 8 bloków wysokości (sprawdzono {wall_test['checkedCount']} bloków)!")

        # -------------------------------------------------------------
        # TEST 2: Małe pochodnie na ścianie areny
        # -------------------------------------------------------------
        print("\n--- TEST 2: Małe pochodnie na ścianie areny (16 pochodni ze światłem i płomieniem) ---")
        torches_test = eval_js(300, """
        (function() {
            const game = window.game;
            const torches = game.arenaTorches;
            if (!torches || torches.length !== 16) {
                return { success: false, reason: 'torches count is ' + (torches ? torches.length : 0) };
            }

            let validTorches = 0;
            for (const t of torches) {
                if (t.group && t.group.parent === game.scene && t.light && t.flame) {
                    const distFromCenter = Math.hypot(t.group.position.x - 1000, t.group.position.z - 1000);
                    if (Math.abs(distFromCenter - 13.6) < 0.5 && Math.abs(t.group.position.y - 14.5) < 0.5) {
                        validTorches++;
                    }
                }
            }

            return {
                success: validTorches === 16,
                validTorches,
                totalTorches: torches.length
            };
        })()
        """)
        print("Torches test result:", torches_test)
        assert torches_test and torches_test['success'] is True, f"Torches test failed: {torches_test}"
        print(f"✓ 16 małych pochodni z ciepłym światłem umieszczonych na ścianie z Bedrocka!")

        # -------------------------------------------------------------
        # TEST 3: Portal powrotu do gry po przejściu bossa (stały, bez samoczynnego wygasania)
        # -------------------------------------------------------------
        print("\n--- TEST 3: Portal powrotu do gry po bossie (Bedrock + Złoto, promień w niebo, brak timeoutu) ---")
        portal_spawn_test = eval_js(400, """
        (function() {
            const game = window.game;
            let boss = game.animals.animals.find(a => a.type === 'boss_robot');
            if (!boss) {
                boss = game.animals.spawnBossRobot(1000, 1000);
            }

            // Ustaw gracza w odległości 10m od portalu (aby nie wszedł od razu)
            game.player.position.set(1010, 12, 1000);

            // Pokonanie bossa
            boss.die();

            const portal = game.scene.getObjectByName('victoryPortal');
            if (!portal) {
                return { success: false, reason: 'victoryPortal mesh group not found in scene' };
            }

            let hasFramePillars = false;
            let hasGoldCorners = false;
            let hasSkyBeam = false;
            let hasVortex = false;
            let hasPointLight = false;

            portal.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry && child.geometry.type === 'CylinderGeometry' && child.geometry.parameters.height >= 30) {
                        hasSkyBeam = true;
                    }
                    if (child.material && child.material.color && child.material.color.getHex() === 0x9333ea) {
                        hasVortex = true;
                    }
                    if (child.material && child.material.color && child.material.color.getHex() === 0xf59e0b) {
                        hasGoldCorners = true;
                    }
                    if (child.material && child.material.color && child.material.color.getHex() === 0x222226) {
                        hasFramePillars = true;
                    }
                }
                if (child.isPointLight) {
                    hasPointLight = true;
                }
            });

            return {
                success: (hasSkyBeam && hasVortex && hasGoldCorners && hasFramePillars && hasPointLight),
                hasSkyBeam,
                hasVortex,
                hasGoldCorners,
                hasFramePillars,
                hasPointLight,
                isInDarkDimension: game.isInDarkDimension
            };
        })()
        """)
        print("Portal spawn test result:", portal_spawn_test)
        assert portal_spawn_test and portal_spawn_test['success'] is True, f"Portal structure failed: {portal_spawn_test}"
        print("✓ Portal powrotu do gry pojawił się z ramą z Bedrocka, złotem, promieniami i wirem!")

        # -------------------------------------------------------------
        # TEST 4: Portal nie wyrzuca gracza automatycznie z czasem (czeka na wejście)
        # -------------------------------------------------------------
        print("\n--- TEST 4: Portal nie wyrzuca gracza automatycznie po 2 sekundach ---")
        time.sleep(2.0)
        still_in_arena_test = eval_js(500, """
        (function() {
            const game = window.game;
            const portal = game.scene.getObjectByName('victoryPortal');
            return {
                isInDarkDimension: game.isInDarkDimension,
                portalStillActive: Boolean(portal && portal.parent)
            };
        })()
        """)
        print("Still in arena test result:", still_in_arena_test)
        assert still_in_arena_test and still_in_arena_test['isInDarkDimension'] is True, "Player was unexpectedly kicked from arena!"
        assert still_in_arena_test['portalStillActive'] is True, "Portal prematurely vanished!"
        print("✓ Portal stabilnie czeka na gracza i nie teleportuje go na siłę!")

        # -------------------------------------------------------------
        # TEST 5: Wejście w portal przenosi gracza z powrotem do normalnego świata
        # -------------------------------------------------------------
        print("\n--- TEST 5: Wejście w bramę pod ścianą i bezpieczny powrót do świata gry ---")
        enter_portal_test = eval_js(600, """
        (function() {
            const game = window.game;
            // Gracz podchodzi do bramy pod ścianą na (1012, 12, 1000)
            const portal = game.scene.getObjectByName('victoryPortal');
            if (portal) {
                game.player.position.set(portal.position.x, 12, portal.position.z);
            } else {
                game.player.position.set(1012, 12, 1000);
            }
            return { entered: true };
        })()
        """)
        time.sleep(0.6)

        return_result = eval_js(700, """
        (function() {
            const game = window.game;
            const portal = game.scene.getObjectByName('victoryPortal');
            return {
                isInDarkDimension: game.isInDarkDimension,
                playerX: game.player.position.x,
                playerZ: game.player.position.z,
                portalCleanedUp: !Boolean(portal && portal.parent),
                torchesCleanedUp: (game.arenaTorches.length === 0)
            };
        })()
        """)
        print("Return result:", return_result)
        assert return_result and return_result['isInDarkDimension'] is False, f"Expected return to overworld, got {return_result}"
        assert return_result['playerX'] < 800, f"Expected overworld X < 800, got {return_result['playerX']}"
        assert return_result['portalCleanedUp'] is True, "Portal was not cleaned up after return"
        assert return_result['torchesCleanedUp'] is True, "Arena torches were not cleaned up after exit"
        print(f"✓ Gracz pomyślnie powrócił do gry ze zdobytymi skarbami (x={return_result['playerX']:.1f}, z={return_result['playerZ']:.1f})!")

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

#!/usr/bin/env python3
"""
End-to-End CDP Test: Boss Robot Druga Wersja (Faza 2)
1. Transformacja z Fazy 1 w Fazę 2 (240 HP, nowy Boss Bar).
2. 12 Ramion: dokładnie 6 po prawej i 6 po lewej stronie z mieczami i blasterami.
3. Odporność na Kolorowe Przedmioty: Kolorowy Miecz (54), Kolorowa Strzała (56), Różdżka (50) zadają 0 DMG. Diamentowy Miecz zadaje normalny DMG.
4. Utrudnienie: Gracz za każdym uderzeniem w Bossa Fazy 2 zostaje obrócony tyłem (180 stopni).
5. Ostateczne pokonanie Fazy 2, epicki drop i portal powrotu.
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
        # 1. Start dev server on port 8000
        print("Starting dev server...")
        server_proc = subprocess.Popen(
            ["python3", "-m", "http.server", "8000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd="/home/marek/ai projects/m2"
        )
        time.sleep(1.2)

        # 2. Launch headless Chrome with remote debugging on port 9222
        print("Launching headless Chrome...")
        chrome_cmd = [
            "google-chrome",
            "--headless=new",
            "--remote-debugging-port=9222",
            "--no-sandbox",
            "--disable-gpu",
            "--mute-audio",
            "http://localhost:8000/"
        ]
        chrome_proc = subprocess.Popen(chrome_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        time.sleep(2.0)

        # 3. Connect to CDP
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

        # Connect WebSocket directly
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

        send_cdp(1, "Page.enable")
        recv_cdp(1)
        send_cdp(2, "Runtime.enable")
        recv_cdp(2)

        def eval_js(cmd_id, expr):
            send_cdp(cmd_id, "Runtime.evaluate", {
                "expression": expr,
                "returnByValue": True
            })
            resp = recv_cdp(cmd_id)
            if resp and 'result' in resp and 'result' in resp['result']:
                if 'value' in resp['result']['result']:
                    return resp['result']['result'].get('value')
            print(f"[CDP Eval Error id={cmd_id}]:", resp)
            return None

        # Wait for window.game
        print("Waiting for game window.game...")
        for attempt in range(25):
            res = eval_js(100 + attempt, "typeof window.game !== 'undefined' && window.game.ui !== null")
            if res is True:
                print(f"Game ready at attempt {attempt + 1}")
                break
            time.sleep(0.5)

        # -------------------------------------------------------------
        # TEST 1: Phase 1 to Phase 2 Transformation
        # -------------------------------------------------------------
        print("\n--- TEST 1: Boss Robot Phase 1 to Phase 2 Transition ---")
        trans_test = eval_js(200, """
        (function() {
            const game = window.game;
            // Spawn Boss Phase 1
            const boss = game.animals.spawnBossRobot(1000, 1000);
            boss.isAwakening = false;
            const initialPhase = boss.isPhase2;
            const hpPhase1 = boss.health;

            // Attack Boss to 0 HP with normal weapon
            boss.onAttacked(hpPhase1, { x: 1000, y: 12, z: 995 }, 30); // Diamond

            const transformedPhase = boss.isPhase2;
            const hpPhase2 = boss.health;
            const maxHpPhase2 = boss.maxHealth;
            const isDead = boss.isDead;
            const bossHudText = document.getElementById('boss-title') ? document.getElementById('boss-title').innerText : '';

            boss.die();

            return {
                initialPhase,
                transformedPhase,
                hpPhase2,
                maxHpPhase2,
                isDead,
                bossHudText
            };
        })()
        """)
        print("Transformation Result:", trans_test)
        assert trans_test and trans_test.get('initialPhase') is False, f"Boss did not start in Phase 1: {trans_test}"
        assert trans_test.get('transformedPhase') is True, f"Boss did NOT transform to Phase 2: {trans_test}"
        assert trans_test.get('hpPhase2') == 240, f"Boss Phase 2 HP not 240: {trans_test}"
        assert trans_test.get('maxHpPhase2') == 240, f"Boss Phase 2 Max HP not 240: {trans_test}"
        assert trans_test.get('isDead') is False, f"Boss died instead of transforming to Phase 2: {trans_test}"
        assert "FAZA 2" in trans_test.get('bossHudText', ''), f"Boss HUD does not indicate Phase 2: {trans_test}"
        print("✓ Boss Robot transitions from Phase 1 to Phase 2 with 240 HP and updated Boss Bar!")

        # -------------------------------------------------------------
        # TEST 2: 12 Arms Verification (6 Right + 6 Left)
        # -------------------------------------------------------------
        print("\n--- TEST 2: Boss Robot Phase 2 exactly 12 Arms (6 Left, 6 Right) ---")
        arms_test = eval_js(201, """
        (function() {
            const game = window.game;
            const boss = game.animals.spawnBossRobotPhase2(1000, 1000);

            const totalArms = boss.arms ? boss.arms.length : 0;
            const rightArms = boss.armsPhase2Right ? boss.armsPhase2Right.length : 0;
            const leftArms = boss.armsPhase2Left ? boss.armsPhase2Left.length : 0;

            let allArmsValid = true;
            boss.arms.forEach(arm => {
                if (!arm || !arm.children || arm.children.length === 0) allArmsValid = false;
            });

            boss.die();

            return {
                totalArms,
                rightArms,
                leftArms,
                allArmsValid
            };
        })()
        """)
        print("12 Arms Verification Result:", arms_test)
        assert arms_test and arms_test.get('totalArms') == 12, f"Total arms count is not 12: {arms_test}"
        assert arms_test.get('rightArms') == 6, f"Right side arms count is not 6: {arms_test}"
        assert arms_test.get('leftArms') == 6, f"Left side arms count is not 6: {arms_test}"
        assert arms_test.get('allArmsValid') is True, f"Some arms have missing meshes: {arms_test}"
        print("✓ Boss Robot Phase 2 has exactly 12 arms (6 on left, 6 on right) equipped with swords and blasters!")

        # -------------------------------------------------------------
        # TEST 3: Rainbow / Color Items Immunity vs Normal Weapons
        # -------------------------------------------------------------
        print("\n--- TEST 3: Immunity to Rainbow / Color Items vs Vulnerability to Normal Items ---")
        immunity_test = eval_js(202, """
        (function() {
            const game = window.game;
            const boss = game.animals.spawnBossRobotPhase2(1000, 1000);
            boss.isAwakening = false;

            const hpStart = boss.health; // 240

            // 1. Hit with Kolorowy Miecz (ID 54) -> Should do 0 DMG!
            boss.onAttacked(25, { x: 1000, y: 12, z: 995 }, 54);
            const hpAfterRainbowSword = boss.health;

            // 2. Hit with Magiczna Kolorowa Strzała (ID 56) -> Should do 0 DMG!
            boss.onAttacked(50, { x: 1000, y: 12, z: 995 }, 56);
            const hpAfterRainbowArrow = boss.health;

            // 3. Hit with Magiczna Różdżka (ID 50) -> Should do 0 DMG!
            boss.onAttacked(16, { x: 1000, y: 12, z: 995 }, 50);
            const hpAfterWand = boss.health;

            // 4. Hit with Kolorowy Łuk (ID 55) -> Should do 0 DMG!
            boss.onAttacked(24, { x: 1000, y: 12, z: 995 }, 55);
            const hpAfterRainbowBow = boss.health;

            // 5. Hit with Diamentowy Miecz (ID 34) -> Should deal normal damage (e.g. 15)!
            boss.onAttacked(15, { x: 1000, y: 12, z: 995 }, 34);
            const hpAfterDiamondSword = boss.health;

            // 6. Hit with Laserowy Miecz (ID 47) -> Should deal normal damage (e.g. 20)!
            boss.onAttacked(20, { x: 1000, y: 12, z: 995 }, 47);
            const hpAfterLaserSword = boss.health;

            boss.die();

            return {
                hpStart,
                hpAfterRainbowSword,
                hpAfterRainbowArrow,
                hpAfterWand,
                hpAfterRainbowBow,
                hpAfterDiamondSword,
                hpAfterLaserSword
            };
        })()
        """)
        print("Immunity Test Result:", immunity_test)
        assert immunity_test.get('hpAfterRainbowSword') == 240, f"Rainbow sword damaged Phase 2: {immunity_test}"
        assert immunity_test.get('hpAfterRainbowArrow') == 240, f"Rainbow arrow damaged Phase 2: {immunity_test}"
        assert immunity_test.get('hpAfterWand') == 240, f"Wand damaged Phase 2: {immunity_test}"
        assert immunity_test.get('hpAfterRainbowBow') == 240, f"Rainbow bow damaged Phase 2: {immunity_test}"
        assert immunity_test.get('hpAfterDiamondSword') == 225, f"Diamond sword did not damage Phase 2: {immunity_test}"
        assert immunity_test.get('hpAfterLaserSword') == 205, f"Laser sword did not damage Phase 2: {immunity_test}"
        print("✓ Absolute immunity to all rainbow/color items confirmed (0 DMG), while normal and diamond/laser weapons deal full damage!")

        # -------------------------------------------------------------
        # TEST 4: Player Turnaround Mechanic (Utrudnienie)
        # -------------------------------------------------------------
        print("\n--- TEST 4: Player Camera Turnaround on Hitting Phase 2 ---")
        turn_test = eval_js(203, """
        (function() {
            const game = window.game;
            const player = game.player;

            // Reset player camera orientation
            player.camera.quaternion.set(0, 0, 0, 1);
            const qBefore = {
                x: player.camera.quaternion.x,
                y: player.camera.quaternion.y,
                z: player.camera.quaternion.z,
                w: player.camera.quaternion.w
            };

            // Spawn Phase 2 boss and hit with diamond sword
            const boss = game.animals.spawnBossRobotPhase2(1000, 1000);
            boss.isAwakening = false;

            boss.onAttacked(10, { x: 1000, y: 12, z: 995 }, 34);

            const qAfter = {
                x: player.camera.quaternion.x,
                y: player.camera.quaternion.y,
                z: player.camera.quaternion.z,
                w: player.camera.quaternion.w
            };

            // 180-degree yaw rotation produces an orthogonal quaternion (dot product == 0)
            const dot = qBefore.x * qAfter.x + qBefore.y * qAfter.y + qBefore.z * qAfter.z + qBefore.w * qAfter.w;

            boss.die();

            return {
                qBefore,
                qAfter,
                dot,
                isRotated180: Math.abs(dot) < 0.05
            };
        })()
        """)
        print("Turnaround Result:", turn_test)
        assert turn_test and turn_test.get('isRotated180') is True, f"Player view was not turned around 180 degrees: {turn_test}"
        print("✓ Player view is immediately rotated 180° tyłem upon striking Boss Phase 2!")

        # -------------------------------------------------------------
        # TEST 5: Final Defeat of Phase 2, Drops, and Victory Portal
        # -------------------------------------------------------------
        print("\n--- TEST 5: Boss Robot Phase 2 Final Defeat & Victory Portal ---")
        defeat_test = eval_js(204, """
        (function() {
            const game = window.game;
            const boss = game.animals.spawnBossRobotPhase2(1000, 1000);
            boss.isAwakening = false;

            const initialDrops = (game.drops && game.drops.items) ? game.drops.items.length : 0;

            // Defeat Phase 2 with lethal blow
            boss.onAttacked(300, { x: 1000, y: 12, z: 995 }, 34);

            const isDead = boss.isDead;
            const dropsCount = (game.drops && game.drops.items) ? game.drops.items.length : 0;
            const dropsGained = dropsCount - initialDrops;
            const portal = game.scene.getObjectByName('victoryPortal');

            return {
                isDead,
                dropsGained,
                hasPortal: Boolean(portal)
            };
        })()
        """)
        print("Defeat Result:", defeat_test)
        assert defeat_test and defeat_test.get('isDead') is True, f"Boss Phase 2 not dead: {defeat_test}"
        assert defeat_test.get('dropsGained') >= 20, f"Expected massive drop from Phase 2: {defeat_test}"
        assert defeat_test.get('hasPortal') is True, f"Victory portal was not spawned: {defeat_test}"
        print("✓ Boss Robot Phase 2 final defeat yields massive loot and spawns the Victory Portal!")

        print("\n=======================================================")
        print("ALL TESTS PASSED SUCCESSFULLY! 👑🤖🔥")
        print("=======================================================")

    finally:
        if chrome_proc:
            chrome_proc.terminate()
            chrome_proc.wait()
        if server_proc:
            server_proc.terminate()
            server_proc.wait()

if __name__ == "__main__":
    run_test()

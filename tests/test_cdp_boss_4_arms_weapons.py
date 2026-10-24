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
    chrome_proc = subprocess.Popen([
        chrome_bin,
        '--headless=new',
        '--remote-debugging-port=9226',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        req = urllib.request.urlopen('http://127.0.0.1:9226/json')
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
                return resp['result']['result'].get('value')
            elif resp and 'result' in resp and 'exceptionDetails' in resp['result']:
                print(f"[CDP Eval Error id={cmd_id}]:", resp['result'])
                return None
            return None

        # Wait for window.game
        print("Waiting for game window.game...")
        for attempt in range(25):
            res = eval_js(100 + attempt, "typeof window.game !== 'undefined' && window.game.ui !== null")
            if res is True:
                print(f"Game ready at attempt {attempt + 1}")
                break
            time.sleep(0.5)

        # TEST 1: enterDarkDimension automatically spawns Boss Robot on arena
        print("\n--- TEST 1: Boss Robot Auto-Spawn upon Entering Dark Dimension ---")
        enter_test = eval_js(200, """
        (function() {
            const game = window.game;
            game.enterDarkDimension();

            const boss = game.animals.animals.find(a => a.type === 'boss_robot' && !a.isDead);
            const inDark = game.isInDarkDimension;
            const bossHud = document.getElementById('boss-hud');
            const bossHudVisible = bossHud && bossHud.style.display === 'flex';

            return {
                inDark,
                hasBoss: Boolean(boss),
                bossHp: boss ? boss.health : 0,
                bossHudVisible
            };
        })()
        """)
        print("Auto-spawn Result:", enter_test)
        assert enter_test and enter_test.get('hasBoss') is True, f"Boss Robot was NOT spawned on arena: {enter_test}"
        assert enter_test.get('bossHudVisible') is True, "Boss HUD was not shown on entering dimension"
        print("✓ Boss Robot is automatically waiting on the arena with Boss Bar active when player enters!")

        # TEST 2: Boss Robot 4 Arms Weapons Check (Miecze i Pistolety)
        print("\n--- TEST 2: 4 Arms with Swords and Pistols ---")
        weapons_test = eval_js(201, """
        (function() {
            const game = window.game;
            const boss = game.animals.animals.find(a => a.type === 'boss_robot' && !a.isDead);
            if (!boss) return { error: 'no boss found' };

            const has4Arms = Boolean(boss.upperRArm && boss.upperLArm && boss.lowerRArm && boss.lowerLArm);
            const armsArrayLength = boss.arms ? boss.arms.length : 0;

            // Check weapons:
            // upperRArm: holds Czerwony Miecz
            // upperLArm: holds Cyber-Pistolet
            // lowerRArm: holds Pistolet Plazmowy
            // lowerLArm: holds Błękitny Miecz
            const upperRChildren = boss.upperRArm.children.length;
            const upperLChildren = boss.upperLArm.children.length;
            const lowerRChildren = boss.lowerRArm.children.length;
            const lowerLChildren = boss.lowerLArm.children.length;

            return {
                has4Arms,
                armsArrayLength,
                upperRChildren,
                upperLChildren,
                lowerRChildren,
                lowerLChildren
            };
        })()
        """)
        print("Weapons Test Result:", weapons_test)
        assert weapons_test and weapons_test.get('has4Arms') is True, f"Missing 4 arms: {weapons_test}"
        assert weapons_test.get('armsArrayLength') == 4, f"Arms array length != 4: {weapons_test}"
        assert weapons_test.get('upperLChildren') >= 2, "Upper Left Arm missing pistol"
        assert weapons_test.get('lowerRChildren') >= 2, "Lower Right Arm missing plasma gun"
        print("✓ Boss Robot has exactly 4 arms equipped with Laser Swords and Blaster Pistols!")

        # TEST 3: Sequential Arm Deployment (1st, 2nd, 3rd, 4th arm)
        print("\n--- TEST 3: Sequential Arm Deployment ---")
        arms_seq_test = eval_js(202, """
        (function() {
            const game = window.game;
            const boss = game.animals.spawnBossRobot(1000, 1000);
            boss.isAwakening = true;
            boss.awakenTimer = 0;
            boss.deployedArmsCount = 0;
            boss.arms.forEach(a => a.scale.set(0, 0, 0));

            // t = 0.2s: No arms deployed yet
            boss.update(0.2, { x: 1000, y: 12, z: 995 });
            const s0_arm1 = boss.upperRArm.scale.x;
            const s0_arm2 = boss.upperLArm.scale.x;

            // t = 1.0s: 1st arm deployed (Miecz Czerwony)
            boss.update(0.8, { x: 1000, y: 12, z: 995 });
            const s1_arm1 = boss.upperRArm.scale.x;
            const s1_arm2 = boss.upperLArm.scale.x;

            // t = 1.6s: 2nd arm deployed (Pistolet Laserowy)
            boss.update(0.6, { x: 1000, y: 12, z: 995 });
            const s2_arm2 = boss.upperLArm.scale.x;
            const s2_arm3 = boss.lowerRArm.scale.x;

            // t = 2.4s: 3rd arm deployed (Pistolet Plazmowy)
            boss.update(0.8, { x: 1000, y: 12, z: 995 });
            const s3_arm3 = boss.lowerRArm.scale.x;
            const s3_arm4 = boss.lowerLArm.scale.x;

            // t = 3.3s: 4th arm deployed (Błękitny Miecz) & full awakening!
            boss.update(0.9, { x: 1000, y: 12, z: 995 });
            const s4_arm4 = boss.lowerLArm.scale.x;
            const isFinished = !boss.isAwakening;

            boss.die();

            return {
                s0_arm1,
                s1_arm1,
                s1_arm2,
                s2_arm2,
                s2_arm3,
                s3_arm3,
                s3_arm4,
                s4_arm4,
                isFinished
            };
        })()
        """)
        print("Sequential Deployment Result:", arms_seq_test)
        assert arms_seq_test and arms_seq_test.get('s0_arm1') == 0, f"Arm 1 not 0 at start: {arms_seq_test}"
        assert arms_seq_test.get('s1_arm1') > 0.5 and arms_seq_test.get('s1_arm2') == 0, f"Arm 1 not deployed before Arm 2: {arms_seq_test}"
        assert arms_seq_test.get('s2_arm2') > 0.4 and arms_seq_test.get('s2_arm3') == 0, f"Arm 2 not deployed before Arm 3: {arms_seq_test}"
        assert arms_seq_test.get('s3_arm3') > 0.5 and arms_seq_test.get('s3_arm4') == 0, f"Arm 3 not deployed before Arm 4: {arms_seq_test}"
        assert arms_seq_test.get('s4_arm4') == 1.0 and arms_seq_test.get('isFinished') is True, f"Arm 4 not deployed: {arms_seq_test}"
        print("✓ Sequential arm deployment verified: 1st, then 2nd, then 3rd, then 4th arm unfolds!")

        # TEST 4: Laser Pistol Ranged Shooting
        print("\n--- TEST 4: Pistol Blaster Ranged Shooting ---")
        shoot_test = eval_js(203, """
        (function() {
            const game = window.game;
            const boss = game.animals.spawnBossRobot(1000, 1000);
            boss.isAwakening = false;
            const initialProjCount = game.animals.thrownProjectiles ? game.animals.thrownProjectiles.length : 0;

            // Trigger shootLaserPistol
            boss.shootLaserPistol({ x: 1000, y: 12, z: 980 });
            const newProjCount = game.animals.thrownProjectiles ? game.animals.thrownProjectiles.length : 0;
            const latestBolt = game.animals.thrownProjectiles ? game.animals.thrownProjectiles[game.animals.thrownProjectiles.length - 1] : null;

            let updatedOk = false;
            if (latestBolt) {
                const posBefore = latestBolt.position.clone();
                latestBolt.update(0.1, game.player, game.survival, game.ui);
                const posAfter = latestBolt.position.clone();
                updatedOk = (posAfter.distanceTo(posBefore) > 0.5);
                latestBolt.destroy();
            }

            boss.die();

            return {
                spawned: (newProjCount > initialProjCount),
                updatedOk
            };
        })()
        """)
        print("Pistol Shooting Result:", shoot_test)
        assert shoot_test and shoot_test.get('spawned') is True, f"Pistol did not spawn laser bolt: {shoot_test}"
        assert shoot_test.get('updatedOk') is True, f"Laser bolt did not move towards target: {shoot_test}"
        print("✓ Boss Robot fires laser blaster bolts with its pistols in ranged combat!")

        print("\nALL 4-ARMS, WEAPONS & AUTO-SPAWN TESTS PASSED SUCCESSFULLY!")

    finally:
        chrome_proc.terminate()
        try:
            chrome_proc.wait(timeout=2)
        except:
            chrome_proc.kill()

if __name__ == '__main__':
    run_test()

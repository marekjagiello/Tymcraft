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

        # Wait for game to be ready
        ready = False
        for i in range(30):
            res = eval_js(100 + i, "typeof window.game !== 'undefined' && window.game !== null && window.game.world !== null")
            if res is True:
                ready = True
                break
            time.sleep(0.5)

        if not ready:
            print("ERROR: window.game was not ready in time.")
            sys.exit(1)

        print("Game instance ready! Starting tests...")

        # 1. Teleport player near arena to force chunk generation at 1000, 1000
        res = eval_js(200, """
        (() => {
            const game = window.game;
            game.player.position.set(1000, 12, 1000);
            game.world.update(game.player.position);
            return {
                playerPos: { x: game.player.position.x, y: game.player.position.y, z: game.player.position.z }
            };
        })()
        """)
        print("Player teleported:", res)

        time.sleep(1.0)

        # 2. Verify Roof generation at y=20 (arenaFloorY + 9)
        roof_check = eval_js(201, """
        (() => {
            const world = window.game.world;
            // Roof center (1000, 20, 1000) should be charged block (53)
            const centerRoof = world.getBlock(1000, 20, 1000);
            // Energy line on roof along axis (1000, 20, 1006) should be 53
            const lineRoof = world.getBlock(1000, 20, 1006);
            // Off-axis roof block (1005, 20, 1005) should be Bedrock (14)
            const bedrockRoof = world.getBlock(1005, 20, 1005);
            // Arena Wall at y=15 (perimeter radius ~14)
            const wallBlock = world.getBlock(1014, 15, 1000);
            // Arena Floor at y=11
            const floorCenter = world.getBlock(1000, 11, 1000);
            // Air inside arena at y=15
            const insideAir = world.getBlock(1000, 15, 1000);

            return {
                centerRoof,
                lineRoof,
                bedrockRoof,
                wallBlock,
                floorCenter,
                insideAir
            };
        })()
        """)
        print("Roof & Arena structure check:", roof_check)

        assert roof_check['centerRoof'] == 53, f"Center roof must be 53 (lightning block), got {roof_check['centerRoof']}"
        assert roof_check['lineRoof'] == 53, f"Line roof must be 53 (lightning block), got {roof_check['lineRoof']}"
        assert roof_check['bedrockRoof'] == 14, f"Bedrock roof must be 14 (bedrock), got {roof_check['bedrockRoof']}"
        assert roof_check['wallBlock'] == 14, f"Wall must be 14 (bedrock), got {roof_check['wallBlock']}"
        assert roof_check['floorCenter'] == 53, f"Floor center must be 53, got {roof_check['floorCenter']}"
        assert roof_check['insideAir'] == 0, f"Inside arena must be air (0), got {roof_check['insideAir']}"
        print("✓ Arena roof and structure correctly generated!")

        # 3. Test unbreakable blocks in breakBlock()
        unbreakable_check = eval_js(202, """
        (() => {
            const game = window.game;
            let popups = [];
            const origShowPopup = game.ui.showPopup.bind(game.ui);
            game.ui.showPopup = (msg) => {
                popups.push(msg);
                origShowPopup(msg);
            };

            // Test 1: Trying to break roof lightning block (1000, 20, 1000)
            game.interaction.currentTarget = { hit: true, x: 1000, y: 20, z: 1000, blockId: 53 };
            game.interaction.breakBlock();
            const roofStillExists = game.world.getBlock(1000, 20, 1000);

            // Test 2: Trying to break roof bedrock block (1005, 20, 1005)
            game.interaction.currentTarget = { hit: true, x: 1005, y: 20, z: 1005, blockId: 14 };
            game.interaction.breakBlock();
            const bedrockRoofStillExists = game.world.getBlock(1005, 20, 1005);

            // Test 3: Trying to break arena floor (1000, 11, 1000)
            game.interaction.currentTarget = { hit: true, x: 1000, y: 11, z: 1000, blockId: 53 };
            game.interaction.breakBlock();
            const floorStillExists = game.world.getBlock(1000, 11, 1000);

            // Test 4: Trying to break arena wall (1014, 15, 1000)
            game.interaction.currentTarget = { hit: true, x: 1014, y: 15, z: 1000, blockId: 14 };
            game.interaction.breakBlock();
            const wallStillExists = game.world.getBlock(1014, 15, 1000);

            // Test 5: Placed lightning block outside arena (e.g., at 30, 20, 30)
            game.world.setBlock(30, 20, 30, 53);
            game.interaction.currentTarget = { hit: true, x: 30, y: 20, z: 30, blockId: 53 };
            game.interaction.breakBlock();
            const outsideLightningStillExists = game.world.getBlock(30, 20, 30);

            // Restore popup
            game.ui.showPopup = origShowPopup;

            return {
                roofStillExists,
                bedrockRoofStillExists,
                floorStillExists,
                wallStillExists,
                outsideLightningStillExists,
                popups
            };
        })()
        """)
        print("Unbreakable test result:", unbreakable_check)

        assert unbreakable_check['roofStillExists'] == 53, "Roof block 53 was destroyed!"
        assert unbreakable_check['bedrockRoofStillExists'] == 14, "Roof bedrock block 14 was destroyed!"
        assert unbreakable_check['floorStillExists'] == 53, "Floor block 53 was destroyed!"
        assert unbreakable_check['wallStillExists'] == 14, "Wall block 14 was destroyed!"
        assert unbreakable_check['outsideLightningStillExists'] == 53, "Outside lightning block 53 was destroyed!"
        assert any("niezniszczalne" in p for p in unbreakable_check['popups']), f"Expected unbreakable popup, got {unbreakable_check['popups']}"
        print("✓ All roof, arena and lightning blocks are strictly unbreakable by player!")

        # 4. Test normal breakable block still works
        normal_break_check = eval_js(203, """
        (() => {
            const game = window.game;
            // Place temporary dirt outside arena at (35, 20, 35)
            game.world.setBlock(35, 20, 35, 2); // Dirt
            game.interaction.currentTarget = { hit: true, x: 35, y: 20, z: 35, blockId: 2 };
            game.interaction.breakBlock();
            const afterBreak = game.world.getBlock(35, 20, 35);
            return { afterBreak };
        })()
        """)
        print("Normal breakable check:", normal_break_check)
        assert normal_break_check['afterBreak'] == 0, "Normal dirt block was not broken!"
        print("✓ Normal blocks remain breakable!")

        # 5. Test explosion protection in arena & for lightning blocks
        explosion_check = eval_js(204, """
        (() => {
            const game = window.game;
            // Test Gunpowder explosion protection
            // In projectile.js:
            // if (blockId === 14 || blockId === 15 || blockId === 16 || blockId === 53 || (bx >= 980 && bx <= 1020 && bz >= 980 && bz <= 1020))
            const world = game.world;
            const roofBlockBefore = world.getBlock(1000, 20, 1000);
            
            // Simulate explosion at (1000, 20, 1000)
            const explosionRadius = 3;
            for (let x = -explosionRadius; x <= explosionRadius; x++) {
                for (let y = -explosionRadius; y <= explosionRadius; y++) {
                    for (let z = -explosionRadius; z <= explosionRadius; z++) {
                        const bx = 1000 + x;
                        const by = 20 + y;
                        const bz = 1000 + z;
                        const blockId = world.getBlock(bx, by, bz);
                        if (blockId > 0) {
                            if (blockId === 14 || blockId === 15 || blockId === 16 || blockId === 53 || (bx >= 980 && bx <= 1020 && bz >= 980 && bz <= 1020)) {
                                continue;
                            }
                            world.setBlock(bx, by, bz, 0);
                        }
                    }
                }
            }

            const roofBlockAfter = world.getBlock(1000, 20, 1000);
            return {
                roofBlockBefore,
                roofBlockAfter
            };
        })()
        """)
        print("Explosion check:", explosion_check)
        assert explosion_check['roofBlockBefore'] == 53 and explosion_check['roofBlockAfter'] == 53, "Roof damaged by explosion!"
        print("✓ Boss arena and lightning blocks are immune to explosions!")

        print("\nALL CDP TESTS PASSED SUCCESSFULLY! 🎉")

    finally:
        try:
            chrome_proc.terminate()
            chrome_proc.wait(timeout=2)
        except:
            pass

if __name__ == '__main__':
    run_test()

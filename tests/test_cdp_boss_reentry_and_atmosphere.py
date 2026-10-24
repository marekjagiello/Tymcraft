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
        '--remote-debugging-port=9228',
        '--disable-gpu',
        '--no-sandbox',
        'http://localhost:8000/'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    time.sleep(2.5)

    try:
        req = urllib.request.urlopen('http://127.0.0.1:9228/json')
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

        # Wait for game
        for i in range(30):
            res = eval_js(100 + i, "typeof window.game !== 'undefined' && window.game !== null && window.game.world !== null")
            if res is True:
                break
            time.sleep(0.5)

        print("--- TEST 1: Wejście do Mrocznego Wymiaru po raz 1 ---")
        t1 = eval_js(200, """
        (() => {
            const game = window.game;
            game.enterDarkDimension();
            return {
                isInDarkDimension: game.isInDarkDimension,
                playerX: game.player.position.x,
                playerZ: game.player.position.z,
                hasBoss: game.animals.animals.some(a => a.type === 'boss_robot' && !a.isDead)
            };
        })()
        """)
        print("T1 result:", t1)
        assert t1['isInDarkDimension'] is True, "Expected isInDarkDimension to be true"
        assert t1['playerX'] > 800, f"Expected player in arena, got x={t1['playerX']}"
        assert t1['hasBoss'] is True, "Boss Robot was not spawned"
        print("✓ Gracz pomyślnie wszedł na arenę Bossa za pierwszym razem!")

        print("\n--- TEST 2: Gracz zostaje pokonany przez bossa i odradza się w zwykłym świecie ---")
        t2 = eval_js(300, """
        (() => {
            const game = window.game;
            // Gracz otrzymuje śmiertelne obrażenia od bossa
            game.survival.takeDamage(100, 'boss_robot');
            const wasDead = game.survival.isDead;
            
            // Gracz klika odrodzenie
            game.survival.respawn();
            
            // Aktualizacja oświetlenia
            game.updateDayNight(0.016);
            
            const skyHex = game.scene.background ? game.scene.background.getHex() : 0;
            const isDarkSky = (skyHex === 0x06060c);

            return {
                wasDead,
                isDeadNow: game.survival.isDead,
                playerX: game.player.position.x,
                isInDarkDimension: game.isInDarkDimension,
                isDarkSky,
                skyHex: '0x' + skyHex.toString(16)
            };
        })()
        """)
        print("T2 result:", t2)
        assert t2['wasDead'] is True, "Player was not killed"
        assert t2['isDeadNow'] is False, "Player did not respawn"
        assert t2['playerX'] < 800, f"Expected overworld spawn, got {t2['playerX']}"
        assert t2['isInDarkDimension'] is False, "isInDarkDimension should be false after respawning!"
        assert t2['isDarkSky'] is False, "Overworld sky must NOT be dark dimension black!"
        print("✓ Po odrodzeniu gracz wraca do normalnego świata i niebo NIE JEST mroczne!")

        print("\n--- TEST 3: Gracz wchodzi do Bossa po raz DRUGI (brak blokady!) ---")
        t3 = eval_js(400, """
        (() => {
            const game = window.game;
            // Podpalenie portalu / wejście do mrocznego wymiaru drugi raz
            game.enterDarkDimension();

            const boss = game.animals.animals.find(a => a.type === 'boss_robot' && !a.isDead);

            return {
                isInDarkDimension: game.isInDarkDimension,
                playerX: game.player.position.x,
                playerZ: game.player.position.z,
                bossHp: boss ? boss.health : 0,
                bossMaxHp: boss ? boss.maxHealth : 0,
                hasActiveBoss: Boolean(boss)
            };
        })()
        """)
        print("T3 result:", t3)
        assert t3['isInDarkDimension'] is True, "Expected to re-enter dark dimension"
        assert t3['playerX'] > 800, f"Expected player in arena, got x={t3['playerX']}"
        assert t3['hasActiveBoss'] is True, "Expected boss robot to be present on rematch"
        assert t3['bossHp'] == 160, f"Boss HP must be reset to 160 HP for rematch, got {t3['bossHp']}"
        print("✓ Gracz pomyślnie wszedł do Bossa drugi raz! Boss ma pełne 160 HP!")

        print("\n--- TEST 4: Bezpieczny powrót komendą /wroc (żaden portal nie wywala gracza na siłę) ---")
        t4 = eval_js(500, """
        (() => {
            const game = window.game;
            // Symulacja wpisania /wroc na czacie
            game.ui.chatInputEl.value = '/wroc';
            game.ui.submitChat();

            game.updateDayNight(0.016);

            return {
                isInDarkDimension: game.isInDarkDimension,
                playerX: game.player.position.x,
                playerZ: game.player.position.z
            };
        })()
        """)
        print("T4 result:", t4)
        assert t4['isInDarkDimension'] is False, "Expected overworld after /wroc"
        assert t4['playerX'] < 800, f"Expected overworld x < 800, got {t4['playerX']}"
        print("✓ Komenda /wroc bezpiecznie przenosi gracza do normalnego świata!")

        print("\n==========================================")
        print("🎉 ALL RE-ENTRY & ATMOSPHERE TESTS PASSED! 🎉")
        print("==========================================")

    finally:
        try:
            chrome_proc.terminate()
            chrome_proc.wait(timeout=2)
        except:
            pass

if __name__ == '__main__':
    run_test()

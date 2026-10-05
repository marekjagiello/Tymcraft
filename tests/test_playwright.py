import sys
import time
from playwright.sync_api import sync_playwright

def run_test():
    errors = []
    logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--use-gl=angle',
                '--use-angle=swiftshader',
                '--enable-webgl',
                '--ignore-gpu-blocklist',
                '--disable-gpu-sandbox'
            ]
        )
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Real-time console listener
        def on_console(msg):
            line = f"[{msg.type.upper()}] {msg.text}"
            logs.append(line)
            print(f"  Browser Log: {line}")
            if msg.type == 'error':
                errors.append(msg.text)

        def on_page_error(exc):
            line = f"Page Error: {exc}"
            errors.append(line)
            print(f"  ❌ {line}")

        page.on('console', on_console)
        page.on('pageerror', on_page_error)

        try:
            print("1. Otwieranie http://127.0.0.1:8080/index.html ...")
            response = page.goto('http://127.0.0.1:8080/index.html', wait_until='networkidle', timeout=15000)
            assert response.status == 200, f"Błąd HTTP {response.status}"

            print("2. Oczekiwanie na zainicjalizowanie Canvasa Three.js...")
            page.wait_for_selector('#canvas-container canvas', state='attached', timeout=10000)
            print("✓ Three.js WebGL canvas został poprawnie utworzony i zamontowany.")

            # Sprawdzenie ekranu startowego
            overlay = page.locator('#start-overlay')
            assert overlay.is_visible(), "Ekran startowy powinien być widoczny na początku"
            print("✓ Ekran powitalny (start-overlay) jest widoczny.")

            # Sprawdzenie paska wyboru bloków (Hotbar)
            slots = page.locator('.hotbar-slot')
            slot_count = slots.count()
            assert slot_count == 9, f"Oczekiwano 9 slotów, znaleziono {slot_count}"
            print("✓ Pasek ekwipunku zawiera dokładnie 9 slotów z ikonami.")

            # Rozpoczęcie gry (kliknięcie ekranu)
            print("3. Kliknięcie ekranu i start pętli gry...")
            overlay.click()
            time.sleep(1.0)

            # Odczekanie na wyrenderowanie kilku klatek
            time.sleep(2.0)
            debug_text = page.locator('#debug-info').inner_text()
            print("✓ Odczyt HUD w grze:\n" + "-"*35 + f"\n{debug_text}\n" + "-"*35)

            # Test zmiany aktywnego slotu klawiaturą
            print("4. Test przełączania materiałów (klawisz '3')...")
            page.keyboard.press('Digit3')
            time.sleep(0.3)
            active_slot = page.locator('.hotbar-slot.active').inner_text()
            assert '3' in active_slot, f"Oczekiwano aktywnego slotu 3, jest: {active_slot}"
            print("✓ Zmiana aktywnego bloku działa poprawnie (Slot 3: Kamień).")

            # Wykonanie zrzutu ekranu
            screenshot_path = 'tests/screenshot.png'
            page.screenshot(path=screenshot_path)
            print(f"✓ Zapisano zrzut ekranu gry do {screenshot_path}")

        finally:
            browser.close()

    if errors:
        print(f"\n❌ Wykryto {len(errors)} błąd(błędy) w konsoli:")
        for err in errors:
            print("  -", err)
        sys.exit(1)
    else:
        print("\n✅ TEST ZAKOŃCZONY SUKCESEM! Strona i silnik gry działają w 100% poprawnie.")

if __name__ == '__main__':
    run_test()

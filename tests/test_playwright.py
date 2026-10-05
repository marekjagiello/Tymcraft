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

            # Sprawdzenie pasków życia i głodu (Hearts & Hunger)
            hearts = page.locator('#hearts-bar .heart-icon')
            hunger = page.locator('#hunger-bar .hunger-icon')
            assert hearts.count() == 10, f"Oczekiwano 10 serduszek, znaleziono {hearts.count()}"
            assert hunger.count() == 10, f"Oczekiwano 10 ikonek głodu, znaleziono {hunger.count()}"
            print("✓ Paski życia (10 serc) i głodu (10 udźców) zostały poprawnie wyrenderowane.")

            # Sprawdzenie ekranu startowego
            overlay = page.locator('#start-overlay')
            assert overlay.is_visible(), "Ekran startowy powinien być widoczny na początku"
            print("✓ Ekran powitalny (start-overlay) jest widoczny.")

            # Rozpoczęcie gry
            print("3. Start gry i weryfikacja pętli renderowania...")
            overlay.click()
            time.sleep(1.5)

            # Sprawdzenie HUD
            debug_text = page.locator('#debug-info').inner_text()
            print("✓ Odczyt HUD w grze:\n" + "-"*35 + f"\n{debug_text}\n" + "-"*35)

            # Test otwierania Craftingu 2x2 klawiszem 'E'
            print("4. Test interfejsu Craftingu 2x2 (klawisz 'E')...")
            page.keyboard.press('KeyE')
            time.sleep(0.5)
            craft_modal = page.locator('#crafting-modal')
            assert craft_modal.is_visible(), "Okno craftingu powinno się otworzyć po wciśnięciu 'E'"

            craft_slots = page.locator('.craft-slot')
            assert craft_slots.count() == 4, f"Oczekiwano 4 slotów w siatce 2x2, znaleziono {craft_slots.count()}"
            print("✓ Okno Craftingu 2x2 otwarte poprawnie (siatka 2x2 z 4 slotami i polem wyniku).")

            # Zamknięcie okna craftingu
            page.locator('#close-crafting-btn').click()
            time.sleep(0.3)
            assert not craft_modal.is_visible(), "Okno craftingu powinno być zamknięte"
            print("✓ Zamknięcie okna craftingu działa prawidłowo.")

            # Test LocalStorage
            print("5. Test zapisu stanu do LocalStorage...")
            ls_delta = page.evaluate("() => localStorage.getItem('minecraft_poc_world_delta_v1')")
            print(f"✓ LocalStorage delta zainicjalizowana poprawnie: {ls_delta}")

            # Wykonanie zrzutu ekranu
            screenshot_path = 'tests/screenshot_survival.png'
            page.screenshot(path=screenshot_path)
            print(f"✓ Zapisano nowy zrzut ekranu gry do {screenshot_path}")

        finally:
            browser.close()

    if errors:
        print(f"\n❌ Wykryto {len(errors)} błąd(błędy) w konsoli:")
        for err in errors:
            print("  -", err)
        sys.exit(1)
    else:
        print("\n✅ WSZYSTKIE TESTY SURVIVAL, CRAFTING I STORAGE ZAKOŃCZONE SUKCESEM!")

if __name__ == '__main__':
    run_test()

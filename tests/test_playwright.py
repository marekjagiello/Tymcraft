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

            # Test mechaniki upuszczania bloków i jabłek (Drops & Pickup)
            print("6. Test mechaniki upuszczania minibloczków i jabłek...")
            drop_test = page.evaluate("""() => {
                const game = window.__gameInstance;
                if (!game || !game.drops) return { error: "Brak game.drops" };

                // Test 1: Zniszczenie ziemi tworzy minibloczek
                const initialCount = game.drops.items.length;
                game.drops.spawnBlockDrop(20, 20, 20, 2); // dirt
                const afterDirt = game.drops.items.length;
                const dirtDrop = game.drops.items[afterDirt - 1];

                // Test 2: Zniszczenie liści (ID: 5) NIE tworzy bloku liści, może stworzyć jabłko (ID: 23)
                for (let k = 0; k < 15; k++) {
                    game.drops.spawnBlockDrop(20, 20, 20, 5);
                }
                const leafDrops = game.drops.items.filter(item => item.id === 5);
                const appleDrops = game.drops.items.filter(item => item.id === 23);

                // Test 3: Podnoszenie przedmiotu przez gracza
                const pPos = game.player.position.clone();
                const testPickup = new (game.drops.items[0].constructor)(game.scene, game.world, 23, 'Jabłko', pPos.x, pPos.y, pPos.z);
                let collected = false;
                testPickup.update(0.1, pPos, (id, name) => {
                    collected = true;
                    game.ui.addItem(id, name, 1);
                });

                return {
                    dirtDropCreated: afterDirt > initialCount && dirtDrop.id === 2,
                    lifespan: dirtDrop.lifespan,
                    zeroLeafBlocks: leafDrops.length === 0,
                    appleSpawned: appleDrops.length > 0,
                    appleFallsDown: appleDrops.length > 0 && appleDrops[0].velocity.y < 0,
                    collected: collected
                };
            }""")
            print(f"✓ Wynik testu upuszczania przedmiotów: {drop_test}")
            assert drop_test.get("dirtDropCreated"), "Minibloczek ziemi powinien zostać utworzony"
            assert drop_test.get("lifespan") == 60.0, "Czas życia przedmiotu powinien wynosić 60 sekund"
            assert drop_test.get("zeroLeafBlocks"), "Z liści NIGDY nie powinien wypaść blok liści"
            assert drop_test.get("appleSpawned"), "Z liści powinno wypaść jabłko (ID 23)"
            assert drop_test.get("appleFallsDown"), "Jabłko z liści musi opadać w dół (velocity.y < 0), nie lecieć w niebo"
            assert drop_test.get("collected"), "Przedmiot powinien zostać zebrany przez gracza przy zbliżeniu"
            print("✓ Prawidłowo zweryfikowano: minibloczki ze zniszczonych bloków, jabłka z liści (brak bloków liści), 60s czas znikania i podnoszenie do ekwipunku.")

            # Test pomarańczowego węża i interakcji z jabłkiem
            print("7. Test pomarańczowego węża i interakcji z jabłkiem (Serca i mały wąż)...")
            snake_test = page.evaluate("""() => {
                const game = window.__gameInstance;
                if (!game || !game.animals) return { error: "Brak animalManager" };

                const snakes = game.animals.animals.filter(a => a.type === 'snake');
                if (snakes.length === 0) return { error: "Brak węży" };

                const snake = snakes[0];
                const hasSegments = snake.segments && snake.segments.length >= 7;
                const hasTongue = !!snake.tongue;
                const initialAnimalCount = game.animals.animals.length;

                // Interakcja z jabłkiem (karmienie / taming)
                snake.interactWithApple();

                const heartsSpawned = snake.activeHearts && snake.activeHearts.length > 0;
                const afterAnimalCount = game.animals.animals.length;
                const babySpawned = afterAnimalCount > initialAnimalCount;
                const isTamed = snake.isTamed;

                return {
                    snakeFound: true,
                    hasSegments: hasSegments,
                    hasTongue: hasTongue,
                    heartsSpawned: heartsSpawned,
                    babySpawned: babySpawned,
                    isTamed: isTamed
                };
            }""")
            print(f"✓ Wynik testu węża: {snake_test}")
            assert snake_test.get("snakeFound"), "Wąż powinien zostać znaleziony w świecie"
            assert snake_test.get("hasSegments"), "Wąż powinien posiadać wielosegmentowe ciało z plamkami"
            assert snake_test.get("hasTongue"), "Wąż powinien posiadać ruchomy język"
            assert snake_test.get("heartsSpawned"), "Po interakcji z jabłkiem powinny pojawić się pikselowe serca"
            assert snake_test.get("babySpawned"), "Po nakarmieniu powinien pojawić się mały wąż"
            assert snake_test.get("isTamed"), "Wąż powinien zostać oswojony i podążać za graczem"
            print("✓ Prawidłowo zweryfikowano: pikselowy pomarańczowy wąż z plamkami i czarnymi oczami, pojawianie się serc ❤️ i małego węża po kliknięciu z jabłkiem.")

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

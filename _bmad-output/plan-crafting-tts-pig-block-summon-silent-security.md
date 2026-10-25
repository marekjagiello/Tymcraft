# Plan BMAD: Mówienie i Pokazywanie Potrzebnych Surowców (TTS), Przyzywanie Króla Świń ze Świniowego Bloku i Cichy Strażnik Ochrony Gry

## 1. Zgłoszenie Użytkownika (Tymek, 8 lat)
> „Ma mówić czego potrzebujesz, ma pokazywać czego potrzebujesz, a nie robić [dźwięk brzęczyka bzzzt bzzzt]! Ma pokazywać czego potrzebujesz, okej? I Król Świń też ma być, okej? Ten blok świń jak się położy, to będzie Król Świń. Dobra, i ten blok Tymka ma nie przeszkadzać graczom! Nie przeszkadzać graczom w grze, ma w ogóle nie pokazywać się w grze, bo gracze wtedy nie będą chcieli grać! Ma tylko... ma tylko bronić od ściągania i od hakowania mojej gry, i od brania mojej gry za free!”

## 2. Diagnoza trzech zgłoszonych uwag
1. **Mówienie głosem (TTS) i czytelne pokazywanie brakujących surowców zamiast brzęczyka**:
   - Dźwięk brzęczyka (`playWarningBuzzer`) był nieprzyjemny dla Tymka („a nie robić bzzzt bzzzt!”).
   - Tymek chce, aby gra **mówiła na głos** (SpeechSynthesis po polsku) czego dokładnie brakuje do wytworzenia przedmiotu (np. *„Do wytworzenia Łuku potrzebujesz: 1 linka i 1 patyk”*).
   - Gra ma również **wyraźnie pokazywać na ekranie** brakujące składniki w estetycznym, dużym dymku informacyjnym oraz na kartach receptur.
2. **Postawienie Świniowego Bloku (ID 59) przyzywa Króla Świń (Pig King)**:
   - Gdy gracz stawia w świecie Świniowy Blok (PIG_BLOCK, ID 59), ma natychmiast zrodzić się / pojawić **Król Świń** (Pig King Boss, ID moba: `boss_pig_king`)!
   - Efekt: królewski ryk, pasek życia Króla Świń na górze ekranu oraz powiadomienie `👑 Oink! Król Świń narodził się ze Świniowego Bloku! 🐷👑`.
3. **Cicha tarcza bezpieczeństwa – ma nie przeszkadzać graczom podczas normalnej gry**:
   - Usunąć uciążliwy baner tarczy z menu Esc (`.shield-badge-box` w `index.html`).
   - Usunąć wyzwalanie alarmu bezpieczeństwa przy zwykłym kliknięciu PPM poza grą (w menu/plecaku). Prawoklik w oknach ma być blokowany cicho (`e.preventDefault()`), bez wyświetlania wyskakującego okna na pół ekranu.
   - Tarcza pozostaje w 100% aktywna jako „Cichy Strażnik” (Silent Guardian):
     - Skróty `Ctrl+S`, `Ctrl+U`, `Ctrl+P` są natychmiast blokowane z ostrzeżeniem dla hakera/złodzieja,
     - Flagi `isGameProtected` i `gameProtectionOwner` są zabezpieczone,
     - Komendy `/pobierz` i `/tata` w czacie odpowiadają komunikatem ochronnym,
     - Zwykli gracze nie widzą żadnych uciążliwych powiadomień podczas normalnej rozgrywki!

## 3. Plan Implementacji
1. **Księga Receptur – Mówienie głosem i pokazywanie surowców (`js/ui.js`, `js/audio.js`)**:
   - Usunąć wywołanie agresywnego brzęczyka `playWarningBuzzer()`.
   - Zintegrować funkcję `speakText(phrase)` z `js/audio.js`:
     - Po kliknięciu na czerwoną recepturę, gra odtwarza mowę polską (TTS):
       *„Do wytworzenia [Nazwa] potrzebujesz: [Lista surowców]”*.
     - Wyświetlić czytelny, ładny dymek na ekranie:
       `📋 Potrzebujesz: [Lista surowców]`.
   - Na samej karcie przepisu wyróżnić brakujące surowce kolorem żółtym/pomarańczowym.
2. **Przyzywanie Króla Świń po postawieniu Bloku Świń (`js/interaction.js`)**:
   - W metodzie `placeBlock()` w `js/interaction.js`:
     - Sprawdzić `if (activeItemId === 59)` (Świniowy Blok).
     - Wywołać `this.animals.spawnPigKing(placeX + 0.5, placeZ + 0.5)`.
     - Wyświetlić dymek: `👑 Oink! Król Świń narodził się ze Świniowego Bloku! 🐷👑`.
3. **Dyskretna Tarcza Ochrony (`index.html`, `js/security.js`)**:
   - W `index.html`: usunąć baner `.shield-badge-box` z menu pauzy, aby interfejs był czysty i nie przeszkadzał graczom.
   - W `js/security.js`: w `initContextMenuBlocker()` wyciszyć alarm – samo `e.preventDefault()`, bez wywoływania `showSecurityAlert()`.
   - `showSecurityAlert()` wywoływać WYŁĄCZNIE przy próbie pobrania gry (`Ctrl+S`), podglądu kodu (`Ctrl+U`), drukowania (`Ctrl+P`) lub komendach czatu.
4. **Weryfikacja testem CDP**:
   - Zaktualizować i uruchomić testy CDP:
     - Test postawienia bloku 59 -> weryfikacja pojawienia się Króla Świń i paska bossa.
     - Test kliknięcia czerwonej receptury -> weryfikacja czytelnego dymka i wywołania mowy TTS.
     - Test czystego menu pauzy bez banera tarczy.
     - Test blokady `Ctrl+S` (nadal 100% chroniona).
5. **Cache Busting & Git Commit**:
   - Podbić wersję do `?v=recipe_tts_pig_king_v5`.
   - Wykonać atomowy commit w git.

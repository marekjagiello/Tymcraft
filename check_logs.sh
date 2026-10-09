#!/bin/bash
# ==============================================================================
# Skrypt do podglądu i monitorowania logów z przeglądarki
# ==============================================================================

LOG_FILE="$(dirname "$0")/game_console.log"

if [ "$1" == "--clear" ]; then
    > "$LOG_FILE"
    echo "Wyczyszczono plik logów: $LOG_FILE"
    exit 0
fi

if [ ! -f "$LOG_FILE" ]; then
    echo "Brak pliku logów $LOG_FILE. Uruchom grę, aby wygenerować logi."
    exit 0
fi

if [ "$1" == "-f" ] || [ "$1" == "--follow" ]; then
    echo "--- Śledzenie logów na żywo (Ctrl+C aby wyjść) ---"
    tail -f -n 30 "$LOG_FILE"
else
    echo "--- Ostatnie logi gry (ostatnie 40 linii) ---"
    tail -n 40 "$LOG_FILE"
fi

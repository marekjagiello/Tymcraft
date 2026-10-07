#!/bin/bash
# ==============================================================================
# Skrypt zatrzymujący serwer: Minecraft Web POC
# ==============================================================================

PORT="${PORT:-8000}"
PID_FILE="/tmp/minecraft_poc_${PORT}.pid"

STOPPED=0

if [ -f "$PID_FILE" ]; then
    PID="$(cat "$PID_FILE" 2>/dev/null)"
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        echo "Zatrzymywanie serwera (PID: $PID)..."
        kill "$PID" 2>/dev/null
        rm -f "$PID_FILE"
        STOPPED=1
    else
        rm -f "$PID_FILE"
    fi
fi

# Zabezpieczenie: ubicie ewentualnego procesu po wzorcu jeśli PID_FILE wygasł
if pkill -f "python.*http.server $PORT" 2>/dev/null; then
    STOPPED=1
fi

if [ $STOPPED -eq 1 ]; then
    echo "Serwer na porcie $PORT został pomyślnie zatrzymany."
else
    echo "Nie znaleziono aktywnego serwera na porcie $PORT."
fi

#!/bin/bash
# ==============================================================================
# Skrypt startowy: Minecraft Web POC
# Uruchamia lokalny serwer HTTP (Python) i otwiera grę w domyślnej przeglądarce.
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-8000}"
URL="http://localhost:${PORT}"
PID_FILE="/tmp/minecraft_poc_${PORT}.pid"
LOG_FILE="/tmp/minecraft_poc_${PORT}.log"

cd "$PROJECT_DIR" || exit 1

# Wykrywanie interpretera Python
PYTHON_BIN=""
for candidate in python3 /usr/bin/python3 /snap/antigravity-cli/current/usr/bin/python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
        PYTHON_BIN="$(command -v "$candidate")"
        break
    elif [ -x "$candidate" ]; then
        PYTHON_BIN="$candidate"
        break
    fi
done

if [ -z "$PYTHON_BIN" ]; then
    echo "Błąd: Nie znaleziono interpretera Python (python3)." >&2
    if command -v zenity >/dev/null 2>&1; then
        zenity --error --text="Nie znaleziono interpretera Python3 do uruchomienia serwera."
    fi
    exit 1
fi

# Sprawdzenie czy serwer już działa na tym porcie
is_port_open() {
    "$PYTHON_BIN" -c "
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(0.5)
res = s.connect_ex(('127.0.0.1', $PORT))
s.close()
sys.exit(0 if res == 0 else 1)
" 2>/dev/null
}

if is_port_open; then
    echo "Serwer HTTP już działa na porcie $PORT."
else
    echo "Uruchamianie serwera HTTP na porcie $PORT w katalogu: $PROJECT_DIR"
    "$PYTHON_BIN" -c "
import sys, subprocess
with open('$LOG_FILE', 'a') as f:
    p = subprocess.Popen(
        [sys.executable, '-m', 'http.server', '$PORT'],
        cwd='$PROJECT_DIR',
        stdout=f,
        stderr=f,
        start_new_session=True
    )
    with open('$PID_FILE', 'w') as pf:
        pf.write(str(p.pid))
"
    # Poczekaj na uruchomienie serwera (do 3 sekund)
    for i in {1..15}; do
        if is_port_open; then
            break
        fi
        sleep 0.2
    done
fi

# Otwarcie gry w przeglądarce
echo "Otwieranie gry: $URL"
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 &
elif command -v gio >/dev/null 2>&1; then
    gio open "$URL" >/dev/null 2>&1 &
elif command -v firefox >/dev/null 2>&1; then
    firefox "$URL" >/dev/null 2>&1 &
elif command -v google-chrome >/dev/null 2>&1; then
    google-chrome "$URL" >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
    chromium "$URL" >/dev/null 2>&1 &
fi

if command -v notify-send >/dev/null 2>&1; then
    notify-send "Minecraft Web POC" "Uruchomiono grę na ${URL}" --icon="$PROJECT_DIR/icon.svg" >/dev/null 2>&1 &
fi

exit 0

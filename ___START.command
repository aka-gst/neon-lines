#!/bin/bash
# Жми дважды — Неон Линии (последняя версия из этой папки) откроются в браузере. Закрой это окно, чтобы выйти.
# Порт всегда 8794: сохранения и рекорды браузер держит по адресу, на другом порту их не видно.
cd "$(dirname "$0")"
PORT=${LINII_PORT:-8794}
URL="http://127.0.0.1:$PORT/"
PID=$(lsof -nP -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null | head -1)
if [ -n "$PID" ]; then
  if curl -fsS --max-time 3 "$URL" 2>/dev/null | cmp -s - index.html; then
    open "$URL"; echo "Неон Линии уже запущены — открыл в браузере. Это окно можно закрыть."; exit 0
  fi
  echo "Порт $PORT занят другой программой: $(ps -o command= -p "$PID" | cut -c1-80)"
  echo "На другом порту сохранения не видны, поэтому не запускаю. Закрой её и запусти ___START снова."
  read -r -p "Нажми Enter, чтобы закрыть окно " _; exit 1
fi
(python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1) &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null" EXIT
for _ in $(seq 1 20); do curl -fsS --max-time 1 "$URL" >/dev/null 2>&1 && break; sleep 0.25; done
if ! kill -0 $SERVER_PID 2>/dev/null; then echo "Сервер не поднялся на порту $PORT"; read -r -p "Нажми Enter, чтобы закрыть окно " _; exit 1; fi
open "$URL"
echo "Неон Линии открыты: $URL"
echo "Закрой это окно, чтобы остановить сервер."
wait $SERVER_PID

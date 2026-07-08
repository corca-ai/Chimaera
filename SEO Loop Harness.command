#!/bin/zsh
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-5174}"
URL="http://127.0.0.1:${PORT}/"
LOG_DIR="${APP_DIR}/logs"
LOG_FILE="${LOG_DIR}/seo-loop-harness.log"

cd "$APP_DIR"
mkdir -p "$LOG_DIR"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "SEO Loop Harness is already running at ${URL}"
  open "$URL" >/dev/null 2>&1 || true
  exit 0
fi

echo "Starting SEO Loop Harness at ${URL}"
nohup env PORT="$PORT" npm run dev > "$LOG_FILE" 2>&1 &

for _ in {1..20}; do
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    open "$URL" >/dev/null 2>&1 || true
    echo "Ready. Log: ${LOG_FILE}"
    exit 0
  fi
  sleep 0.25
done

echo "Server did not become ready yet. Check log: ${LOG_FILE}"
open "$LOG_FILE" >/dev/null 2>&1 || true
exit 1

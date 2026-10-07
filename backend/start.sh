#!/bin/sh

echo "[start] container booting, PORT=${PORT:-unset}"
echo "[start] DATABASE_URL=${DATABASE_URL:-unset}"

mkdir -p /tmp/photos
echo "[start] /tmp/photos ready"

(python seed.py && python seed_deals.py) &
echo "[start] seed launched in background"

echo "[start] exec uvicorn on port 8080..."
exec uvicorn main:app --host 0.0.0.0 --port 8080

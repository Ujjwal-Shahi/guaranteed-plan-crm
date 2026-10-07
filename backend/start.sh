#!/bin/sh
set -e

mkdir -p /tmp/photos

# Seed DB in background so uvicorn starts immediately
(python seed.py && python seed_deals.py) &

exec uvicorn main:app --host 0.0.0.0 --port 8080

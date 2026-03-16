#!/bin/bash
set -e

echo "Running aircraft seed (if needed)..."
python scripts/seed_aircraft.py 2>&1 || echo "Seed script failed (may already be seeded), continuing..."

echo "Starting server..."
exec gunicorn app.main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind "0.0.0.0:${PORT:-8000}" \
    --timeout 120

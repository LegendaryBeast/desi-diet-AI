#!/bin/bash
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set. Please configure it in Railway Variables."
  exit 1
fi

echo "==> Running Prisma DB Push to synchronize database schema..."
python -m prisma db push --accept-data-loss

echo "==> Database sync completed successfully!"

echo "==> Starting FastAPI application with Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

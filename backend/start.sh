#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "==> Running Prisma DB Push to synchronize database schema..."
python -m prisma db push

echo "==> Database sync completed successfully!"

echo "==> Starting FastAPI application with Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

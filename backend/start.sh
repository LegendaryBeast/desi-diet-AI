#!/bin/bash
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set. Please configure it in Railway Variables."
  exit 1
fi

SCHEMA_FILE="prisma/schema.prisma"

# Auto-detect PostgreSQL vs SQLite and patch provider if needed
if [[ "$DATABASE_URL" == postgres* ]]; then
  echo "==> Detected PostgreSQL database. Patching schema provider..."
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA_FILE"
  # Restore SQLite after push so local dev isn't affected
  trap 'sed -i '"'"'s/provider = "postgresql"/provider = "sqlite"/'"'"' "$SCHEMA_FILE"' EXIT
elif [[ "$DATABASE_URL" != file:* ]]; then
  echo "ERROR: DATABASE_URL must start with 'file:' (SQLite) or 'postgres:' (PostgreSQL)."
  exit 1
fi

echo "==> Running Prisma DB Push to synchronize database schema..."
python -m prisma db push --accept-data-loss

echo "==> Database sync completed successfully!"

echo "==> Starting FastAPI application with Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

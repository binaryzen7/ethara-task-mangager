#!/bin/sh
set -e

# Load .env created at build time (auto DB) or local dev
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

if [ -z "$DATABASE_URL" ] && [ -n "$PGHOST" ] && [ -n "$PGUSER" ] && [ -n "$PGPASSWORD" ] && [ -n "$PGDATABASE" ]; then
  export DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${PGDATABASE}?schema=public"
  echo "Using DATABASE_URL built from PG* variables."
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: No database connection."
  echo "Railway: + New → Database → PostgreSQL, then Variables → Add Reference → DATABASE_URL"
  exit 1
fi

echo "Applying migrations..."
npx prisma migrate deploy

echo "Starting Next.js on port ${PORT:-3000}..."
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"

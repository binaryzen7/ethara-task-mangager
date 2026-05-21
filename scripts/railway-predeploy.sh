#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set on this service."
  echo ""
  echo "Fix in Railway:"
  echo "  1. In your project, click + New -> Database -> PostgreSQL"
  echo "  2. Open your WEB service (not Postgres) -> Variables"
  echo "  3. New Variable -> Add Reference -> Postgres -> DATABASE_URL"
  echo "  4. Redeploy"
  exit 1
fi

echo "Running prisma migrate deploy..."
npx prisma migrate deploy

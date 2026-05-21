# Railway deployment

## Recommended (permanent database)

1. Project canvas → **+ New** → **Database** → **PostgreSQL**
2. Open your **web app service** → **Variables** → **Add Reference** → Postgres → **`DATABASE_URL`**
3. Add `JWT_SECRET` (random 32+ chars) and `NODE_ENV=production`
4. Redeploy

## If you skip step 1–2

The build auto-provisions a **temporary** Prisma Postgres database when `DATABASE_URL` is missing on Railway. That unblocks deploys, but data may not persist long-term. Use Railway PostgreSQL for the assignment.

## After deploy

- Health: `https://YOUR-DOMAIN/api/health`
- Sign up, create a project, add a task

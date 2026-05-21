# Railway setup (required before deploy succeeds)

Pre-deploy runs database migrations. **You must add Postgres first.**

## 1. Add PostgreSQL

1. Open your [Railway project](https://railway.app/dashboard)
2. Click **+ New** → **Database** → **PostgreSQL**
3. Wait until the database service is **Active**

## 2. Link `DATABASE_URL` to the web service

1. Click your **web app service** (the GitHub repo service — not Postgres)
2. **Variables** tab
3. **+ New Variable** → **Add Reference**
4. Service: **Postgres** → Variable: **`DATABASE_URL`**
5. Save

You should see `DATABASE_URL` listed (value hidden), e.g. `${{Postgres.DATABASE_URL}}`.

## 3. Other variables (same web service)

| Name | Value |
|------|--------|
| `JWT_SECRET` | Long random string (32+ characters) |
| `NODE_ENV` | `production` |

## 4. Redeploy

**Deployments** → **Redeploy** (or push to GitHub).

Success in logs:

- Pre-deploy: `Running prisma migrate deploy...` → `Applied migration`
- Start: `next start` → health check `/api/health` OK

## If pre-deploy still fails

- Postgres and web service are in the **same project**
- `DATABASE_URL` is on the **web** service via **reference**, not typed manually as `localhost`
- Redeploy **after** saving variables

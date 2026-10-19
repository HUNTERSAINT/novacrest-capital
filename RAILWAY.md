# Railway Deployment Guide — Novacrest Capital

Railway runs the schema restore before starting the app. Production database exports,
customer records, and uploaded KYC files are intentionally excluded from Git.
An existing Railway database is preserved; an empty database requires an authorized
private restore file before release can complete.

---

## How It Works

Every Railway deploy runs this sequence automatically:

```
1. Build  →  pnpm install + build frontend + build API
2. Release →  push schema, detect empty DB, load data, fix sequences
3. Start   →  restore the schema again if needed, then serve the app (API + frontend on one URL)
```

The release step (`artifacts/api-server/restore.mjs`) checks for existing users:
- **Existing database** — schema is synchronized and customer data is left in place
- **Empty database** — a private `db/production-seed.sql` must be supplied locally;
  without it, the release fails instead of publishing customer data in Git

---

## Step 1 — Push to GitHub

Railway deploys from a GitHub repo. If you haven't already:

1. In Replit, open the **Git** panel (left sidebar).
2. Commit all files and push to GitHub.
3. Do not commit database dumps, `db/production-seed.sql`, or uploaded backup archives.
   The existing Railway database is the source of production customer data.

---

## Step 2 — Create the Railway Project

1. Go to [railway.app](https://railway.app) → **New Project**.
2. Choose **Deploy from GitHub repo** → select this repository.
3. Railway detects `railway.json` automatically — no extra config needed.

---

## Step 3 — Add PostgreSQL

1. Inside your Railway project, click **+ New** → **Database** → **Add PostgreSQL**.
2. Railway provisions a Postgres database and automatically injects `DATABASE_URL` into your service — nothing to copy manually.

---

## Step 4 — Set Environment Variables

In your Railway **web service** (not the database), go to **Variables** and add:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | A random 64-character string — generate with: `openssl rand -hex 32` |
| `NOVACREST_ADMIN_PASSWORD` | The password to use for `admin@novacrest.com` |

> `DATABASE_URL` is already injected by Railway when you added PostgreSQL. Do not set it manually.

`NOVACREST_ADMIN_PASSWORD` is applied to the existing admin row during every
Railway release/start restore. This keeps the login password in sync with the
value configured in Railway even when the database was seeded previously. The
value must be at least 8 characters and is never written to logs.

---

## Step 5 — Deploy

Click **Deploy**. Railway runs automatically:

**Build** (~2–3 min):
```
pnpm install --frozen-lockfile
pnpm --filter @workspace/kingsaint run build     ← React frontend
pnpm --filter @workspace/api-server run build    ← Express API
```

**Release** (before traffic starts):
```
pnpm --filter @workspace/api-server run restore
```
When the database already has users, the release logs show:
```
📐  Pushing database schema…
✅  Schema up to date.
ℹ️   Database already has users. Skipping seed.
```

If the database is empty and no private seed file is available, the release exits
with an error and Railway does not promote the deployment. Do not add production
exports to Git to work around this.

On subsequent deploys:
```
ℹ️   Database already has users. Skipping seed.
```

The release command performs the restore before the deployment is promoted. The
start command repeats the same idempotent restore as a safety net for Railway
deployments where the release hook was skipped or the database was recreated.

**Start**:
```
NODE_ENV=production pnpm --filter @workspace/api-server run restore && NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs
```

---

## Step 6 — Verify

Once the health check at `/api/healthz` passes, your site is live.

1. Open your Railway URL (e.g. `https://your-project.up.railway.app`).
2. The black and gold landing page loads.
3. Log in as admin: **`admin@novacrest.com`** with the original password.
4. Open **Admin → Wallets** and save a configured payment method.
5. Confirm the user deposit page displays that same active crypto, network, and address.

---

## Step 7 — Custom Domain (Optional)

1. Railway service → **Settings** → **Networking** → **Custom Domain**.
2. Add your domain (e.g. `app.novacrest.com`).
3. Copy the CNAME record Railway provides and add it to your DNS.
4. SSL certificate is provisioned automatically.

---

## Production data and backups

Production customer data, database dumps, and KYC uploads are not stored in this
repository. The restore script synchronizes the schema and skips seeding when the
Railway database already contains users. Keep any recovery seed or backup in an
approved private storage location.

---

## Notes

**Sessions reset on redeploy**
Sessions are stored in memory. When Railway restarts the service, logged-in users are logged out and must sign in again. This is expected — it's a known limitation to address in a future update.

**KYC document files**
The database references 10 KYC document files by UUID. The files themselves (`backup/uploads/` in your original zip) need to be uploaded to object storage (Cloudflare R2, S3, etc.) under an `uploads/` prefix. Until then, document previews in Admin → KYC will be broken — the rest of the admin panel works fine.

**Database recovery**
Do not truncate or reset the production database as part of a deploy. Restore from
a verified private backup using the approved recovery process; the repository does
not contain production customer records.

---

## Quick Reference

| | Command |
|---|---|
| Build | `pnpm install --frozen-lockfile && pnpm --filter @workspace/kingsaint run build && pnpm --filter @workspace/api-server run build` |
| Release | `pnpm --filter @workspace/api-server run restore` |
| Start | `NODE_ENV=production pnpm --filter @workspace/api-server run restore && NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs` |
| Health check | `GET /api/healthz` |
| Private seed file | `db/production-seed.sql` (not committed) |
| Restore script | `artifacts/api-server/restore.mjs` |

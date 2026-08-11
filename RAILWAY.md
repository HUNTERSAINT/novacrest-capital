# Railway Deployment Guide — Novacrest Capital

The database restore is **fully automatic**. When Railway deploys for the first time,
it detects an empty database and loads all your customer data automatically.
You do not need to run any SQL commands manually.

---

## How It Works

Every Railway deploy runs this sequence automatically:

```
1. Build  →  pnpm install + build frontend + build API
2. Release →  push schema, detect empty DB, load data, fix sequences
3. Start   →  serve the app (API + frontend on one URL)
```

The release step (`artifacts/api-server/restore.mjs`) is smart:
- **First deploy** — DB is empty → loads all 15 users, 5 plans, and all customer data
- **Every subsequent deploy** — DB already has data → skips seed automatically

---

## Step 1 — Push to GitHub

Railway deploys from a GitHub repo. If you haven't already:

1. In Replit, open the **Git** panel (left sidebar).
2. Commit all files and push to GitHub.
3. Make sure `db/production-seed.sql` is committed — this is the data file Railway loads.

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

> `DATABASE_URL` is already injected by Railway when you added PostgreSQL. Do not set it manually.

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
You'll see this in the deploy logs on the first deploy:
```
📐  Pushing database schema…
✅  Schema up to date.
🌱  Database is empty — loading production seed…
✅  Production data loaded.
🔢  Resetting ID sequences…
✅  Sequences reset.
🎉  Database restore complete — all customer data is live!
```

On every subsequent deploy:
```
ℹ️   Database already has 15 user(s). Skipping seed.
```

**Start**:
```
NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs
```

---

## Step 6 — Verify

Once the health check at `/api/healthz` passes, your site is live.

1. Open your Railway URL (e.g. `https://your-project.up.railway.app`).
2. The black and gold landing page loads.
3. Log in as admin: **`admin@novacrest.com`** with the original password.
4. Check **Admin → Users** — all 15 customers should be listed.
5. Check **Admin → Transactions** — all transactions present.

---

## Step 7 — Custom Domain (Optional)

1. Railway service → **Settings** → **Networking** → **Custom Domain**.
2. Add your domain (e.g. `app.novacrest.com`).
3. Copy the CNAME record Railway provides and add it to your DNS.
4. SSL certificate is provisioned automatically.

---

## What's Included in the Automatic Restore

| Table | Records |
|---|---|
| users | 15 (including admin account) |
| plans | 5 investment plans |
| transactions | 4 |
| kyc_documents | 5 submissions |
| notifications | 13 |
| chat_sessions | 6 |
| chat_messages | 8 |
| wallet_addresses | 5 |

All customer passwords are preserved (securely hashed — customers keep their existing passwords).

---

## Notes

**Sessions reset on redeploy**
Sessions are stored in memory. When Railway restarts the service, logged-in users are logged out and must sign in again. This is expected — it's a known limitation to address in a future update.

**KYC document files**
The database references 10 KYC document files by UUID. The files themselves (`backup/uploads/` in your original zip) need to be uploaded to object storage (Cloudflare R2, S3, etc.) under an `uploads/` prefix. Until then, document previews in Admin → KYC will be broken — the rest of the admin panel works fine.

**Re-seeding from scratch**
If you ever need to wipe and re-seed (e.g. after resetting the Railway database):
```bash
# Connect to Railway DB then:
TRUNCATE users, plans, transactions, kyc_documents, notifications,
         chat_sessions, chat_messages, investments, referrals,
         trading_signals, copy_trading_strategies, user_copy_trading,
         wallet_addresses RESTART IDENTITY CASCADE;
```
Then trigger a redeploy — the release step will reload everything automatically.

---

## Quick Reference

| | Command |
|---|---|
| Build | `pnpm install --frozen-lockfile && pnpm --filter @workspace/kingsaint run build && pnpm --filter @workspace/api-server run build` |
| Release | `pnpm --filter @workspace/api-server run restore` |
| Start | `NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs` |
| Health check | `GET /api/healthz` |
| Seed file | `db/production-seed.sql` |
| Restore script | `artifacts/api-server/restore.mjs` |

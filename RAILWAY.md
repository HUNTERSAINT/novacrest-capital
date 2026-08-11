# Railway Deployment Guide — Novacrest Capital

This guide walks you through deploying the full Novacrest Capital platform on Railway,
including restoring your production database backup.

**Architecture on Railway:**
- **1 Railway service** — the Express API server also serves the built React frontend (no separate static hosting needed)
- **1 Railway PostgreSQL plugin** — your database
- Both live under a single Railway project and share the same domain

---

## Part 1 — Create the Railway Project

1. Go to [railway.app](https://railway.app) and log in (or create an account).
2. Click **New Project**.
3. Choose **Deploy from GitHub repo** → connect your GitHub account → select this repository.
   - If you haven't pushed this Replit project to GitHub yet, do that first:
     - In Replit, open the Git panel → connect to GitHub → push.
4. Railway will detect the `railway.json` at the repo root and use it automatically.

---

## Part 2 — Add the PostgreSQL Database

1. Inside your Railway project, click **+ New** → **Database** → **Add PostgreSQL**.
2. Railway creates a Postgres instance and automatically injects `DATABASE_URL` into your service's environment — you don't need to copy it manually.
3. Wait ~30 seconds for the database to be ready (status turns green).

---

## Part 3 — Set Environment Variables

In your Railway service (the web/API service, **not** the database), go to **Variables** and add:

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Required — enables static file serving |
| `SESSION_SECRET` | *(random 64-char string)* | Used to sign auth tokens. Generate with: `openssl rand -hex 32` |
| `DATABASE_URL` | *(auto-injected by Railway)* | Already set when you added PostgreSQL — do not override |

> **Tip:** To generate `SESSION_SECRET`, run this in any terminal:
> ```bash
> openssl rand -hex 32
> ```

---

## Part 4 — Deploy

1. Click **Deploy** (or push a new commit — Railway auto-deploys on every push).
2. Railway runs the build command from `railway.json`:
   - Installs all dependencies with `pnpm install`
   - Builds the React frontend → `artifacts/kingsaint/dist/public`
   - Bundles the Express API server → `artifacts/api-server/dist/index.mjs`
3. Railway then starts the server with:
   ```
   NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs
   ```
4. The health check hits `/api/healthz` — when it returns 200, the deploy is live.
5. Railway gives you a public URL like `https://your-project.up.railway.app`.

---

## Part 5 — Restore the Database Backup

Your backup zip (`abc_nov_2_1786420027353.zip`) contains CSV exports of all 13 tables.
Restore them in order (foreign key order matters).

### Step 1 — Get your Railway database connection string

In Railway → your **PostgreSQL** service → **Connect** tab → copy the **Public URL** (it looks like `postgresql://postgres:password@roundhouse.proxy.rlwy.net:12345/railway`).

### Step 2 — Extract the backup

```bash
unzip abc_nov_2_1786420027353.zip
cd backup
```

### Step 3 — Push the schema

Run the schema push against your Railway database (this creates all tables):

```bash
# Replace with your Railway DATABASE_URL
export DATABASE_URL="postgresql://postgres:password@roundhouse.proxy.rlwy.net:PORT/railway"

# Push schema using Drizzle (from repo root)
pnpm --filter @workspace/db run push
```

> **Alternative:** The database schema is also embedded in `backup/novacrest-database.sql`.
> You can apply it directly with:
> ```bash
> grep -v '\\restrict' backup/novacrest-database.sql | psql "$DATABASE_URL"
> ```
> Ignore "already exists" errors — they just mean the table was already created.

### Step 4 — Truncate any seed rows

```bash
psql "$DATABASE_URL" -c "
TRUNCATE chat_messages, chat_sessions, user_copy_trading, investments, referrals,
        kyc_documents, notifications, transactions, wallet_addresses,
        users, plans, trading_signals, copy_trading_strategies
RESTART IDENTITY CASCADE;
"
```

### Step 5 — Import production CSVs

Run this from inside the `backup/production/` folder:

```bash
cd backup/production

for t in users plans copy_trading_strategies trading_signals wallet_addresses \
         kyc_documents notifications chat_sessions chat_messages \
         investments referrals user_copy_trading; do
  echo "Importing $t..."
  psql "$DATABASE_URL" -c "\copy $t FROM '$t.csv' CSV HEADER"
done

# transactions has a special column order — import separately:
psql "$DATABASE_URL" -c "\copy transactions(id,user_id,type,amount,status,crypto_type,wallet_address,tx_hash,notes,created_at,updated_at,proof_url) FROM 'transactions.csv' CSV HEADER"
```

Expected output:
```
Importing users...       COPY 15
Importing plans...       COPY 5
Importing transactions...  COPY 4
Importing kyc_documents... COPY 5
...
```

### Step 6 — Fix ID sequences

After importing, reset the auto-increment sequences so new records don't clash with existing IDs:

```bash
for t in users transactions kyc_documents notifications chat_sessions chat_messages \
         investments plans referrals trading_signals copy_trading_strategies \
         user_copy_trading wallet_addresses; do
  psql "$DATABASE_URL" -c \
    "SELECT setval(pg_get_serial_sequence('$t','id'), COALESCE((SELECT MAX(id) FROM $t),1));"
done
```

### Step 7 — Verify

```bash
psql "$DATABASE_URL" -c "
SELECT 'users' as table_name, count(*) FROM users
UNION ALL SELECT 'plans', count(*) FROM plans
UNION ALL SELECT 'transactions', count(*) FROM transactions
UNION ALL SELECT 'kyc_documents', count(*) FROM kyc_documents
UNION ALL SELECT 'wallet_addresses', count(*) FROM wallet_addresses;
"
```

You should see 15 users, 5 plans, 4 transactions, 5 KYC documents, 5 wallet addresses.

---

## Part 6 — Verify the Live Site

1. Open your Railway URL (e.g. `https://your-project.up.railway.app`).
2. The landing page should load with the black and gold theme.
3. Log in as admin: `admin@novacrest.com` with the original password.
4. Check **Admin → Users** — all 15 customers should be listed.
5. Check **Admin → Transactions** — all transactions should be present.

---

## Part 7 — Custom Domain (Optional)

1. In Railway → your service → **Settings** → **Networking** → **Custom Domain**.
2. Add your domain (e.g. `app.novacrest.com`).
3. Railway provides a CNAME record — add it to your domain's DNS.
4. Railway automatically provisions an SSL certificate (Let's Encrypt).

---

## Known Limitations & Notes

### Sessions reset on redeploy
User sessions are stored in memory. When Railway restarts the service (on every deploy or crash), **all logged-in users are automatically logged out** and must sign in again. This is expected behaviour. To avoid this in future, sessions can be moved to the database (a future improvement).

### KYC document files
The backup includes 10 KYC document files in `backup/uploads/`. These are referenced in the database but the files themselves need to be stored somewhere accessible. Options:
- **Cloudflare R2 / AWS S3**: Upload the files keeping the same UUID filenames under an `uploads/` prefix. Update the storage URL in `artifacts/api-server/src/lib/objectStorage.ts`.
- **For now**: The admin KYC panel will show broken previews until the files are re-uploaded.

### Environment variables on redeploy
Railway preserves all Variables across deploys — you only need to set them once.

---

## Quick Reference — Build & Start Commands

| | Command |
|---|---|
| **Build** | `pnpm install --frozen-lockfile && pnpm --filter @workspace/kingsaint run build && pnpm --filter @workspace/api-server run build` |
| **Start** | `NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs` |
| **Health check** | `GET /api/healthz` → `{"status":"ok"}` |

These are already configured in `railway.json` at the repo root — Railway reads them automatically.

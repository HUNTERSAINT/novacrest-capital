/**
 * Railway release script — runs after every build, before traffic is routed.
 *
 * What it does:
 *  1. Pushes the Drizzle schema (creates / alters tables to match the codebase)
 *  2. Checks whether the database already has data
 *  3. If empty, loads the production seed from db/production-seed.sql
 *  4. Resets all ID sequences so new rows don't collide
 *
 * Run manually:  node artifacts/api-server/restore.mjs
 * On Railway:    configured as the "Release Command" in railway.json
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import crypto from "crypto";
import pg from "pg";

const { Client } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  // ── Step 1: Push schema (idempotent — safe on every deploy) ─────────────────
  console.log("📐  Pushing database schema…");
  try {
    execSync("pnpm --filter @workspace/db run push", {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env },
    });
    console.log("✅  Schema up to date.");
  } catch (err) {
    console.error("❌  Schema push failed:", err.message);
    process.exit(1);
  }

  await client.connect();

  try {
    // ── Step 2: Check if database already has data ───────────────────────────
    const { rows } = await client.query(
      "SELECT COUNT(*)::int AS n FROM public.users"
    );
    const userCount = rows[0].n;

    if (userCount > 0) {
      console.log(`ℹ️   Database already has ${userCount} user(s). Skipping seed.`);

      // ── Reset admin password on every start (idempotent) ──────────────────
      const adminPassword = "Admin@KingSaint2026!";
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(adminPassword, salt, 64).toString("hex");
      const passwordHash = `${salt}:${hash}`;
      await client.query(
        "UPDATE public.users SET password_hash = $1 WHERE email = 'admin@novacrest.com'",
        [passwordHash]
      );
      console.log("🔑  Admin password reset.");
      return;
    }

    // ── Step 3: Load production seed SQL ────────────────────────────────────
    const seedPath = path.join(ROOT, "db", "production-seed.sql");
    console.log("🌱  Database is empty — loading production seed…");

    const sql = readFileSync(seedPath, "utf8");
    await client.query(sql);
    console.log("✅  Production data loaded.");

    // ── Step 4: Reset sequences so new inserts don't collide ────────────────
    const tables = [
      "users", "plans", "transactions", "kyc_documents", "notifications",
      "chat_sessions", "chat_messages", "investments", "referrals",
      "trading_signals", "copy_trading_strategies", "user_copy_trading",
      "wallet_addresses",
    ];

    console.log("🔢  Resetting ID sequences…");
    for (const t of tables) {
      await client.query(
        `SELECT setval(
           pg_get_serial_sequence('${t}', 'id'),
           COALESCE((SELECT MAX(id) FROM public.${t}), 1)
         )`
      );
    }
    console.log("✅  Sequences reset.");
    console.log("🎉  Database restore complete — all customer data is live!");

  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌  Restore failed:", err);
  process.exit(1);
});

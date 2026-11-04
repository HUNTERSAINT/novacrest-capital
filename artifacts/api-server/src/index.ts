import app from "./app";
import { logger } from "./lib/logger";
import { settleMaturedInvestments } from "./lib/investment-settlement";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, generateReferralCode, normalizeEmail } from "./lib/auth.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function bootstrapAdminFromEnvironment(): Promise<void> {
  const emailValue = process.env.NOVACREST_ADMIN_EMAIL;
  const password = process.env.NOVACREST_ADMIN_PASSWORD;
  if (!emailValue || !password) return;

  const email = normalizeEmail(emailValue);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 16 || password.length > 128) {
    throw new Error("NOVACREST admin bootstrap credentials are invalid; use a valid email and a 16-128 character password.");
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  const passwordHash = hashPassword(password);
  if (existing) {
    await db.update(usersTable).set({
      passwordHash,
      fullName: "NovaCrest Administrator",
      role: "admin",
      status: "active",
      updatedAt: new Date(),
    }).where(eq(usersTable.id, existing.id));
  } else {
    await db.insert(usersTable).values({
      email,
      passwordHash,
      fullName: "NovaCrest Administrator",
      role: "admin",
      status: "active",
      referralCode: generateReferralCode(),
    });
  }
  logger.info("NovaCrest bootstrap administrator credentials applied");
}

void bootstrapAdminFromEnvironment().then(() => app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Run once at startup, then every minute. The settlement operation is
  // transactional and idempotent, so overlapping runs/replicas are safe.
  void settleMaturedInvestments().catch((error) => {
    logger.error({ err: error }, "Initial investment settlement run failed");
  });

  setInterval(() => {
    void settleMaturedInvestments().catch((error) => {
      logger.error({ err: error }, "Scheduled investment settlement run failed");
    });
  }, 60_000);
})).catch((error) => {
  logger.error({ err: error }, "NovaCrest admin bootstrap failed");
  process.exit(1);
});

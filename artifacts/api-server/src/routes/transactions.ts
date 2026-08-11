import { Router } from "express";
import { db, transactionsTable, usersTable } from "@workspace/db";
import { notifyAdmins, sendAdminPushNotifications } from "../lib/notifications.js";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import {
  GetTransactionsQueryParams,
  GetTransactionsResponse,
  CreateTransactionBody,
  CreateTransactionResponse,
} from "@workspace/api-zod";

const router = Router();

function formatTransaction(tx: typeof transactionsTable.$inferSelect, userEmail?: string | null, userFullName?: string | null) {
  return {
    id: tx.id,
    userId: tx.userId,
    userEmail: userEmail ?? null,
    userFullName: userFullName ?? null,
    type: tx.type,
    amount: tx.amount,
    status: tx.status,
    cryptoType: tx.cryptoType,
    walletAddress: tx.walletAddress ?? null,
    txHash: tx.txHash ?? null,
    notes: tx.notes ?? null,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

router.get("/transactions", requireAuth, async (req, res): Promise<void> => {
  const query = GetTransactionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [eq(transactionsTable.userId, req.userId!)];

  const transactions = await db
    .select()
    .from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(query.data.limit ?? 20);

  const filtered = transactions.filter(tx => {
    if (query.data.type && tx.type !== query.data.type) return false;
    if (query.data.status && tx.status !== query.data.status) return false;
    return true;
  });

  res.json(GetTransactionsResponse.parse(filtered.map(tx => formatTransaction(tx))));
});

router.post("/transactions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tx] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: parsed.data.type,
    amount: parsed.data.amount,
    status: "pending",
    cryptoType: parsed.data.cryptoType,
    walletAddress: parsed.data.walletAddress,
    txHash: parsed.data.txHash,
    proofUrl: (req.body as { proofUrl?: string }).proofUrl ?? null,
  }).returning();

  // Notify admins of deposit or withdrawal request
  const [submitter] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const isDeposit = parsed.data.type === "deposit";
  const txTitle = isDeposit ? "New Deposit Request" : "New Withdrawal Request";
  const txMessage = `${submitter?.fullName ?? "A member"} submitted a ${parsed.data.type} of $${parseFloat(parsed.data.amount).toLocaleString()} (${parsed.data.cryptoType}).`;
  notifyAdmins({
    type: isDeposit ? "admin_deposit_request" : "admin_withdrawal_request",
    title: txTitle,
    message: txMessage,
  }).catch(() => {});
  sendAdminPushNotifications({
    title: txTitle,
    body: txMessage,
    data: { section: "transactions" },
  }).catch(() => {});

  res.status(201).json(CreateTransactionResponse.parse(formatTransaction(tx)));
});

export default router;

import { Router } from "express";
import { db, usersTable, transactionsTable, investmentsTable, plansTable, walletAddressesTable, notificationsTable, kycDocumentsTable, tradingSignalsTable, copyTradingStrategiesTable, userCopyTradingTable } from "@workspace/db";
import { eq, count, sum, and, ilike, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/auth.js";
import { createSession } from "../lib/sessions.js";
import {
  GetAdminStatsResponse,
  GetAdminUsersQueryParams,
  GetAdminUsersResponse,
  GetAdminUserParams,
  GetAdminUserResponse,
  UpdateAdminUserParams,
  UpdateAdminUserBody,
  UpdateAdminUserResponse,
  GetAdminTransactionsQueryParams,
  GetAdminTransactionsResponse,
  ApproveTransactionParams,
  RejectTransactionParams,
  RejectTransactionBody,
  ApproveTransactionResponse,
  RejectTransactionResponse,
  CreatePlanBody,
  CreatePlanResponse,
  UpdatePlanParams,
  UpdatePlanBody,
  UpdatePlanResponse,
  DeletePlanParams,
  CreditUserBody,
  CreditUserResponse,
  DeductUserBody,
  DeductUserResponse,
} from "@workspace/api-zod";

const router = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone ?? null,
    country: user.country ?? null,
    role: user.role,
    status: user.status,
    balance: user.balance,
    totalInvested: user.totalInvested,
    totalProfit: user.totalProfit,
    referralCode: user.referralCode,
    referredBy: user.referredBy ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

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

function formatPlan(plan: typeof plansTable.$inferSelect) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    minAmount: plan.minAmount,
    maxAmount: plan.maxAmount ?? null,
    roiPercent: plan.roiPercent,
    durationDays: plan.durationDays,
    tier: plan.tier,
    isActive: plan.isActive,
    features: plan.features,
    createdAt: plan.createdAt.toISOString(),
  };
}

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const allUsers = await db.select().from(usersTable);
  const allInvestments = await db.select().from(investmentsTable);
  const allTransactions = await db.select().from(transactionsTable);

  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter(u => u.status === "active").length;
  const totalInvested = allUsers.reduce((s, u) => s + u.totalInvested, 0);
  const totalPaidOut = allTransactions
    .filter(t => t.type === "withdrawal" && t.status === "completed")
    .reduce((s, t) => s + t.amount, 0);
  const pendingWithdrawals = allTransactions
    .filter(t => t.type === "withdrawal" && t.status === "pending").length;
  const activeInvestments = allInvestments.filter(i => i.status === "active").length;

  const today = new Date().toISOString().split("T")[0];
  const newUsersToday = allUsers.filter(u => u.createdAt.toISOString().startsWith(today)).length;

  const platformRevenue = allTransactions
    .filter(t => t.type === "profit" && t.status === "completed")
    .reduce((s, t) => s + t.amount, 0);

  res.json(GetAdminStatsResponse.parse({
    totalUsers,
    activeUsers,
    totalInvested,
    totalPaidOut,
    pendingWithdrawals,
    totalTransactions: allTransactions.length,
    platformRevenue,
    newUsersToday,
    activeInvestments,
  }));
});

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const query = GetAdminUsersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const allUsers = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));

  let filtered = allUsers;
  if (query.data.status) {
    filtered = filtered.filter(u => u.status === query.data.status);
  }
  if (query.data.search) {
    const s = query.data.search.toLowerCase();
    filtered = filtered.filter(u =>
      u.email.toLowerCase().includes(s) || u.fullName.toLowerCase().includes(s)
    );
  }

  const total = filtered.length;
  const offset = query.data.offset ?? 0;
  const limit = query.data.limit ?? 20;
  const paginated = filtered.slice(offset, offset + limit);

  res.json(GetAdminUsersResponse.parse({ users: paginated.map(formatUser), total }));
});

router.get("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const investments = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, params.data.id));
  const transactions = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, params.data.id)).orderBy(desc(transactionsTable.createdAt));

  res.json(GetAdminUserResponse.parse({
    user: formatUser(user),
    investments: investments.map(i => ({
      id: i.id,
      userId: i.userId,
      planId: i.planId,
      planName: i.planName,
      planTier: i.planTier ?? null,
      amount: i.amount,
      roiPercent: i.roiPercent,
      durationDays: i.durationDays,
      status: i.status,
      startDate: i.startDate,
      endDate: i.endDate,
      profitEarned: i.profitEarned,
      createdAt: i.createdAt.toISOString(),
    })),
    transactions: transactions.map(tx => formatTransaction(tx, user.email, user.fullName)),
  }));
});

router.patch("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateAdminUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAdminUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(UpdateAdminUserResponse.parse(formatUser(user)));
});

router.get("/admin/transactions", requireAdmin, async (req, res): Promise<void> => {
  const query = GetAdminTransactionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const allTx = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));

  let filtered = allTx;
  if (query.data.status) {
    filtered = filtered.filter(t => t.status === query.data.status);
  }

  const offset = query.data.offset ?? 0;
  const limit = query.data.limit ?? 20;
  const paginated = filtered.slice(offset, offset + limit);

  res.json(GetAdminTransactionsResponse.parse(
    paginated.map(tx => {
      const user = userMap.get(tx.userId);
      return formatTransaction(tx, user?.email, user?.fullName);
    })
  ));
});

router.post("/admin/transactions/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const params = ApproveTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, params.data.id));
  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  if (tx.status !== "pending") {
    res.status(400).json({ error: "Transaction is not pending" });
    return;
  }

  const [updated] = await db
    .update(transactionsTable)
    .set({ status: "completed" })
    .where(eq(transactionsTable.id, params.data.id))
    .returning();

  // If withdrawal approved, deduct from balance
  if (tx.type === "withdrawal") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
    if (user) {
      await db.update(usersTable).set({ balance: Math.max(0, user.balance - tx.amount) }).where(eq(usersTable.id, tx.userId));
    }
  }
  // If deposit approved, add to balance
  if (tx.type === "deposit") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId));
    if (user) {
      await db.update(usersTable).set({ balance: user.balance + tx.amount }).where(eq(usersTable.id, tx.userId));
    }
  }

  // Notify user
  await db.insert(notificationsTable).values({
    userId: tx.userId,
    type: tx.type === "deposit" ? "deposit_approved" : "withdrawal_approved",
    title: tx.type === "deposit" ? "Deposit Approved" : "Withdrawal Approved",
    message: `Your ${tx.type} of $${tx.amount.toLocaleString()} has been approved.`,
  }).catch(() => {});

  res.json(ApproveTransactionResponse.parse(formatTransaction(updated)));
});

router.post("/admin/transactions/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const params = RejectTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = RejectTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(transactionsTable)
    .set({ status: "cancelled", notes: parsed.data.reason })
    .where(eq(transactionsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  // Notify user
  if (updated) {
    await db.insert(notificationsTable).values({
      userId: updated.userId,
      type: updated.type === "deposit" ? "deposit_rejected" : "withdrawal_rejected",
      title: updated.type === "deposit" ? "Deposit Rejected" : "Withdrawal Rejected",
      message: `Your ${updated.type} of $${updated.amount.toLocaleString()} was rejected. ${parsed.data.reason ?? ""}`.trim(),
    }).catch(() => {});
  }

  res.json(RejectTransactionResponse.parse(formatTransaction(updated)));
});

router.post("/admin/plans", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [plan] = await db.insert(plansTable).values({
    name: parsed.data.name,
    description: parsed.data.description,
    minAmount: parsed.data.minAmount,
    maxAmount: parsed.data.maxAmount,
    roiPercent: parsed.data.roiPercent,
    durationDays: parsed.data.durationDays,
    tier: parsed.data.tier,
    features: parsed.data.features,
    isActive: true,
  }).returning();
  res.status(201).json(CreatePlanResponse.parse(formatPlan(plan)));
});

router.patch("/admin/plans/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdatePlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [plan] = await db
    .update(plansTable)
    .set(parsed.data)
    .where(eq(plansTable.id, params.data.id))
    .returning();
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(UpdatePlanResponse.parse(formatPlan(plan)));
});

router.delete("/admin/plans/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeletePlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(plansTable).where(eq(plansTable.id, params.data.id));
  res.sendStatus(204);
});

// ── Wallet Address Management ────────────────────────────────────────────────

const WalletAddressBody = z.object({
  cryptoType: z.string().min(1),
  network: z.string().default(""),
  label: z.string().min(1),
  address: z.string().min(10),
  isActive: z.boolean().default(true),
});

const WalletAddressUpdateBody = z.object({
  cryptoType: z.string().min(1).optional(),
  network: z.string().optional(),
  label: z.string().min(1).optional(),
  address: z.string().min(10).optional(),
  isActive: z.boolean().optional(),
});

router.get("/admin/wallets", requireAdmin, async (_req, res): Promise<void> => {
  const wallets = await db
    .select()
    .from(walletAddressesTable)
    .orderBy(walletAddressesTable.cryptoType);
  res.json(wallets);
});

router.post("/admin/wallets", requireAdmin, async (req, res): Promise<void> => {
  const parsed = WalletAddressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [wallet] = await db
    .insert(walletAddressesTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(wallet);
});

router.patch("/admin/wallets/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = WalletAddressUpdateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [wallet] = await db
    .update(walletAddressesTable)
    .set(parsed.data)
    .where(eq(walletAddressesTable.id, id))
    .returning();
  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }
  res.json(wallet);
});

router.delete("/admin/wallets/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(walletAddressesTable).where(eq(walletAddressesTable.id, id));
  res.json({ message: "Wallet deleted" });
});

// ── Credit User ──────────────────────────────────────────────────────────────

router.post("/admin/credit-user", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreditUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId, amount, type, notes } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const updateData: Partial<typeof usersTable.$inferSelect> = {
    balance: user.balance + amount,
  };
  if (type === "profit") {
    updateData.totalProfit = user.totalProfit + amount;
  }
  await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId));

  await db.insert(transactionsTable).values({
    userId,
    type: type as "bonus" | "profit" | "deposit",
    amount,
    status: "completed",
    cryptoType: "USD",
    notes,
  });

  res.json(CreditUserResponse.parse({ message: `Successfully credited $${amount} to user` }));
});

// ── Deduct User ──────────────────────────────────────────────────────────────

router.post("/admin/deduct-user", requireAdmin, async (req, res): Promise<void> => {
  const parsed = DeductUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId, amount, reason } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (amount > user.balance) {
    res.status(400).json({ error: `Deduction amount ($${amount}) exceeds user balance ($${user.balance})` });
    return;
  }

  await db.update(usersTable)
    .set({ balance: user.balance - amount })
    .where(eq(usersTable.id, userId));

  await db.insert(transactionsTable).values({
    userId,
    type: "withdrawal",
    amount,
    status: "completed",
    cryptoType: "USD",
    notes: reason,
  });

  res.json(DeductUserResponse.parse({ message: `Successfully deducted $${amount} from user` }));
});

// ── KYC Management ───────────────────────────────────────────────────────────

router.get("/admin/kyc", requireAdmin, async (_req, res): Promise<void> => {
  const kycs = await db.select().from(kycDocumentsTable).orderBy(kycDocumentsTable.submittedAt);
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json({
    kycs: kycs.map(k => ({
      ...k,
      submittedAt: k.submittedAt.toISOString(),
      reviewedAt: k.reviewedAt?.toISOString() ?? null,
      userEmail: userMap.get(k.userId)?.email ?? null,
      userFullName: userMap.get(k.userId)?.fullName ?? null,
    })),
  });
});

const KycUpdateBody = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNotes: z.string().optional(),
});

router.patch("/admin/kyc/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = KycUpdateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [doc] = await db
    .update(kycDocumentsTable)
    .set({ status: parsed.data.status, adminNotes: parsed.data.adminNotes, reviewedAt: new Date() })
    .where(eq(kycDocumentsTable.id, id))
    .returning();
  if (!doc) { res.status(404).json({ error: "KYC not found" }); return; }

  await db.insert(notificationsTable).values({
    userId: doc.userId,
    type: `kyc_${parsed.data.status}`,
    title: parsed.data.status === "approved" ? "KYC Verified ✓" : "KYC Rejected",
    message: parsed.data.status === "approved"
      ? "Your identity has been verified. Your account is now fully activated."
      : `Your KYC was rejected. ${parsed.data.adminNotes ?? "Please resubmit."}`,
  }).catch(() => {});

  res.json({ ...doc, submittedAt: doc.submittedAt.toISOString(), reviewedAt: doc.reviewedAt?.toISOString() ?? null });
});

// ── Trading Signals ───────────────────────────────────────────────────────────

const SignalBody = z.object({
  title: z.string().min(1),
  asset: z.string().min(1),
  action: z.enum(["buy", "sell", "hold"]),
  entryPrice: z.string().optional(),
  targetPrice: z.string().optional(),
  stopLoss: z.string().optional(),
  timeframe: z.enum(["short_term", "mid_term", "long_term"]).default("short_term"),
  status: z.enum(["active", "completed", "expired"]).default("active"),
  notes: z.string().optional(),
});

function fmtSignal(s: typeof tradingSignalsTable.$inferSelect) {
  return { ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() };
}

router.get("/admin/signals", requireAdmin, async (_req, res): Promise<void> => {
  const signals = await db.select().from(tradingSignalsTable).orderBy(tradingSignalsTable.createdAt);
  res.json({ signals: signals.map(fmtSignal) });
});

router.post("/admin/signals", requireAdmin, async (req, res): Promise<void> => {
  const parsed = SignalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [signal] = await db.insert(tradingSignalsTable).values(parsed.data).returning();
  res.status(201).json(fmtSignal(signal));
});

router.patch("/admin/signals/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = SignalBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [signal] = await db.update(tradingSignalsTable).set(parsed.data).where(eq(tradingSignalsTable.id, id)).returning();
  if (!signal) { res.status(404).json({ error: "Signal not found" }); return; }
  res.json(fmtSignal(signal));
});

router.delete("/admin/signals/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(tradingSignalsTable).where(eq(tradingSignalsTable.id, id));
  res.sendStatus(204);
});

// ── Copy Trading Strategies ───────────────────────────────────────────────────

const StrategyBody = z.object({
  name: z.string().min(1),
  managerName: z.string().min(1),
  description: z.string().min(1),
  monthlyRoi: z.number().positive(),
  riskLevel: z.enum(["low", "medium", "high"]).default("medium"),
  minAmount: z.number().positive().default(100),
  winRate: z.number().min(0).max(100).default(0),
  isActive: z.boolean().default(true),
});

function fmtStrategy(s: typeof copyTradingStrategiesTable.$inferSelect) {
  return { ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() };
}

router.get("/admin/copy-trading/strategies", requireAdmin, async (_req, res): Promise<void> => {
  const strategies = await db.select().from(copyTradingStrategiesTable).orderBy(copyTradingStrategiesTable.createdAt);
  res.json({ strategies: strategies.map(fmtStrategy) });
});

router.post("/admin/copy-trading/strategies", requireAdmin, async (req, res): Promise<void> => {
  const parsed = StrategyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [strategy] = await db.insert(copyTradingStrategiesTable).values(parsed.data).returning();
  res.status(201).json(fmtStrategy(strategy));
});

router.patch("/admin/copy-trading/strategies/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = StrategyBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [strategy] = await db.update(copyTradingStrategiesTable).set(parsed.data).where(eq(copyTradingStrategiesTable.id, id)).returning();
  if (!strategy) { res.status(404).json({ error: "Strategy not found" }); return; }
  res.json(fmtStrategy(strategy));
});

router.delete("/admin/copy-trading/strategies/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(copyTradingStrategiesTable).where(eq(copyTradingStrategiesTable.id, id));
  res.sendStatus(204);
});

/** POST /admin/impersonate/:userId — generate a session token as that user */
router.post("/admin/impersonate/:userId", requireAdmin, async (req, res): Promise<void> => {
  const targetId = parseInt(req.params.userId ?? "0");
  if (!targetId) { res.status(400).json({ error: "Invalid user id" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.role === "admin") { res.status(400).json({ error: "Cannot impersonate another admin" }); return; }
  const token = createSession(targetId);
  res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
});

export default router;

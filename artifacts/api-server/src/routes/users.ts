import { Router } from "express";
import { db, usersTable, transactionsTable, investmentsTable } from "@workspace/db";
import { eq, desc, and, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { hashPassword, verifyPassword } from "../lib/auth.js";
import {
  UpdateProfileBody,
  UpdateProfileResponse,
  ChangePasswordBody,
  ChangePasswordResponse,
  GetDashboardResponse,
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

router.patch("/users/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, req.userId!))
    .returning();
  res.json(UpdateProfileResponse.parse(formatUser(user)));
});

router.post("/users/change-password", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    res.status(400).json({ error: "Current password is incorrect" });
    return;
  }
  await db
    .update(usersTable)
    .set({ passwordHash: hashPassword(parsed.data.newPassword) })
    .where(eq(usersTable.id, req.userId!));
  res.json(ChangePasswordResponse.parse({ message: "Password changed successfully" }));
});

router.get("/users/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  // Active investments count
  const allInvestments = await db
    .select()
    .from(investmentsTable)
    .where(and(eq(investmentsTable.userId, userId), eq(investmentsTable.status, "active")));

  // Pending withdrawals
  const pendingWithdrawals = await db
    .select()
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.userId, userId),
      eq(transactionsTable.type, "withdrawal"),
      eq(transactionsTable.status, "pending"),
    ));

  // Recent transactions
  const recentTx = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(10);

  // Simple growth points (last 7 days of profit)
  const growthPoints = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    growthPoints.push({
      date: d.toISOString().split("T")[0],
      value: Math.round(user.totalProfit * (1 - i * 0.05) * 100) / 100,
    });
  }

  res.json(GetDashboardResponse.parse({
    balance: user.balance,
    totalInvested: user.totalInvested,
    totalProfit: user.totalProfit,
    activeInvestments: allInvestments.length,
    pendingWithdrawals: pendingWithdrawals.length,
    recentTransactions: recentTx.map(tx => ({
      id: tx.id,
      userId: tx.userId,
      userEmail: null,
      userFullName: null,
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      cryptoType: tx.cryptoType,
      walletAddress: tx.walletAddress ?? null,
      txHash: tx.txHash ?? null,
      notes: tx.notes ?? null,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
    })),
    investmentGrowth: growthPoints,
  }));
});

export default router;

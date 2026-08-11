import { Router } from "express";
import { db, investmentsTable, plansTable, usersTable, transactionsTable, referralsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { createNotification } from "../lib/notifications.js";
import {
  GetInvestmentsResponse,
  GetInvestmentResponse,
  GetInvestmentParams,
  CreateInvestmentBody,
  CreateInvestmentResponse,
} from "@workspace/api-zod";

const router = Router();

function formatInvestment(inv: typeof investmentsTable.$inferSelect) {
  return {
    id: inv.id,
    userId: inv.userId,
    planId: inv.planId,
    planName: inv.planName,
    planTier: inv.planTier ?? null,
    amount: inv.amount,
    roiPercent: inv.roiPercent,
    durationDays: inv.durationDays,
    status: inv.status,
    startDate: inv.startDate,
    endDate: inv.endDate,
    profitEarned: inv.profitEarned,
    compounding: inv.compounding,
    createdAt: inv.createdAt.toISOString(),
  };
}

router.get("/investments", requireAuth, async (req, res): Promise<void> => {
  const investments = await db
    .select()
    .from(investmentsTable)
    .where(eq(investmentsTable.userId, req.userId!))
    .orderBy(investmentsTable.createdAt);
  res.json(GetInvestmentsResponse.parse(investments.map(formatInvestment)));
});

router.post("/investments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateInvestmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { planId, amount, cryptoType, walletAddress } = parsed.data;
  const compounding = req.body.compounding === true;

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId));
  if (!plan || !plan.isActive) {
    res.status(400).json({ error: "Investment plan not found or inactive" });
    return;
  }
  if (amount < plan.minAmount) {
    res.status(400).json({ error: `Minimum investment is $${plan.minAmount}` });
    return;
  }
  if (plan.maxAmount && amount > plan.maxAmount) {
    res.status(400).json({ error: `Maximum investment is $${plan.maxAmount}` });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (user.balance < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const startDate = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  await db
    .update(usersTable)
    .set({
      balance: user.balance - amount,
      totalInvested: user.totalInvested + amount,
    })
    .where(eq(usersTable.id, req.userId!));

  const [investment] = await db.insert(investmentsTable).values({
    userId: req.userId!,
    planId,
    planName: plan.name,
    planTier: plan.tier,
    amount,
    roiPercent: plan.roiPercent,
    durationDays: plan.durationDays,
    status: "active",
    startDate,
    endDate,
    profitEarned: 0,
    cryptoType,
    walletAddress,
    compounding,
  }).returning();

  await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "deposit",
    amount,
    status: "completed",
    cryptoType,
    walletAddress,
    notes: `Investment in ${plan.name} plan${compounding ? " (compounding)" : ""}`,
  });

  // ── Multi-level referral bonuses ─────────────────────────────────────────
  if (user.referredBy) {
    // L1 referrer: 5% commission
    const [l1] = await db.select().from(usersTable).where(eq(usersTable.referralCode, user.referredBy));
    if (l1) {
      const l1Bonus = Math.round(amount * 0.05 * 100) / 100;
      await db.update(usersTable).set({ balance: l1.balance + l1Bonus }).where(eq(usersTable.id, l1.id));
      await db.insert(transactionsTable).values({
        userId: l1.id,
        type: "bonus",
        amount: l1Bonus,
        status: "completed",
        cryptoType: "USD",
        notes: `Level 1 referral commission from ${user.fullName}`,
      });
      // Update referral record bonus
      await db
        .update(referralsTable)
        .set({ bonusEarned: l1Bonus })
        .where(and(eq(referralsTable.referrerId, l1.id), eq(referralsTable.referredUserId, user.id)));
      await createNotification(l1.id, "referral_bonus", "Referral Commission Earned", `You earned a $${l1Bonus.toFixed(2)} L1 commission from ${user.fullName}'s investment.`);

      // L2 referrer: 2% commission
      if (l1.referredBy) {
        const [l2] = await db.select().from(usersTable).where(eq(usersTable.referralCode, l1.referredBy));
        if (l2) {
          const l2Bonus = Math.round(amount * 0.02 * 100) / 100;
          await db.update(usersTable).set({ balance: l2.balance + l2Bonus }).where(eq(usersTable.id, l2.id));
          await db.insert(transactionsTable).values({
            userId: l2.id,
            type: "bonus",
            amount: l2Bonus,
            status: "completed",
            cryptoType: "USD",
            notes: `Level 2 referral commission from ${user.fullName} (via ${l1.fullName})`,
          });
          await createNotification(l2.id, "referral_bonus", "L2 Referral Commission Earned", `You earned a $${l2Bonus.toFixed(2)} L2 commission from ${user.fullName}'s investment.`);
        }
      }
    }
  }

  await createNotification(req.userId!, "investment_started", "Investment Activated", `Your $${amount.toLocaleString()} investment in ${plan.name} is now active. Expected return: $${(amount * plan.roiPercent / 100).toFixed(2)}.`);

  res.status(201).json(CreateInvestmentResponse.parse(formatInvestment(investment)));
});

router.get("/investments/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetInvestmentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [investment] = await db
    .select()
    .from(investmentsTable)
    .where(and(
      eq(investmentsTable.id, params.data.id),
      eq(investmentsTable.userId, req.userId!),
    ));
  if (!investment) {
    res.status(404).json({ error: "Investment not found" });
    return;
  }
  res.json(GetInvestmentResponse.parse(formatInvestment(investment)));
});

export default router;

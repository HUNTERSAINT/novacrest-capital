import { Router } from "express";
import { randomInt } from "node:crypto";
import { db, investmentsTable, usersTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/auth.js";
import { createNotification, notifyAdmins, notifyUserPush, notifyUserEmail } from "../lib/notifications.js";

const router = Router();

router.get("/admin/investments", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select({
    id: investmentsTable.id,
    userId: investmentsTable.userId,
    planId: investmentsTable.planId,
    planName: investmentsTable.planName,
    planTier: investmentsTable.planTier,
    amount: investmentsTable.amount,
    roiPercent: investmentsTable.roiPercent,
    durationDays: investmentsTable.durationDays,
    status: investmentsTable.status,
    startDate: investmentsTable.startDate,
    endDate: investmentsTable.endDate,
    slowSignalApplied: investmentsTable.slowSignalApplied,
    slowSignalActive: investmentsTable.slowSignalActive,
    slowSignalDays: investmentsTable.slowSignalDays,
    slowSignalOriginalEndDate: investmentsTable.slowSignalOriginalEndDate,
    slowSignalAppliedAt: investmentsTable.slowSignalAppliedAt,
    slowSignalAdminId: investmentsTable.slowSignalAdminId,
    slowSignalReason: investmentsTable.slowSignalReason,
    highMarketVolatilityActive: investmentsTable.highMarketVolatilityActive,
    highMarketVolatilityAppliedAt: investmentsTable.highMarketVolatilityAppliedAt,
    highMarketVolatilityDeadline: investmentsTable.highMarketVolatilityDeadline,
    highMarketVolatilityAdminId: investmentsTable.highMarketVolatilityAdminId,
    profitEarned: investmentsTable.profitEarned,
    createdAt: investmentsTable.createdAt,
    userName: usersTable.fullName,
    userEmail: usersTable.email,
  }).from(investmentsTable)
    .leftJoin(usersTable, eq(investmentsTable.userId, usersTable.id))
    .orderBy(desc(investmentsTable.createdAt));

  const planMap = new Map<string, { planId: number; planName: string; totalAmount: number; investmentCount: number; activeCount: number; investors: typeof rows }>();
  for (const row of rows) {
    const key = String(row.planId);
    const current = planMap.get(key) ?? {
      planId: row.planId, planName: row.planName, totalAmount: 0,
      investmentCount: 0, activeCount: 0, investors: [],
    };
    current.totalAmount += row.amount;
    current.investmentCount += 1;
    if (row.status === "active") current.activeCount += 1;
    current.investors.push(row);
    planMap.set(key, current);
  }

  res.json({
    totalInvested: rows.reduce((sum, row) => sum + row.amount, 0),
    totalInvestments: rows.length,
    activeInvestments: rows.filter(row => row.status === "active").length,
    plans: Array.from(planMap.values()).sort((a, b) => b.totalAmount - a.totalAmount),
    investments: rows,
  });
});

const MaturityUpdate = z.object({
  endDate: z.string().min(10).refine((value) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
    return !Number.isNaN(Date.parse(value));
  }, "Maturity must be a valid date or an ISO date-time with timezone"),
});

router.patch("/admin/investments/:id/maturity", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid investment ID" });
    return;
  }
  const parsed = MaturityUpdate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [investment] = await db.select().from(investmentsTable)
    .where(eq(investmentsTable.id, id)).limit(1);
  if (!investment) {
    res.status(404).json({ error: "Investment not found" });
    return;
  }
  if (investment.status !== "active") {
    res.status(409).json({ error: "Only active investments can have their maturity date changed" });
    return;
  }

  const [updated] = await db.update(investmentsTable)
    .set({ endDate: parsed.data.endDate })
    .where(and(eq(investmentsTable.id, id), eq(investmentsTable.status, "active")))
    .returning();

  if (!updated) {
    res.status(409).json({ error: "Investment is no longer active" });
    return;
  }
  res.json({ id: updated.id, endDate: updated.endDate, status: updated.status });
});


router.post("/admin/investments/:id/slow-signal", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid investment ID" });
    return;
  }
  const [investment] = await db.select().from(investmentsTable)
    .where(eq(investmentsTable.id, id)).limit(1);
  if (!investment) {
    res.status(404).json({ error: "Investment not found" });
    return;
  }
  if (investment.status !== "active") {
    res.status(409).json({ error: "Slow Signal Mode can only be applied to active investments." });
    return;
  }
  if (investment.slowSignalApplied) {
    res.status(409).json({ error: "Slow Signal Mode has already been applied to this investment." });
    return;
  }

  const originalEndDate = investment.endDate;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(originalEndDate);
  const baseDate = new Date(isDateOnly ? `${originalEndDate}T00:00:00.000Z` : originalEndDate);
  if (Number.isNaN(baseDate.getTime())) {
    res.status(409).json({ error: "The investment has an invalid maturity date." });
    return;
  }
  if (baseDate.getTime() <= Date.now()) {
    res.status(409).json({ error: "Slow Signal Mode must be applied before the investment's maturity date." });
    return;
  }

  const delayDays = randomInt(10, 15);
  const extendedDate = new Date(baseDate.getTime() + delayDays * 24 * 60 * 60 * 1000);
  const newEndDate = isDateOnly ? extendedDate.toISOString().slice(0, 10) : extendedDate.toISOString();
  const appliedAt = new Date();

  // Conditional update prevents duplicate application and races with settlement.
  const [updated] = await db.update(investmentsTable)
    .set({
      endDate: newEndDate,
      slowSignalApplied: true,
      slowSignalActive: true,
      slowSignalDays: delayDays,
      slowSignalOriginalEndDate: originalEndDate,
      slowSignalAppliedAt: appliedAt,
      slowSignalAdminId: req.userId!,
      slowSignalReason: null,
    })
    .where(and(
      eq(investmentsTable.id, id),
      eq(investmentsTable.status, "active"),
      eq(investmentsTable.slowSignalApplied, false),
      eq(investmentsTable.endDate, originalEndDate),
    ))
    .returning({
      id: investmentsTable.id,
      userId: investmentsTable.userId,
      planName: investmentsTable.planName,
      endDate: investmentsTable.endDate,
    });

  if (!updated) {
    res.status(409).json({ error: "Investment changed or was settled. Refresh and try again." });
    return;
  }

  const originalDisplay = isDateOnly ? originalEndDate : new Date(originalEndDate).toISOString();
  const newDisplay = isDateOnly ? newEndDate : new Date(newEndDate).toISOString();
  const message = `Slow Signal Mode was applied to your ${updated.planName} investment #${updated.id}. Maturity changed from ${originalDisplay} UTC to ${newDisplay} UTC (+${delayDays} days). Please contact our support team to understand why this adjustment was made.`;

  await createNotification({
    userId: updated.userId,
    type: "investment_slow_signal",
    title: "Investment maturity updated",
    message,
  });
  await notifyUserPush(updated.userId, "Investment maturity updated", message);
  await notifyUserEmail(updated.userId, "Investment maturity updated", message);
  await notifyAdmins({
    type: "admin_slow_signal_applied",
    title: "Slow Signal Mode applied",
    message: `Admin #${req.userId} applied Slow Signal Mode to investment #${updated.id} (user #${updated.userId}); ${delayDays} days added. New maturity: ${newEndDate}.`,
  });

  res.json({
    id: updated.id,
    slowSignalApplied: true,
    slowSignalDays: delayDays,
    originalEndDate,
    endDate: updated.endDate,
    slowSignalAppliedAt: appliedAt.toISOString(),
  });
});

router.post("/admin/investments/:id/slow-signal/off", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid investment ID" });
    return;
  }

  const [investment] = await db.select().from(investmentsTable)
    .where(eq(investmentsTable.id, id)).limit(1);
  if (!investment) {
    res.status(404).json({ error: "Investment not found" });
    return;
  }
  if (investment.status !== "active") {
    res.status(409).json({ error: "Slow Signal Mode can only be turned off for active investments." });
    return;
  }
  if (!investment.slowSignalApplied || !investment.slowSignalActive || !investment.slowSignalOriginalEndDate) {
    res.status(409).json({ error: "Slow Signal Mode is not currently active for this investment." });
    return;
  }

  const originalEndDate = investment.slowSignalOriginalEndDate;
  const currentEndDate = investment.endDate;
  const [updated] = await db.update(investmentsTable)
    .set({ endDate: originalEndDate, slowSignalActive: false })
    .where(and(
      eq(investmentsTable.id, id),
      eq(investmentsTable.status, "active"),
      eq(investmentsTable.slowSignalActive, true),
      eq(investmentsTable.endDate, currentEndDate),
    ))
    .returning({
      id: investmentsTable.id,
      userId: investmentsTable.userId,
      planName: investmentsTable.planName,
      endDate: investmentsTable.endDate,
    });

  if (!updated) {
    res.status(409).json({ error: "Investment changed or was settled. Refresh and try again." });
    return;
  }

  const message = `Slow Signal Mode has been turned off for your ${updated.planName} investment #${updated.id}. Your maturity date has been restored to ${originalEndDate}.`;
  await createNotification({
    userId: updated.userId,
    type: "investment_slow_signal",
    title: "Slow Signal Mode turned off",
    message,
  });
  await notifyUserPush(updated.userId, "Slow Signal Mode turned off", message);
  await notifyUserEmail(updated.userId, "Slow Signal Mode turned off", message);
  await notifyAdmins({
    type: "admin_slow_signal_disabled",
    title: "Slow Signal Mode turned off",
    message: `Admin #${req.userId} turned off Slow Signal Mode for investment #${updated.id} (user #${updated.userId}). Maturity restored to ${originalEndDate}.`,
  });

  res.json({ id: updated.id, slowSignalActive: false, endDate: updated.endDate });
});


router.post("/admin/investments/:id/high-market-volatility", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid investment ID" }); return; }
  const [investment] = await db.select().from(investmentsTable).where(eq(investmentsTable.id, id)).limit(1);
  if (!investment) { res.status(404).json({ error: "Investment not found" }); return; }
  if (investment.status !== "active") { res.status(409).json({ error: "High Market Volatility can only be enabled for active investments." }); return; }
  if (investment.highMarketVolatilityActive) { res.status(409).json({ error: "High Market Volatility is already active for this investment." }); return; }
  const appliedAt = new Date();
  const deadline = new Date(appliedAt.getTime() + 48 * 60 * 60 * 1000);
  const [updated] = await db.update(investmentsTable).set({
    highMarketVolatilityActive: true,
    highMarketVolatilityAppliedAt: appliedAt,
    highMarketVolatilityDeadline: deadline,
    highMarketVolatilityAdminId: req.userId!,
  }).where(and(
    eq(investmentsTable.id, id),
    eq(investmentsTable.status, "active"),
    eq(investmentsTable.highMarketVolatilityActive, false),
  )).returning({ id: investmentsTable.id, userId: investmentsTable.userId, planName: investmentsTable.planName });
  if (!updated) { res.status(409).json({ error: "Investment changed or was settled. Refresh and try again." }); return; }
  const message = `High Market Volatility notice: your ${updated.planName} investment #${updated.id} is subject to elevated market risk. Please review your investment and available withdrawal options within 48 hours (by ${deadline.toISOString()}). Any liquidation or adjustment will occur only in accordance with the applicable investment terms. Contact support if you have questions.`;
  await createNotification({ userId: updated.userId, type: "investment_high_market_volatility", title: "High Market Volatility notice", message });
  await notifyUserPush(updated.userId, "High Market Volatility notice", message);
  await notifyUserEmail(updated.userId, "High Market Volatility notice", message);
  await notifyAdmins({ type: "admin_high_market_volatility_applied", title: "High Market Volatility enabled", message: `Admin #${req.userId} enabled High Market Volatility for investment #${updated.id} (user #${updated.userId}); review deadline ${deadline.toISOString()}.` });
  res.json({ id: updated.id, highMarketVolatilityActive: true, appliedAt: appliedAt.toISOString(), deadline: deadline.toISOString() });
});

router.post("/admin/investments/:id/high-market-volatility/off", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid investment ID" }); return; }
  const [investment] = await db.select().from(investmentsTable).where(eq(investmentsTable.id, id)).limit(1);
  if (!investment) { res.status(404).json({ error: "Investment not found" }); return; }
  if (investment.status !== "active") { res.status(409).json({ error: "High Market Volatility can only be disabled for active investments." }); return; }
  if (!investment.highMarketVolatilityActive) { res.status(409).json({ error: "High Market Volatility is not currently active." }); return; }
  const [updated] = await db.update(investmentsTable).set({ highMarketVolatilityActive: false })
    .where(and(eq(investmentsTable.id, id), eq(investmentsTable.status, "active"), eq(investmentsTable.highMarketVolatilityActive, true)))
    .returning({ id: investmentsTable.id, userId: investmentsTable.userId, planName: investmentsTable.planName });
  if (!updated) { res.status(409).json({ error: "Investment changed or was settled. Refresh and try again." }); return; }
  const message = `The High Market Volatility notice for your ${updated.planName} investment #${updated.id} has been cleared by the platform administrator. Please continue to review market risks and your investment terms.`;
  await createNotification({ userId: updated.userId, type: "investment_high_market_volatility", title: "High Market Volatility notice cleared", message });
  await notifyUserPush(updated.userId, "High Market Volatility notice cleared", message);
  await notifyUserEmail(updated.userId, "High Market Volatility notice cleared", message);
  await notifyAdmins({ type: "admin_high_market_volatility_disabled", title: "High Market Volatility disabled", message: `Admin #${req.userId} disabled High Market Volatility for investment #${updated.id} (user #${updated.userId}).` });
  res.json({ id: updated.id, highMarketVolatilityActive: false });
});

export default router;

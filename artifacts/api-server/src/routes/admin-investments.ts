import { Router } from "express";
import { db, investmentsTable, usersTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/auth.js";

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
  endDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, "Maturity date must be YYYY-MM-DD"),
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

export default router;

import { Router } from "express";
import { db, plansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetPlansResponse,
  GetPlanResponse,
  GetPlanParams,
} from "@workspace/api-zod";

const router = Router();

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

router.get("/plans", async (_req, res): Promise<void> => {
  const plans = await db
    .select()
    .from(plansTable)
    .where(eq(plansTable.isActive, true))
    .orderBy(plansTable.minAmount);
  res.json(GetPlansResponse.parse(plans.map(formatPlan)));
});

router.get("/plans/:id", async (req, res): Promise<void> => {
  const params = GetPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, params.data.id));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }
  res.json(GetPlanResponse.parse(formatPlan(plan)));
});

export default router;

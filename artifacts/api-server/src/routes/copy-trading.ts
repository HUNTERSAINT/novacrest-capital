import { Router } from "express";
import { db, copyTradingStrategiesTable, userCopyTradingTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { z } from "zod";

const router = Router();

function fmtStrategy(s: typeof copyTradingStrategiesTable.$inferSelect) {
  return { ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() };
}
function fmtTrade(t: typeof userCopyTradingTable.$inferSelect) {
  return { ...t, joinedAt: t.joinedAt.toISOString(), updatedAt: t.updatedAt.toISOString() };
}

router.get("/copy-trading/strategies", async (_req, res): Promise<void> => {
  const strategies = await db
    .select()
    .from(copyTradingStrategiesTable)
    .where(eq(copyTradingStrategiesTable.isActive, true))
    .orderBy(desc(copyTradingStrategiesTable.monthlyRoi));
  res.json({ strategies: strategies.map(fmtStrategy) });
});

router.get("/copy-trading/my", requireAuth, async (req, res): Promise<void> => {
  const [trade] = await db
    .select()
    .from(userCopyTradingTable)
    .where(and(eq(userCopyTradingTable.userId, req.userId!), eq(userCopyTradingTable.status, "active")))
    .limit(1);
  if (!trade) { res.json({ copyTrade: null, strategy: null }); return; }
  const [strategy] = await db
    .select()
    .from(copyTradingStrategiesTable)
    .where(eq(copyTradingStrategiesTable.id, trade.strategyId));
  res.json({ copyTrade: fmtTrade(trade), strategy: strategy ? fmtStrategy(strategy) : null });
});

const JoinBody = z.object({
  strategyId: z.number().int().positive(),
  allocatedAmount: z.number().positive(),
});

router.post("/copy-trading/join", requireAuth, async (req, res): Promise<void> => {
  const parsed = JoinBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { strategyId, allocatedAmount } = parsed.data;

  const [strategy] = await db.select().from(copyTradingStrategiesTable).where(eq(copyTradingStrategiesTable.id, strategyId));
  if (!strategy?.isActive) { res.status(404).json({ error: "Strategy not found" }); return; }
  if (allocatedAmount < strategy.minAmount) {
    res.status(400).json({ error: `Minimum allocation is $${strategy.minAmount}` }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (user.balance < allocatedAmount) { res.status(400).json({ error: "Insufficient balance" }); return; }

  const [existing] = await db
    .select()
    .from(userCopyTradingTable)
    .where(and(eq(userCopyTradingTable.userId, req.userId!), eq(userCopyTradingTable.status, "active")))
    .limit(1);
  if (existing) { res.status(400).json({ error: "Already copying a strategy. Leave it first." }); return; }

  await db.update(usersTable).set({ balance: user.balance - allocatedAmount }).where(eq(usersTable.id, req.userId!));
  await db.update(copyTradingStrategiesTable)
    .set({ followersCount: strategy.followersCount + 1 })
    .where(eq(copyTradingStrategiesTable.id, strategyId));

  const [trade] = await db.insert(userCopyTradingTable).values({
    userId: req.userId!, strategyId, allocatedAmount, status: "active",
  }).returning();

  res.status(201).json({ copyTrade: fmtTrade(trade), strategy: fmtStrategy(strategy) });
});

router.post("/copy-trading/leave", requireAuth, async (req, res): Promise<void> => {
  const [trade] = await db
    .select()
    .from(userCopyTradingTable)
    .where(and(eq(userCopyTradingTable.userId, req.userId!), eq(userCopyTradingTable.status, "active")))
    .limit(1);
  if (!trade) { res.status(404).json({ error: "No active copy trade" }); return; }

  await db.update(userCopyTradingTable).set({ status: "stopped" }).where(eq(userCopyTradingTable.id, trade.id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  await db.update(usersTable).set({ balance: user.balance + trade.allocatedAmount }).where(eq(usersTable.id, req.userId!));
  const [strat] = await db.select().from(copyTradingStrategiesTable).where(eq(copyTradingStrategiesTable.id, trade.strategyId));
  if (strat) {
    await db.update(copyTradingStrategiesTable)
      .set({ followersCount: Math.max(0, strat.followersCount - 1) })
      .where(eq(copyTradingStrategiesTable.id, trade.strategyId));
  }
  res.json({ message: "Left strategy. Funds returned to balance." });
});

export default router;

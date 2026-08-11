import { Router } from "express";
import { db, tradingSignalsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

function fmt(s: typeof tradingSignalsTable.$inferSelect) {
  return { ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() };
}

router.get("/signals", async (_req, res): Promise<void> => {
  const signals = await db
    .select()
    .from(tradingSignalsTable)
    .orderBy(desc(tradingSignalsTable.createdAt))
    .limit(30);
  res.json({ signals: signals.map(fmt) });
});

export default router;

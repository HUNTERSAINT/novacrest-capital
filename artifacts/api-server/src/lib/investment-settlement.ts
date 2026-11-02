import { and, eq, lte, sql } from "drizzle-orm";
import {
  db,
  investmentsTable,
  transactionsTable,
  usersTable,
} from "@workspace/db";
import { logger } from "./logger.js";

/**
 * Settle investments whose end date has arrived.
 *
 * Each payout is committed atomically and the active -> completed transition
 * is conditional, so repeated scheduler runs (or multiple API replicas) cannot
 * credit the same investment more than once.
 */
export async function settleMaturedInvestments(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const matured = await db
    .select({ id: investmentsTable.id })
    .from(investmentsTable)
    .where(and(
      eq(investmentsTable.status, "active"),
      lte(investmentsTable.endDate, today),
    ))
    .limit(100);

  for (const candidate of matured) {
    try {
      await db.transaction(async (tx) => {
        const [investment] = await tx
          .select()
          .from(investmentsTable)
          .where(eq(investmentsTable.id, candidate.id))
          .limit(1);

        if (!investment || investment.status !== "active" || investment.endDate > today) {
          return;
        }

        const [owner] = await tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.id, investment.userId))
          .limit(1);

        if (!owner) {
          logger.error({ investmentId: investment.id, userId: investment.userId },
            "Cannot settle matured investment because its user no longer exists");
          return;
        }

        const profit = Math.round(
          investment.amount * investment.roiPercent
        ) / 100;
        const principal = Math.round(investment.amount * 100) / 100;

        // Claim the investment before issuing credits. This conditional update
        // is the idempotency guard when more than one worker runs at once.
        const [claimed] = await tx
          .update(investmentsTable)
          .set({ status: "completed", profitEarned: profit })
          .where(and(
            eq(investmentsTable.id, investment.id),
            eq(investmentsTable.status, "active"),
            lte(investmentsTable.endDate, today),
          ))
          .returning({ id: investmentsTable.id });

        if (!claimed) return;

        // Two distinct balance credits and two distinct ledger entries:
        // profit is never merged with the returned principal.
        if (profit > 0) {
          await tx
            .update(usersTable)
            .set({
              balance: sql`${usersTable.balance} + ${profit}`,
              totalProfit: sql`${usersTable.totalProfit} + ${profit}`,
            })
            .where(eq(usersTable.id, investment.userId));

          await tx.insert(transactionsTable).values({
            userId: investment.userId,
            type: "profit",
            amount: profit,
            status: "completed",
            cryptoType: "USD",
            notes: `Investment profit for ${investment.planName} (investment #${investment.id})`,
          });
        }

        await tx
          .update(usersTable)
          .set({ balance: sql`${usersTable.balance} + ${principal}` })
          .where(eq(usersTable.id, investment.userId));

        await tx.insert(transactionsTable).values({
          userId: investment.userId,
          type: "deposit",
          amount: principal,
          status: "completed",
          cryptoType: "USD",
          notes: `Return of original investment principal for ${investment.planName} (investment #${investment.id})`,
        });

        logger.info({
          investmentId: investment.id,
          userId: investment.userId,
          principalReturned: principal,
          profitCredited: profit,
        }, "Matured investment settled");
      });
    } catch (error) {
      logger.error({ err: error, investmentId: candidate.id },
        "Failed to settle matured investment; it will be retried on the next run");
    }
  }
}

import { and, eq, sql } from "drizzle-orm";
import {
  db,
  investmentsTable,
  transactionsTable,
  usersTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import { notifyAdmins } from "./notifications.js";

/**
 * Settle investments whose configured maturity date/time has arrived.
 * Legacy rows containing YYYY-MM-DD keep their previous date-based behavior.
 */
export async function settleMaturedInvestments(): Promise<void> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // endDate is text for backwards compatibility. Fetch active rows and compare
  // date-only values as dates, while ISO timestamps are compared as instants.
  const active = await db
    .select({ id: investmentsTable.id, endDate: investmentsTable.endDate })
    .from(investmentsTable)
    .where(eq(investmentsTable.status, "active"));

  const matured = active.filter((row) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(row.endDate)) return row.endDate <= today;
    const maturityTime = Date.parse(row.endDate);
    return Number.isFinite(maturityTime) && maturityTime <= now.getTime();
  });

  for (const candidate of matured) {
    try {
      let alert: { userId: number; planName: string; investmentId: number; principal: number; profit: number } | null = null;
      await db.transaction(async (tx) => {
        const [investment] = await tx
          .select()
          .from(investmentsTable)
          .where(eq(investmentsTable.id, candidate.id))
          .limit(1);

        if (!investment || investment.status !== "active") return;
        const isMatured = /^\d{4}-\d{2}-\d{2}$/.test(investment.endDate)
          ? investment.endDate <= today
          : Number.isFinite(Date.parse(investment.endDate)) && Date.parse(investment.endDate) <= now.getTime();
        if (!isMatured) return;

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

        const profit = Math.round(investment.amount * investment.roiPercent) / 100;
        const principal = Math.round(investment.amount * 100) / 100;

        const [claimed] = await tx
          .update(investmentsTable)
          .set({ status: "completed", profitEarned: profit })
          .where(and(
            eq(investmentsTable.id, investment.id),
            eq(investmentsTable.status, "active"),
            eq(investmentsTable.endDate, investment.endDate),
          ))
          .returning({ id: investmentsTable.id });

        if (!claimed) return;

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

        alert = {
          userId: investment.userId,
          planName: investment.planName,
          investmentId: investment.id,
          principal,
          profit,
        };

        logger.info({
          investmentId: investment.id,
          userId: investment.userId,
          principalReturned: principal,
          profitCredited: profit,
        }, "Matured investment settled");
      });

      const completedAlert = alert as { userId: number; planName: string; investmentId: number; principal: number; profit: number } | null;
      if (completedAlert) {
        await notifyAdmins({
          type: "admin_investment_credited",
          title: "Investment Payout Credited",
          message: `Investment #${completedAlert.investmentId} (${completedAlert.planName}) for user #${completedAlert.userId} matured. Profit credited: ${completedAlert.profit.toFixed(2)}; principal returned separately: ${completedAlert.principal.toFixed(2)}.`,
        });
      }
    } catch (error) {
      logger.error({ err: error, investmentId: candidate.id },
        "Failed to settle matured investment; it will be retried on the next run");
    }
  }
}

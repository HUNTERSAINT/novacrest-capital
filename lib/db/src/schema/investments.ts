import { pgTable, text, serial, timestamp, real, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const investmentStatusEnum = pgEnum("investment_status", ["active", "completed", "cancelled"]);

export const investmentsTable = pgTable("investments", {
  id: serial("id").primaryKey(),
  userId: real("user_id").notNull(),
  planId: real("plan_id").notNull(),
  planName: text("plan_name").notNull(),
  planTier: text("plan_tier"),
  amount: real("amount").notNull(),
  roiPercent: real("roi_percent").notNull(),
  durationDays: real("duration_days").notNull(),
  status: investmentStatusEnum("status").notNull().default("active"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  profitEarned: real("profit_earned").notNull().default(0),
  cryptoType: text("crypto_type").notNull(),
  walletAddress: text("wallet_address"),
  compounding: boolean("compounding").notNull().default(false),
  slowSignalApplied: boolean("slow_signal_applied").notNull().default(false),
  slowSignalActive: boolean("slow_signal_active").notNull().default(false),
  slowSignalDays: integer("slow_signal_days"),
  slowSignalOriginalEndDate: text("slow_signal_original_end_date"),
  slowSignalAppliedAt: timestamp("slow_signal_applied_at", { withTimezone: true }),
  slowSignalAdminId: integer("slow_signal_admin_id"),
  slowSignalReason: text("slow_signal_reason"),
  highMarketVolatilityActive: boolean("high_market_volatility_active").notNull().default(false),
  highMarketVolatilityAppliedAt: timestamp("high_market_volatility_applied_at", { withTimezone: true }),
  highMarketVolatilityDeadline: timestamp("high_market_volatility_deadline", { withTimezone: true }),
  highMarketVolatilityAdminId: integer("high_market_volatility_admin_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvestmentSchema = createInsertSchema(investmentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investmentsTable.$inferSelect;

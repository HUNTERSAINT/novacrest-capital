import { pgTable, text, serial, timestamp, real, boolean, pgEnum } from "drizzle-orm/pg-core";
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

import { pgTable, text, serial, timestamp, real, boolean, integer, pgEnum } from "drizzle-orm/pg-core";

export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"]);
export const copyTradingStatusEnum = pgEnum("copy_trading_status", ["active", "paused", "stopped"]);

export const copyTradingStrategiesTable = pgTable("copy_trading_strategies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  managerName: text("manager_name").notNull(),
  description: text("description").notNull(),
  monthlyRoi: real("monthly_roi").notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull().default("medium"),
  minAmount: real("min_amount").notNull().default(100),
  followersCount: integer("followers_count").notNull().default(0),
  winRate: real("win_rate").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const userCopyTradingTable = pgTable("user_copy_trading", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  strategyId: integer("strategy_id").notNull(),
  allocatedAmount: real("allocated_amount").notNull(),
  status: copyTradingStatusEnum("status").notNull().default("active"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CopyTradingStrategy = typeof copyTradingStrategiesTable.$inferSelect;
export type InsertCopyTradingStrategy = typeof copyTradingStrategiesTable.$inferInsert;
export type UserCopyTrading = typeof userCopyTradingTable.$inferSelect;
export type InsertUserCopyTrading = typeof userCopyTradingTable.$inferInsert;

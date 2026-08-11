import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const signalActionEnum = pgEnum("signal_action", ["buy", "sell", "hold"]);
export const signalStatusEnum = pgEnum("signal_status", ["active", "completed", "expired"]);
export const signalTimeframeEnum = pgEnum("signal_timeframe", ["short_term", "mid_term", "long_term"]);

export const tradingSignalsTable = pgTable("trading_signals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  asset: text("asset").notNull(),
  action: signalActionEnum("action").notNull(),
  entryPrice: text("entry_price"),
  targetPrice: text("target_price"),
  stopLoss: text("stop_loss"),
  timeframe: signalTimeframeEnum("timeframe").notNull().default("short_term"),
  status: signalStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type TradingSignal = typeof tradingSignalsTable.$inferSelect;
export type InsertTradingSignal = typeof tradingSignalsTable.$inferInsert;

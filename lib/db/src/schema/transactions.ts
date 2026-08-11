import { pgTable, text, serial, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "withdrawal", "profit", "bonus", "referral"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed", "cancelled"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: real("user_id").notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: real("amount").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  cryptoType: text("crypto_type").notNull(),
  walletAddress: text("wallet_address"),
  txHash: text("tx_hash"),
  notes: text("notes"),
  proofUrl: text("proof_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;

import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const walletAddressesTable = pgTable("wallet_addresses", {
  id: serial("id").primaryKey(),
  cryptoType: text("crypto_type").notNull(),      // BTC, ETH, USDT, BNB, SOL, XRP
  network: text("network").notNull().default(""), // e.g. "ERC20", "TRC20", "BEP20", "Mainnet"
  label: text("label").notNull(),                 // e.g. "Bitcoin", "Tether (TRC20)"
  address: text("address").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type WalletAddress = typeof walletAddressesTable.$inferSelect;
export type InsertWalletAddress = typeof walletAddressesTable.$inferInsert;

import { pgTable, serial, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const referralStatusEnum = pgEnum("referral_status", ["active", "inactive"]);

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: real("referrer_id").notNull(),
  referredUserId: real("referred_user_id").notNull(),
  bonusEarned: real("bonus_earned").notNull().default(0),
  status: referralStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReferralSchema = createInsertSchema(referralsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referralsTable.$inferSelect;

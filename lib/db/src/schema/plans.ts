import { pgTable, text, serial, timestamp, real, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planTierEnum = pgEnum("plan_tier", ["bronze", "silver", "gold", "platinum", "diamond"]);

export const plansTable = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  minAmount: real("min_amount").notNull(),
  maxAmount: real("max_amount"),
  roiPercent: real("roi_percent").notNull(),
  durationDays: real("duration_days").notNull(),
  tier: planTierEnum("tier").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  features: text("features").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plansTable.$inferSelect;

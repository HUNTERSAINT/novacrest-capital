import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const kycStatusEnum = pgEnum("kyc_status", ["pending", "approved", "rejected"]);
export const kycDocTypeEnum = pgEnum("kyc_doc_type", ["passport", "national_id", "drivers_license"]);

export const kycDocumentsTable = pgTable("kyc_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  documentType: kycDocTypeEnum("document_type").notNull(),
  frontUrl: text("front_url").notNull(),
  backUrl: text("back_url"),
  selfieUrl: text("selfie_url"),
  status: kycStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export type KycDocument = typeof kycDocumentsTable.$inferSelect;
export type InsertKycDocument = typeof kycDocumentsTable.$inferInsert;

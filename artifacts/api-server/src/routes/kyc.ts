import { Router } from "express";
import { db, kycDocumentsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { z } from "zod";
import { createNotification, notifyAdmins, sendAdminPushNotifications } from "../lib/notifications.js";

const router = Router();

const KycSubmitBody = z.object({
  documentType: z.enum(["passport", "national_id", "drivers_license"]),
  frontUrl: z.string().min(5),
  backUrl: z.string().min(5).optional(),
  selfieUrl: z.string().min(5).optional(),
});

function formatKyc(doc: typeof kycDocumentsTable.$inferSelect) {
  return {
    ...doc,
    submittedAt: doc.submittedAt.toISOString(),
    reviewedAt: doc.reviewedAt?.toISOString() ?? null,
  };
}

router.get("/kyc/me", requireAuth, async (req, res): Promise<void> => {
  const [doc] = await db
    .select()
    .from(kycDocumentsTable)
    .where(eq(kycDocumentsTable.userId, req.userId!))
    .orderBy(desc(kycDocumentsTable.submittedAt))
    .limit(1);
  res.json({ kyc: doc ? formatKyc(doc) : null });
});

router.post("/kyc", requireAuth, async (req, res): Promise<void> => {
  const parsed = KycSubmitBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db
    .select()
    .from(kycDocumentsTable)
    .where(eq(kycDocumentsTable.userId, req.userId!))
    .orderBy(desc(kycDocumentsTable.submittedAt))
    .limit(1);

  if (existing?.status === "approved") {
    res.status(400).json({ error: "KYC already approved" }); return;
  }
  if (existing?.status === "pending") {
    res.status(400).json({ error: "KYC already submitted and pending review" }); return;
  }

  const [doc] = await db.insert(kycDocumentsTable).values({
    userId: req.userId!,
    ...parsed.data,
  }).returning();

  await createNotification({
    userId: req.userId!,
    type: "kyc",
    title: "KYC Submitted",
    message: "Your identity documents have been submitted for review. We'll notify you within 24 hours.",
  });

  // Look up user name to include in admin notification
  const [submitter] = await db.select({ fullName: usersTable.fullName, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  const adminKycMessage = `${submitter?.fullName ?? "A member"} (${submitter?.email ?? ""}) submitted identity documents for review.`;

  await notifyAdmins({
    type: "admin_kyc_submitted",
    title: "New KYC Submission",
    message: adminKycMessage,
  });

  sendAdminPushNotifications({
    title: "New KYC Submission",
    body: adminKycMessage,
    data: { section: "kyc" },
  }).catch(() => {});

  res.status(201).json({ kyc: formatKyc(doc) });
});

export default router;

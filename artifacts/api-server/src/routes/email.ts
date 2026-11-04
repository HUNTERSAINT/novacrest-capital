import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/auth.js";

const router = Router();

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

router.get("/admin/email/recipients", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select({
    id: usersTable.id,
    fullName: usersTable.fullName,
    email: usersTable.email,
    status: usersTable.status,
  }).from(usersTable)
    .where(ne(usersTable.role, "admin"))
    .orderBy(desc(usersTable.createdAt));

  res.json({ users });
});

router.post("/admin/email/send", requireAdmin, async (req, res): Promise<void> => {
  const parsed = z.object({
    audience: z.enum(["all", "active", "selected"]),
    userIds: z.array(z.number().int().positive()).max(500).optional().default([]),
    subject: z.string().trim().min(2).max(180),
    message: z.string().trim().min(1).max(10000),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Choose recipients and provide a subject and message (up to 10,000 characters)." });
    return;
  }
  if (parsed.data.audience === "selected" && parsed.data.userIds.length === 0) {
    res.status(400).json({ error: "Select at least one member." });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    res.status(503).json({ error: "Email sending is not configured. Check the Resend API key and verified sender settings." });
    return;
  }

  let recipients = await db.select({
    id: usersTable.id,
    fullName: usersTable.fullName,
    email: usersTable.email,
  }).from(usersTable).where(ne(usersTable.role, "admin"));

  if (parsed.data.audience === "active") {
    const activeUsers = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.status, "active"));
    const activeIds = new Set(activeUsers.map((user) => user.id));
    recipients = recipients.filter((user) => activeIds.has(user.id));
  } else if (parsed.data.audience === "selected") {
    const selectedIds = new Set(parsed.data.userIds);
    recipients = recipients.filter((user) => selectedIds.has(user.id));
  }

  recipients = recipients.filter((user) => !!user.email);
  if (recipients.length === 0) {
    res.status(400).json({ error: "No eligible member email addresses were found for this audience." });
    return;
  }
  if (recipients.length > 500) {
    res.status(400).json({ error: "This audience contains more than 500 members. Select a smaller group and send in batches." });
    return;
  }

  let sent = 0;
  const failures: Array<{ email: string; error: string }> = [];
  for (const recipient of recipients) {
    const safeName = escapeHtml(recipient.fullName || "there");
    const safeMessage = escapeHtml(parsed.data.message).replace(/\r?\n/g, "<br>");
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [recipient.email],
          subject: parsed.data.subject,
          text: `Hello ${recipient.fullName || "there"},\n\n${parsed.data.message}\n\nNovaCrest Team`,
          html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;color:#17202a"><div style="max-width:600px;margin:0 auto;background:#fff;padding:28px;border-radius:12px"><h2 style="color:#123b35">NovaCrest</h2><p>Hello ${safeName},</p><div style="line-height:1.7">${safeMessage}</div><p style="margin-top:28px">Regards,<br><strong>NovaCrest Team</strong></p></div></body></html>`,
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        req.log?.error({ status: response.status, response: detail.slice(0, 300) }, "NovaCrest admin email send failed");
        failures.push({ email: recipient.email, error: `Email provider rejected the message (HTTP ${response.status}).` });
      } else {
        sent += 1;
      }
    } catch (error) {
      req.log?.error({ err: error, email: recipient.email }, "NovaCrest admin email send request failed");
      failures.push({ email: recipient.email, error: "Network error while contacting the email provider." });
    }
  }

  res.status(200).json({
    total: recipients.length,
    sent,
    failed: failures.length,
    failures: failures.slice(0, 20),
  });
});

export default router;

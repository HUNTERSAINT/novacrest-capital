import { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db, usersTable, chatSessionsTable, chatMessagesTable, resendInboundEventsTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { notifyAdmins, sendAdminPushNotifications } from "../lib/notifications.js";

const router = Router();
declare global { namespace Express { interface Request { rawBody?: Buffer } } }

function verifyResendWebhook(rawBody: Buffer | undefined, headers: Record<string, string | string[] | undefined>) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = headers["svix-id"], timestamp = headers["svix-timestamp"], signature = headers["svix-signature"];
  if (!secret || !rawBody || typeof id !== "string" || typeof timestamp !== "string" || typeof signature !== "string") return false;
  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() / 1000 - sentAt) > 300) return false;
  const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = Buffer.from(encodedSecret, "base64");
  const expected = createHmac("sha256", key).update(id + "." + timestamp + "." + rawBody.toString("utf8")).digest();
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    try { const supplied = Buffer.from(value, "base64"); return supplied.length === expected.length && timingSafeEqual(supplied, expected); }
    catch { return false; }
  });
}
function extractEmail(value: unknown): string {
  const raw = Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
  const match = raw.match(/<([^<>]+)>/) || raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (match?.[1] ?? match?.[0] ?? "").trim().toLowerCase();
}
function cleanEmailText(text: string): string {
  return text.replace(/\r/g, "").split("\n").filter((line) => !line.trim().startsWith(">")).join("\n")
    .replace(/\nOn .{1,180}wrote:[\s\S]*$/i, "").replace(/\nFrom:.+\nSent:.+\nTo:.+\nSubject:.+$/is, "").trim().slice(0, 2000);
}

router.post("/webhooks/resend/inbound", async (req, res): Promise<void> => {
  if (!verifyResendWebhook(req.rawBody, req.headers)) { res.status(401).json({ error: "Invalid webhook signature." }); return; }
  let event: any;
  try { event = JSON.parse(req.rawBody!.toString("utf8")); }
  catch { res.status(400).json({ error: "Invalid webhook payload." }); return; }
  if (event?.type !== "email.received") { res.status(200).json({ received: true, ignored: true }); return; }

  const webhookId = String(req.headers["svix-id"]);
  const duplicate = await db.select({ id: resendInboundEventsTable.id }).from(resendInboundEventsTable).where(eq(resendInboundEventsTable.eventId, webhookId)).limit(1);
  if (duplicate.length) { res.status(200).json({ received: true, duplicate: true }); return; }
  const emailId = event?.data?.email_id;
  if (typeof emailId !== "string" || !process.env.RESEND_API_KEY) { res.status(200).json({ received: true, ignored: true }); return; }

  try {
    const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } });
    if (!response.ok) throw new Error(`Resend receiving API returned HTTP ${response.status}`);
    const result = await response.json() as any;
    const email = result?.data ?? result;
    const senderEmail = extractEmail(email?.from ?? event?.data?.from);
    const recipients = Array.isArray(email?.to) ? email.to : [email?.to ?? event?.data?.to];
    const addressedToNovaCrest = recipients.some((recipient: unknown) => extractEmail(recipient).endsWith("@reply.novacrestfi.com"));
    if (!senderEmail || !addressedToNovaCrest) {
      await db.insert(resendInboundEventsTable).values({ eventId: webhookId }).onConflictDoNothing();
      res.status(200).json({ received: true, ignored: true }); return;
    }
    const [member] = await db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${senderEmail}`).limit(1);
    if (!member) {
      await db.insert(resendInboundEventsTable).values({ eventId: webhookId }).onConflictDoNothing();
      res.status(200).json({ received: true, ignored: true }); return;
    }
    const rawText = typeof email?.text === "string" && email.text.trim() ? email.text :
      typeof email?.html === "string" ? email.html.replace(/<\/(p|div|br|li|tr)>/gi, "\n").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";
    const body = cleanEmailText(rawText);
    if (!body) {
      await db.insert(resendInboundEventsTable).values({ eventId: webhookId }).onConflictDoNothing();
      res.status(200).json({ received: true, ignored: true }); return;
    }
    let [session] = await db.select().from(chatSessionsTable).where(eq(chatSessionsTable.userId, member.id)).orderBy(desc(chatSessionsTable.createdAt)).limit(1);
    if (!session) [session] = await db.insert(chatSessionsTable).values({ userId: member.id }).returning();
    await db.update(chatSessionsTable).set({ status: "open", lastMessageAt: new Date() }).where(eq(chatSessionsTable.id, session.id));
    await db.insert(chatMessagesTable).values({ sessionId: session.id, senderId: member.id, senderRole: "user", message: body });
    await db.insert(resendInboundEventsTable).values({ eventId: webhookId }).onConflictDoNothing();

    const preview = body.length > 80 ? body.slice(0, 80) + "…" : body;
    const notification = `${member.fullName || "A member"} replied by email: "${preview}"`;
    notifyAdmins({ type: "admin_chat_message", title: "New Email Reply", message: notification }).catch(() => {});
    sendAdminPushNotifications({ title: "New Email Reply", body: notification, data: { section: "chat" } }).catch(() => {});
    res.status(200).json({ received: true, addedToChat: true });
  } catch (error) {
    req.log?.error({ err: error }, "Failed to add inbound email to NovaCrest chat");
    res.status(500).json({ error: "Unable to process incoming email." });
  }
});
export default router;

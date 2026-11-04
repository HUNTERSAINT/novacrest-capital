import { Router } from "express";
import { db, chatSessionsTable, chatMessagesTable, usersTable } from "@workspace/db";
import { eq, desc, and, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { z } from "zod";
import { notifyAdmins, sendAdminPushNotifications } from "../lib/notifications.js";

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────

async function getOrCreateSession(userId: number) {
  const [existing] = await db
    .select()
    .from(chatSessionsTable)
    .where(and(eq(chatSessionsTable.userId, userId), eq(chatSessionsTable.status, "open")))
    .orderBy(desc(chatSessionsTable.createdAt))
    .limit(1);
  if (existing) return existing;
  const [created] = await db.insert(chatSessionsTable).values({ userId }).returning();
  return created;
}

// ── member endpoints ──────────────────────────────────────────────────────

/** GET /chat/session — get or create the user's open session */
router.get("/chat/session", requireAuth, async (req, res): Promise<void> => {
  const session = await getOrCreateSession(req.userId!);
  res.json({ session });
});

/** GET /chat/messages — poll for messages in the user's open session */
router.get("/chat/messages", requireAuth, async (req, res): Promise<void> => {
  const session = await getOrCreateSession(req.userId!);
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, session.id))
    .orderBy(asc(chatMessagesTable.createdAt));

  // Mark admin messages as read
  await db
    .update(chatMessagesTable)
    .set({ isRead: true })
    .where(and(
      eq(chatMessagesTable.sessionId, session.id),
      eq(chatMessagesTable.senderRole, "admin"),
      eq(chatMessagesTable.isRead, false),
    ));

  res.json({ sessionId: session.id, messages });
});

/** POST /chat/messages — user sends a message */
router.post("/chat/messages", requireAuth, async (req, res): Promise<void> => {
  const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body);
  const session = await getOrCreateSession(req.userId!);

  const [msg] = await db.insert(chatMessagesTable).values({
    sessionId: session.id,
    senderId: req.userId!,
    senderRole: "user",
    message,
  }).returning();

  // Update session lastMessageAt
  await db.update(chatSessionsTable)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatSessionsTable.id, session.id));

  // Notify all admins of the new message (fire-and-forget)
  const [sender] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  const chatBody = `${sender?.fullName ?? "A member"} sent a message: "${message.slice(0, 80)}${message.length > 80 ? "…" : ""}"`;
  notifyAdmins({
    type: "admin_chat_message",
    title: "New Chat Message",
    message: chatBody,
  }).catch(() => {});
  sendAdminPushNotifications({
    title: "New Chat Message",
    body: chatBody,
    data: { section: "chat" },
  }).catch(() => {});

  res.status(201).json({ message: msg });
});

// ── admin endpoints ───────────────────────────────────────────────────────

/** GET /admin/chat/sessions — all open sessions with last message + user info */
router.get("/admin/chat/sessions", requireAdmin, async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(chatSessionsTable)
    .orderBy(desc(chatSessionsTable.lastMessageAt));

  const enriched = await Promise.all(sessions.map(async (s) => {
    const [user] = await db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.id, s.userId));
    const [lastMsg] = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, s.id))
      .orderBy(desc(chatMessagesTable.createdAt)).limit(1);
    const unreadCount = await db.$count(
      chatMessagesTable,
      and(eq(chatMessagesTable.sessionId, s.id), eq(chatMessagesTable.senderRole, "user"), eq(chatMessagesTable.isRead, false))
    );
    return { ...s, user, lastMessage: lastMsg ?? null, unreadCount };
  }));

  res.json({ sessions: enriched });
});

/** GET /admin/chat/sessions/:id/messages — get all messages in a session */
router.get("/admin/chat/sessions/:id/messages", requireAdmin, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.id);
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, sessionId))
    .orderBy(asc(chatMessagesTable.createdAt));

  // Mark user messages as read
  await db.update(chatMessagesTable)
    .set({ isRead: true })
    .where(and(
      eq(chatMessagesTable.sessionId, sessionId),
      eq(chatMessagesTable.senderRole, "user"),
      eq(chatMessagesTable.isRead, false),
    ));

  res.json({ messages });
});

/** POST /admin/chat/sessions/:id/reply — save the admin reply and email it to the member. */
router.post("/admin/chat/sessions/:id/reply", requireAdmin, async (req, res): Promise<void> => {
  const sessionId = Number.parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
    res.status(400).json({ error: "Invalid chat session." });
    return;
  }
  const parsed = z.object({ message: z.string().trim().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Reply must contain between 1 and 2000 characters." });
    return;
  }

  const [session] = await db.select().from(chatSessionsTable)
    .where(eq(chatSessionsTable.id, sessionId)).limit(1);
  if (!session) {
    res.status(404).json({ error: "Chat session not found." });
    return;
  }
  const [member] = await db.select({
    email: usersTable.email,
    fullName: usersTable.fullName,
  }).from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  if (!member?.email) {
    res.status(404).json({ error: "Member email address not found." });
    return;
  }

  const message = parsed.data.message;
  const [msg] = await db.insert(chatMessagesTable).values({
    sessionId,
    senderId: req.userId!,
    senderRole: "admin",
    message,
  }).returning();

  await db.update(chatSessionsTable)
    .set({ lastMessageAt: new Date(), status: "open" })
    .where(eq(chatSessionsTable.id, sessionId));

  // Send the exact saved admin reply to the member using the verified Resend sender.
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    res.status(201).json({
      message: msg,
      emailSent: false,
      emailError: "Reply saved in chat, but email delivery is not configured.",
    });
    return;
  }

  const escapeHtml = (value: string) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const safeName = escapeHtml(member.fullName || "there");
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const emailPayload: Record<string, unknown> = {
    from,
    to: [member.email],
    subject: "NovaCrest Support has replied to your message",
    text: `Hello ${member.fullName || "there"},\n\nAn administrator has replied to your NovaCrest support chat:\n\n${message}\n\nYou can continue the conversation by signing in to your NovaCrest account and opening Support Chat.\n\nNovaCrest Support Team`,
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;color:#17202a"><div style="max-width:600px;margin:0 auto;background:#fff;padding:28px;border-radius:12px"><h2 style="margin-top:0;color:#123b35">NovaCrest Support</h2><p>Hello ${safeName},</p><p>An administrator has replied to your support conversation:</p><div style="padding:18px;background:#f4f6f8;border-left:4px solid #168477;border-radius:6px;line-height:1.6;white-space:normal">${safeMessage}</div><p style="line-height:1.6">You can continue the conversation by signing in to your NovaCrest account and opening Support Chat.</p><p style="margin-bottom:0">Regards,<br><strong>NovaCrest Support Team</strong></p></div></body></html>`,
  };
  emailPayload.reply_to = process.env.NOVACREST_SUPPORT_REPLY_TO || "support@reply.novacrestfi.com";

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });
    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text().catch(() => "");
      req.log?.error({ status: resendResponse.status, response: errorBody.slice(0, 500) }, "Resend failed to deliver admin chat reply");
      res.status(201).json({
        message: msg,
        emailSent: false,
        emailError: "Reply saved in chat, but the email could not be sent. Check the Resend sender/domain configuration.",
      });
      return;
    }
    const resendResult = await resendResponse.json() as { id?: string };
    res.status(201).json({ message: msg, emailSent: true, emailId: resendResult.id ?? null });
  } catch (error) {
    req.log?.error({ err: error }, "Failed to send admin chat reply email");
    res.status(201).json({
      message: msg,
      emailSent: false,
      emailError: "Reply saved in chat, but email delivery failed. Please check the email service and try again.",
    });
  }
});

/** PATCH /admin/chat/sessions/:id/close */
router.patch("/admin/chat/sessions/:id/close", requireAdmin, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.id);
  await db.update(chatSessionsTable).set({ status: "closed" }).where(eq(chatSessionsTable.id, sessionId));
  res.json({ ok: true });
});

export default router;

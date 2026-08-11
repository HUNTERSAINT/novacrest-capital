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

/** POST /admin/chat/sessions/:id/reply — admin sends a reply */
router.post("/admin/chat/sessions/:id/reply", requireAdmin, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.id);
  const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body);

  const [msg] = await db.insert(chatMessagesTable).values({
    sessionId,
    senderId: req.userId!,
    senderRole: "admin",
    message,
  }).returning();

  await db.update(chatSessionsTable)
    .set({ lastMessageAt: new Date(), status: "open" })
    .where(eq(chatSessionsTable.id, sessionId));

  res.status(201).json({ message: msg });
});

/** PATCH /admin/chat/sessions/:id/close */
router.patch("/admin/chat/sessions/:id/close", requireAdmin, async (req, res): Promise<void> => {
  const sessionId = parseInt(req.params.id);
  await db.update(chatSessionsTable).set({ status: "closed" }).where(eq(chatSessionsTable.id, sessionId));
  res.json({ ok: true });
});

export default router;

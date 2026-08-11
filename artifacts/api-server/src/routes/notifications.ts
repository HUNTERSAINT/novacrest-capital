import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function fmt(n: typeof notificationsTable.$inferSelect) {
  return { ...n, createdAt: n.createdAt.toISOString() };
}

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.userId!))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  res.json({ notifications: rows.map(fmt), unreadCount: rows.filter(n => !n.isRead).length });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.userId!)));
  res.json({ message: "Marked as read" });
});

router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, req.userId!));
  res.json({ message: "All marked as read" });
});

export default router;

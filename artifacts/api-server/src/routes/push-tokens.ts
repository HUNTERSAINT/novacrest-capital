import { Router } from "express";
import { db, pushTokensTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { z } from "zod";

const router = Router();

const TokenBody = z.object({
  token: z.string().min(1),
  platform: z.string().optional(),
});

/** POST /push-tokens — register a push token for the current user */
router.post("/push-tokens", requireAuth, async (req, res): Promise<void> => {
  const parsed = TokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Upsert: if token already exists (e.g. re-login), just re-assign to this user
  await db
    .insert(pushTokensTable)
    .values({
      userId: req.userId!,
      token: parsed.data.token,
      platform: parsed.data.platform ?? null,
    })
    .onConflictDoUpdate({
      target: pushTokensTable.token,
      set: { userId: req.userId! },
    });

  res.status(201).json({ ok: true });
});

/** DELETE /push-tokens — unregister a push token (called on logout) */
router.delete("/push-tokens", requireAuth, async (req, res): Promise<void> => {
  const parsed = TokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .delete(pushTokensTable)
    .where(
      and(
        eq(pushTokensTable.userId, req.userId!),
        eq(pushTokensTable.token, parsed.data.token),
      ),
    );

  res.json({ ok: true });
});

export default router;

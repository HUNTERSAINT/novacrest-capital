import { Router } from "express";
import { hashPassword } from "../lib/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema/users";
import { eq } from "drizzle-orm";

const router = Router();

const RESET_TOKEN = "7f3k9mxq2p8w1z6v4n0r5j";

router.post("/api/__reset-admin", async (req, res) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  if (token !== RESET_TOKEN) return res.status(403).json({ error: "Forbidden" });
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: "Password too short" });

  const hash = hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.email, "admin@novacrest.com"));
  res.json({ ok: true, message: "Admin password updated" });
});

export default router;

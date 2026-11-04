import { Router } from "express";
import crypto from "node:crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  generateReferralCode,
  normalizeEmail,
} from "../lib/auth.js";
import { createSession, deleteSession, getSession } from "../lib/sessions.js";
import {
  RegisterBody,
  LoginBody,
  RegisterResponse,
  LoginResponse,
  LogoutResponse,
  GetMeResponse,
} from "@workspace/api-zod";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = normalizeEmail(parsed.data.email);
  const { password, fullName, phone, country } = parsed.data;
  const referralCode = parsed.data.referralCode?.trim().toUpperCase() || undefined;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = hashPassword(password);
  const myReferralCode = generateReferralCode();

  let referredBy: string | undefined;
  if (referralCode) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode));
    if (referrer) {
      referredBy = referralCode;
    }
  }

  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    fullName: fullName.trim(),
    phone: phone?.trim() || undefined,
    country: country?.trim() || undefined,
    referralCode: myReferralCode,
    referredBy,
  }).returning();

  // If referred, record referral
  if (referredBy) {
    const { referralsTable } = await import("@workspace/db");
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referredBy));
    if (referrer) {
      await db.insert(referralsTable).values({
        referrerId: referrer.id,
        referredUserId: user.id,
        bonusEarned: 0,
        status: "active",
      });
    }
  }

  const token = createSession(user.id);

  res.status(201).json(RegisterResponse.parse({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone ?? null,
      country: user.country ?? null,
      role: user.role,
      status: user.status,
      balance: user.balance,
      totalInvested: user.totalInvested,
      totalProfit: user.totalProfit,
      referralCode: user.referralCode,
      referredBy: user.referredBy ?? null,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  }));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { password } = parsed.data;
  const email = normalizeEmail(parsed.data.email);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (!verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (user.status === "suspended") {
    res.status(401).json({ error: "Account suspended" });
    return;
  }

  const token = createSession(user.id);

  res.json(LoginResponse.parse({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone ?? null,
      country: user.country ?? null,
      role: user.role,
      status: user.status,
      balance: user.balance,
      totalInvested: user.totalInvested,
      totalProfit: user.totalProfit,
      referralCode: user.referralCode,
      referredBy: user.referredBy ?? null,
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    deleteSession(authHeader.slice(7));
  }
  res.json(LogoutResponse.parse({ message: "Logged out successfully" }));
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const userId = getSession(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(GetMeResponse.parse({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone ?? null,
    country: user.country ?? null,
    role: user.role,
    status: user.status,
    balance: user.balance,
    totalInvested: user.totalInvested,
    totalProfit: user.totalProfit,
    referralCode: user.referralCode,
    referredBy: user.referredBy ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
  }));
});

export default router;


// Password recovery: signed, short-lived tokens are bound to the current password hash,
// making each link single-use without storing reset tokens in a separate table.
function createPasswordResetToken(userId: number, passwordHash: string): string {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  if (!secret) throw new Error("Password reset signing secret is not configured");
  const payload = Buffer.from(JSON.stringify({
    userId,
    expiresAt: Date.now() + 30 * 60 * 1000,
    passwordFingerprint: crypto.createHash("sha256").update(passwordHash).digest("hex"),
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyPasswordResetToken(token: string, passwordHash: string): number | null {
  try {
    const secret = process.env.PASSWORD_RESET_SECRET || process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
    if (!secret) return null;
    const [payload, suppliedSignature] = token.split(".");
    if (!payload || !suppliedSignature) return null;
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest();
    const actualSignature = Buffer.from(suppliedSignature, "base64url");
    if (actualSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(actualSignature, expectedSignature)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId: number; expiresAt: number; passwordFingerprint: string;
    };
    const fingerprint = crypto.createHash("sha256").update(passwordHash).digest("hex");
    if (!Number.isInteger(data.userId) || data.expiresAt < Date.now() || data.passwordFingerprint !== fingerprint) return null;
    return data.userId;
  } catch {
    return null;
  }
}

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const email = typeof req.body?.email === "string" ? normalizeEmail(req.body.email) : "";
  const genericMessage = "If an account exists for that email, a password reset link has been sent.";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.json({ message: genericMessage });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.json({ message: genericMessage });
    return;
  }

  const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    req.log?.error?.("Password reset email is not configured");
    res.status(503).json({ error: "Password reset email is temporarily unavailable. Please contact support." });
    return;
  }

  const token = createPasswordResetToken(user.id, user.passwordHash);
  const baseUrl = (process.env.FRONTEND_URL || process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033;line-height:1.6"><h2 style="color:#0d9488">NovaCrest Capital</h2><h3>Reset your password</h3><p>Hello ${String(user.fullName).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")},</p><p>We received a request to reset your NovaCrest account password. This link expires in 30 minutes and can only be used once.</p><p><a href="${resetUrl}" style="display:inline-block;background:#0d9488;color:white;padding:13px 22px;text-decoration:none;border-radius:6px">Reset password</a></p><p>If you did not request this, you can safely ignore this email. Your password will not change.</p><p style="font-size:12px;color:#64748b">For your security, do not share this link with anyone.</p></div>`;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [user.email], subject: "Reset your NovaCrest password", html, text: `Hello ${user.fullName},\\n\\nUse this link to reset your NovaCrest password (expires in 30 minutes): ${resetUrl}\\n\\nIf you did not request this, ignore this email.` }),
    });
    if (!response.ok) {
      req.log?.error?.({ status: response.status }, "Resend rejected password reset email");
      res.status(502).json({ error: "Unable to send the reset email right now. Please try again later." });
      return;
    }
  } catch (error) {
    req.log?.error?.({ error }, "Password reset email failed");
    res.status(502).json({ error: "Unable to send the reset email right now. Please try again later." });
    return;
  }
  res.json({ message: genericMessage });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (password.length < 8 || password.length > 128) {
    res.status(400).json({ error: "Password must be between 8 and 128 characters." });
    return;
  }
  if (!token || token.length > 2048) {
    res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one." });
    return;
  }
  // Decode the user id only after checking the signature; then re-read the current hash.
  let userId: number;
  try {
    const payload = token.split(".")[0];
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    userId = Number(decoded.userId);
  } catch {
    res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one." });
    return;
  }
  if (!Number.isInteger(userId) || userId < 1) {
    res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one." });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || verifyPasswordResetToken(token, user.passwordHash) !== user.id) {
    res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one." });
    return;
  }
  await db.update(usersTable).set({ passwordHash: hashPassword(password), updatedAt: new Date() }).where(eq(usersTable.id, user.id));
  res.json({ message: "Your password has been reset. You can now sign in with your new password." });
});

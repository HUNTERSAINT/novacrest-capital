import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateReferralCode } from "../lib/auth.js";
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
  const { email, password, fullName, referralCode, phone, country } = parsed.data;

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
    fullName,
    phone,
    country,
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
  const { email, password } = parsed.data;

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

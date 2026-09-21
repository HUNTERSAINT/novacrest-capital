import crypto from "crypto";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash || !/^[0-9a-f]+$/i.test(salt) || !/^[0-9a-f]+$/i.test(expectedHash)) {
    return false;
  }

  const inputHash = crypto.scryptSync(password, salt, expectedHash.length / 2);
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === inputHash.length && crypto.timingSafeEqual(expected, inputHash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

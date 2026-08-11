import crypto from "crypto";

// In-memory token store. In production, use Redis or DB-backed sessions.
const sessions = new Map<string, number>(); // token -> userId

export function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, userId);
  return token;
}

export function getSession(token: string): number | undefined {
  return sessions.get(token);
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}

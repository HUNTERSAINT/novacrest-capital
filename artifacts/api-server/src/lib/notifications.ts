import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/** Create a notification for a single user. Non-fatal — never throws. */
export async function createNotification({
  userId,
  type,
  title,
  message,
}: {
  userId: number;
  type: string;
  title: string;
  message: string;
}) {
  try {
    await db.insert(notificationsTable).values({ userId, type, title, message });
  } catch {
    // Non-critical
  }
}

/** Create the same notification for every admin user. Non-fatal — never throws. */
export async function notifyAdmins({
  type,
  title,
  message,
}: {
  type: string;
  title: string;
  message: string;
}) {
  try {
    const admins = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));

    if (admins.length === 0) return;

    await db.insert(notificationsTable).values(
      admins.map((a) => ({ userId: a.id, type, title, message }))
    );
  } catch {
    // Non-critical
  }
}

import { db, notificationsTable, usersTable, pushTokensTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

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

// Map notification types to the admin section they should deep-link into
const TYPE_TO_SECTION: Record<string, string> = {
  admin_kyc_submitted: "kyc",
  admin_deposit_request: "transactions",
  admin_withdrawal_request: "transactions",
  admin_chat_message: "chat",
};

/** Send Expo push notifications to a list of tokens. Non-fatal. */
async function sendExpoPushMessages(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
) {
  if (tokens.length === 0) return;

  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    data,
    sound: "default",
    priority: "high",
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  } catch {
    // Non-critical — push delivery is best-effort
  }
}

/** Create the same notification for every admin user and send push notifications. Non-fatal. */
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

    // 1. Insert in-app notifications
    await db.insert(notificationsTable).values(
      admins.map((a) => ({ userId: a.id, type, title, message })),
    );

    // 2. Fetch push tokens for all admin users
    const adminIds = admins.map((a) => a.id);
    const rows = await db
      .select({ token: pushTokensTable.token })
      .from(pushTokensTable)
      .where(inArray(pushTokensTable.userId, adminIds));

    const tokens = rows.map((r) => r.token).filter(Boolean);
    if (tokens.length === 0) return;

    // 3. Send push notifications with deep-link data
    const section = TYPE_TO_SECTION[type];
    await sendExpoPushMessages(tokens, title, message, {
      screen: "admin",
      ...(section ? { section } : {}),
    });
  } catch {
    // Non-critical
  }
}

/**
 * Send an Expo push notification to all registered admin devices.
 * Non-fatal — never throws.
 */
export async function sendAdminPushNotifications({
  title,
  body,
  data,
}: {
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  try {
    const admins = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "admin"));

    if (admins.length === 0) return;

    const adminIds = admins.map((a) => a.id);
    const tokenRows = await db
      .select({ token: pushTokensTable.token })
      .from(pushTokensTable)
      .where(inArray(pushTokensTable.userId, adminIds));

    if (tokenRows.length === 0) return;

    const messages = tokenRows.map((r) => ({
      to: r.token,
      title,
      body,
      data: data ?? {},
      sound: "default",
      priority: "high",
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });
  } catch {
    // Non-critical
  }
}

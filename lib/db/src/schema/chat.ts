import { pgTable, text, serial, timestamp, pgEnum, integer, boolean } from "drizzle-orm/pg-core";

export const chatSessionStatusEnum = pgEnum("chat_session_status", ["open", "closed"]);
export const chatSenderRoleEnum = pgEnum("chat_sender_role", ["user", "admin"]);

export const chatSessionsTable = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: chatSessionStatusEnum("status").notNull().default("open"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  senderId: integer("sender_id").notNull(),
  senderRole: chatSenderRoleEnum("sender_role").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

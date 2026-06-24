import { pgTable, uuid, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { groups } from "./groups.js";

export const groupMessages = pgTable("group_messages", {
  message_id: uuid("message_id")
    .primaryKey()
    .defaultRandom(),

  group_id: uuid("group_id")
    .notNull()
    .references(() => groups.group_id, {
      onDelete: "cascade",
    }),

  sender_id: uuid("sender_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  message_type: varchar("message_type", {
    length: 20,
  }).notNull(),

  encrypted_content: text("encrypted_content"),

  media_url: text("media_url"),

  reply_to: uuid("reply_to")
    .references(() => groupMessages.message_id, {
      onDelete: "cascade",
    }),

  edited: boolean("edited")
    .notNull()
    .default(false),

  created_at: timestamp("created_at")
    .notNull()
    .defaultNow(),

  edited_at: timestamp("edited_at"),

  deleted_at: timestamp("deleted_at"),
});

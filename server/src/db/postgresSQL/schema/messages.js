import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users.js";
import { connections } from "./connections.js";

export const messages = pgTable("messages", {
  message_id: uuid("message_id")
    .primaryKey()
    .defaultRandom(),

  chat_id: uuid("chat_id")
    .notNull()
    .references(() => connections.connection_id, {
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
    .references(() => messages.message_id,{
      onDelete:"cascade",
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
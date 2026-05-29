import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";

import { users } from "./users";
import { messages } from "./messages";

export const reactions = pgTable("reactions", {
  reaction_id: uuid("reaction_id")
    .primaryKey()
    .defaultRandom(),

  message_id: uuid("message_id")
    .notNull()
    .references(() => messages.message_id, {
      onDelete: "cascade",
    }),

  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  emoji: varchar("emoji", {
    length: 10,
  }).notNull(),

  created_at: timestamp("created_at")
    .notNull()
    .defaultNow(),
});
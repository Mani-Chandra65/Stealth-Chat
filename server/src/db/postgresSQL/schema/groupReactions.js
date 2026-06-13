import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { groupMessages } from "./groupMessages.js";

export const groupReactions = pgTable("group_reactions", {
  reaction_id: uuid("reaction_id")
    .primaryKey()
    .defaultRandom(),

  message_id: uuid("message_id")
    .notNull()
    .references(() => groupMessages.message_id, {
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

import {
  pgTable,
  uuid,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const blockedUsers = pgTable("blocked_users", {
  blocker_id: uuid("blocker_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  blocked_id: uuid("blocked_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  created_at: timestamp("created_at")
    .notNull()
    .defaultNow(),
}, (table) => ({
  pk: primaryKey({
    columns: [table.blocker_id, table.blocked_id],
  }),
}));

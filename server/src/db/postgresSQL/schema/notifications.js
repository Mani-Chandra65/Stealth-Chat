import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const notifications = pgTable("notifications", {
  notification_id: uuid("notification_id")
    .primaryKey()
    .defaultRandom(),

  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  actor_id: uuid("actor_id")
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  type: varchar("type", { length: 50 })
    .notNull(),

  reference_id: uuid("reference_id"),

  is_read: boolean("is_read")
    .notNull()
    .default(false),

  created_at: timestamp("created_at")
    .notNull()
    .defaultNow(),
});
import {
  pgTable,
  uuid,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const deviceSessions = pgTable("device_sessions", {
  session_id: uuid("session_id")
    .primaryKey()
    .defaultRandom(),

  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  device_name: text("device_name")
    .notNull(),

  refresh_token_hash: text("refresh_token_hash")
    .notNull(),

  ip_address: text("ip_address")
    .notNull(),

  created_at: timestamp("created_at")
    .notNull()
    .defaultNow(),

  last_active_at: timestamp("last_active_at")
    .notNull()
    .defaultNow(),

  expires_at: timestamp("expires_at")
    .notNull(),

  revoked_at: timestamp("revoked_at"),
});
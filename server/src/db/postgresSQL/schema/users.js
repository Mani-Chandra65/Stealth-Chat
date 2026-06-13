import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  username: varchar("username", { length: 30 })
    .notNull()
    .unique(),

  email: varchar("email", { length: 255 })
    .notNull()
    .unique(),

  profilePicture: text("profile_picture"),

  bio: text("bio"),

  showLastSeen: boolean("show_last_seen")
    .default(true)
    .notNull(),

  showOnlineStatus: boolean("show_online_status")
    .default(true)
    .notNull(),

  readReceipts: boolean("read_receipts")
    .default(true)
    .notNull(),

  allowConnectionRequests: boolean("allow_connection_requests")
    .default(true)
    .notNull(),

  isDeleted: boolean("is_deleted")
    .default(false)
    .notNull(),

  deletedAt: timestamp("deleted_at"),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
});

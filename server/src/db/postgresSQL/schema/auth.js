import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean
} from "drizzle-orm/pg-core";
import { users } from "./users";


export const auth = pgTable("auth",{
    user_id:uuid('user_id')
        .notNull()
        .primaryKey()
        .references(() => users.id, {
            onDelete:"cascade",
        }),

    password_hash: text('password_hash')
        .notNull(),

    tfa_enabled: boolean('tfa_enabled')
        .notNull()
        .default(false),

    tfa_secret: text('tfa_secret'),

    last_password_change: timestamp('pwd_changed_time')
        .notNull()
        .defaultNow(),

})
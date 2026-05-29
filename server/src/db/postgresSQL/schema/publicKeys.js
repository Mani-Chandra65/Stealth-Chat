import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const publicKeys = pgTable('public_keys', {
    user_id: uuid('user_id')
        .notNull()
        .primaryKey()
        .references(()=> users.id, {
            onDelete:"cascade",
    }),

    public_key: text('public_key')
        .notNull(),
    
})
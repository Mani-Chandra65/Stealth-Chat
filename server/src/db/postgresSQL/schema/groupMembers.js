import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  primaryKey,
  boolean
} from "drizzle-orm/pg-core";
import { groups } from "./groups.js";
import { users } from "./users.js";

export const groupMembers = pgTable('group_members',{
    group_id: uuid('group_id')
        .notNull()
        .references(()=> groups.group_id, {
            onDelete:'cascade',
        }),

    user_id: uuid('user_id')
        .notNull()
        .references(()=> users.id,{
            onDelete:'cascade',
        }),
    role: varchar("role",{
        length:20,
    })
        .notNull()
        .default("member"),

    joined_at: timestamp("joined_at")
        .notNull()
        .defaultNow(),
}, (table) => ({
  pk: primaryKey({
    columns: [table.group_id, table.user_id]
  })
}))
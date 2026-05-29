import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean
} from "drizzle-orm/pg-core";
import { groups } from "./groups";
import { users } from "./users";

export const groupMembers = pgTable('group_members',{
    group_id: uuid('group_id')
        .notNull()
        .primaryKey()
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
})
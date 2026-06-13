import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const groups = pgTable('groups',{
    group_id: uuid('group_id')
        .primaryKey()
        .defaultRandom(),
    
    group_name: varchar('group_name',{'length': 20})
        .notNull(),

    avatar_url: text('avatar_url'),
    
    description: text('description'),

    created_by: uuid('created_by')
        .notNull()
        .references(()=> users.id, {
            onDelete: 'cascade',
        }),

    created_at: timestamp('created_at')
        .notNull()
        .defaultNow(),
    
    updated_at: timestamp('updated_at')
        .notNull()
        .defaultNow()
})
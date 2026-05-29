import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean
} from "drizzle-orm/pg-core";
import { users } from "./users";


export const connections = pgTable('connections',{
    connection_id: uuid('connection_id').defaultRandom().primaryKey(),

    user1_id: uuid('user1_id')
        .notNull()
        .references(()=> users.id ,{
            onDelete:'cascade'
        }),

    user2_id: uuid('user2_id')
        .notNull()
        .references(()=> users.id, {
            onDelete:'cascade'
        }),

    status: varchar('status')
        .notNull(),
    
    encrypted_AES_key_user1: text('encrypted_AES_key_user1')
        .notNull(),

    encrypted_AES_key_user2: text('encrypted_AES_key_user2')
        .notNull(),
    
    created_at: timestamp('created_at')
        .notNull()
        .defaultNow()
})
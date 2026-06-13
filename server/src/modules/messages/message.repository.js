import { db } from "../../db/postgresSQL/index.js";
import { messages } from "../../db/postgresSQL/schema/messages.js";
import { connections } from "../../db/postgresSQL/schema/connections.js";
import { reactions } from "../../db/postgresSQL/schema/reactions.js";
import { users } from "../../db/postgresSQL/schema/users.js";
import { eq, and, ne, asc, inArray } from "drizzle-orm";

export const createMessage = async ({
  chatId,
  senderId,
  messageType,
  encryptedContent,
  mediaUrl,
  replyTo,
  status = "sent",
}) => {
  const [msg] = await db.insert(messages).values({
    chat_id: chatId,
    sender_id: senderId,
    message_type: messageType,
    encrypted_content: encryptedContent,
    media_url: mediaUrl,
    reply_to: replyTo,
    status: status,
  }).returning();
  return msg;
};

export const getChatMessages = async (chatId) => {
  const msgs = await db.select()
    .from(messages)
    .where(eq(messages.chat_id, chatId))
    .orderBy(asc(messages.created_at));

  if (msgs.length === 0) return [];

  // Fetch reactions for these messages
  const msgIds = msgs.map(m => m.message_id);
  const rxns = await db.select({
    reactionId: reactions.reaction_id,
    messageId: reactions.message_id,
    userId: reactions.user_id,
    emoji: reactions.emoji,
    username: users.username
  })
  .from(reactions)
  .innerJoin(users, eq(reactions.user_id, users.id))
  .where(inArray(reactions.message_id, msgIds));

  // Map reactions back to their respective messages
  return msgs.map(m => {
    return {
      ...m,
      reactions: rxns.filter(r => r.messageId === m.message_id)
    };
  });
};

export const updateMessagesStatus = async (chatId, recipientId, status) => {
  return db.update(messages)
    .set({ status })
    .where(and(
      eq(messages.chat_id, chatId),
      ne(messages.sender_id, recipientId),
      ne(messages.status, "read")
    ))
    .returning();
};

export const getConnectionParticipants = async (chatId) => {
  return db.query.connections.findFirst({
    where: (connections, { eq }) => eq(connections.connection_id, chatId)
  });
};

export const editMessage = async (messageId, senderId, newCiphertext) => {
  const [updated] = await db.update(messages)
    .set({
      encrypted_content: newCiphertext,
      edited: true,
      edited_at: new Date()
    })
    .where(and(
      eq(messages.message_id, messageId),
      eq(messages.sender_id, senderId)
    ))
    .returning();
  return updated;
};

export const deleteMessage = async (messageId, senderId) => {
  const [deleted] = await db.update(messages)
    .set({
      deleted_at: new Date(),
      encrypted_content: "", // Clear content for privacy
      media_url: ""
    })
    .where(and(
      eq(messages.message_id, messageId),
      eq(messages.sender_id, senderId)
    ))
    .returning();
  return deleted;
};

export const toggleReaction = async (messageId, userId, emoji) => {
  // Check if any reaction already exists for this user on this message
  const existing = await db.query.reactions.findFirst({
    where: (reactions, { and, eq }) => and(
      eq(reactions.message_id, messageId),
      eq(reactions.user_id, userId)
    )
  });

  // Fetch username of reactor
  const userRecord = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, userId)
  });

  if (existing) {
    if (existing.emoji === emoji) {
      // Toggle off: if same emoji, remove it
      await db.delete(reactions).where(eq(reactions.reaction_id, existing.reaction_id));
      return { action: "remove", emoji, userId };
    } else {
      // Change: if different emoji, update it
      const [updated] = await db.update(reactions)
        .set({ emoji })
        .where(eq(reactions.reaction_id, existing.reaction_id))
        .returning();
      
      return {
        action: "change",
        oldEmoji: existing.emoji,
        reaction: {
          reactionId: updated.reaction_id,
          messageId: updated.message_id,
          userId: updated.user_id,
          emoji: updated.emoji,
          username: userRecord ? userRecord.username : "Unknown"
        }
      };
    }
  } else {
    // Add new reaction
    const [inserted] = await db.insert(reactions).values({
      message_id: messageId,
      user_id: userId,
      emoji
    }).returning();
    
    return { 
      action: "add", 
      reaction: {
        reactionId: inserted.reaction_id,
        messageId: inserted.message_id,
        userId: inserted.user_id,
        emoji: inserted.emoji,
        username: userRecord ? userRecord.username : "Unknown"
      } 
    };
  }
};

export const getMessageById = async (messageId) => {
  const [msg] = await db.select()
    .from(messages)
    .where(eq(messages.message_id, messageId));
  return msg;
};


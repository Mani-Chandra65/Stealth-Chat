import { db } from "../../db/postgresSQL/index.js";
import { groups } from "../../db/postgresSQL/schema/groups.js";
import { groupMembers } from "../../db/postgresSQL/schema/groupMembers.js";
import { groupMessages } from "../../db/postgresSQL/schema/groupMessages.js";
import { groupReactions } from "../../db/postgresSQL/schema/groupReactions.js";
import { users } from "../../db/postgresSQL/schema/users.js";
import { eq, and, inArray, asc, sql } from "drizzle-orm";

export const createGroup = async (createdBy, groupName, description, encryptedGroupKey) => {
  return db.transaction(async (tx) => {
    const [grp] = await tx.insert(groups).values({
      group_name: groupName,
      description,
      created_by: createdBy,
    }).returning();

    await tx.insert(groupMembers).values({
      group_id: grp.group_id,
      user_id: createdBy,
      role: "owner",
      encrypted_group_key: encryptedGroupKey,
    });

    return grp;
  });
};

export const addGroupMember = async (groupId, userId, role, encryptedGroupKey) => {
  // If this user is the permanent creator of the group, they must rejoin as owner
  const grp = await db.query.groups.findFirst({
    where: (groups, { eq }) => eq(groups.group_id, groupId)
  });

  const finalRole = grp && grp.created_by === userId ? "owner" : role;

  const [inserted] = await db.insert(groupMembers).values({
    group_id: groupId,
    user_id: userId,
    role: finalRole,
    encrypted_group_key: encryptedGroupKey,
  }).returning();

  return inserted;
};

export const removeGroupMemberAndRotateKeys = async (groupId, removeUserId, rotatedKeys) => {
  return db.transaction(async (tx) => {
    // Delete the member
    await tx.delete(groupMembers).where(
      and(
        eq(groupMembers.group_id, groupId),
        eq(groupMembers.user_id, removeUserId)
      )
    );

    // Update keys for remaining members
    for (const keyInfo of rotatedKeys) {
      await tx.update(groupMembers)
        .set({ encrypted_group_key: keyInfo.encryptedGroupKey })
        .where(
          and(
            eq(groupMembers.group_id, groupId),
            eq(groupMembers.user_id, keyInfo.userId)
          )
        );
    }
  });
};

export const updateMemberRole = async (groupId, userId, role) => {
  const [updated] = await db.update(groupMembers)
    .set({ role })
    .where(
      and(
        eq(groupMembers.group_id, groupId),
        eq(groupMembers.user_id, userId)
      )
    )
    .returning();
  return updated;
};

export const getGroupMembers = async (groupId) => {
  return db.select({
    userId: users.id,
    username: users.username,
    profilePicture: users.profilePicture,
    role: groupMembers.role,
    joinedAt: groupMembers.joined_at,
  })
  .from(groupMembers)
  .innerJoin(users, eq(groupMembers.user_id, users.id))
  .where(eq(groupMembers.group_id, groupId));
};

export const getMemberDetails = async (groupId, userId) => {
  return db.query.groupMembers.findFirst({
    where: (groupMembers, { and, eq }) => and(
      eq(groupMembers.group_id, groupId),
      eq(groupMembers.user_id, userId)
    )
  });
};

export const getUserGroupsList = async (userId) => {
  const userGroups = await db.select({
    groupId: groups.group_id,
    groupName: groups.group_name,
    avatarUrl: groups.avatar_url,
    description: groups.description,
    createdBy: groups.created_by,
    createdAt: groups.created_at,
    role: groupMembers.role,
    encryptedGroupKey: groupMembers.encrypted_group_key
  })
  .from(groupMembers)
  .innerJoin(groups, eq(groupMembers.group_id, groups.group_id))
  .where(eq(groupMembers.user_id, userId));

  if (userGroups.length === 0) return [];

  const groupIds = userGroups.map(g => g.groupId);
  const lastMsgTimes = await db.select({
    groupId: groupMessages.group_id,
    lastMessageAt: sql`max(${groupMessages.created_at})`.as('lastMessageAt')
  })
  .from(groupMessages)
  .where(inArray(groupMessages.group_id, groupIds))
  .groupBy(groupMessages.group_id);

  return userGroups.map(g => {
    const lastMsg = lastMsgTimes.find(t => t.groupId === g.groupId);
    return {
      ...g,
      lastActivityAt: lastMsg ? lastMsg.lastMessageAt : g.createdAt
    };
  });
};

export const createGroupMessage = async ({
  groupId,
  senderId,
  messageType,
  encryptedContent,
  mediaUrl,
  replyTo,
}) => {
  const [msg] = await db.insert(groupMessages).values({
    group_id: groupId,
    sender_id: senderId,
    message_type: messageType,
    encrypted_content: encryptedContent,
    media_url: mediaUrl,
    reply_to: replyTo,
  }).returning();
  return msg;
};

export const getGroupMessages = async (groupId) => {
  const msgs = await db.select()
    .from(groupMessages)
    .where(eq(groupMessages.group_id, groupId))
    .orderBy(asc(groupMessages.created_at));

  if (msgs.length === 0) return [];

  const msgIds = msgs.map(m => m.message_id);
  const rxns = await db.select({
    reactionId: groupReactions.reaction_id,
    messageId: groupReactions.message_id,
    userId: groupReactions.user_id,
    emoji: groupReactions.emoji,
    username: users.username
  })
  .from(groupReactions)
  .innerJoin(users, eq(groupReactions.user_id, users.id))
  .where(inArray(groupReactions.message_id, msgIds));

  return msgs.map(m => {
    return {
      ...m,
      reactions: rxns.filter(r => r.messageId === m.message_id)
    };
  });
};

export const editGroupMessage = async (messageId, senderId, ciphertext) => {
  const [updated] = await db.update(groupMessages)
    .set({
      encrypted_content: ciphertext,
      edited: true,
      edited_at: new Date()
    })
    .where(
      and(
        eq(groupMessages.message_id, messageId),
        eq(groupMessages.sender_id, senderId)
      )
    )
    .returning();
  return updated;
};

export const deleteGroupMessage = async (messageId, senderId) => {
  const [deleted] = await db.update(groupMessages)
    .set({
      deleted_at: new Date(),
      encrypted_content: "",
      media_url: ""
    })
    .where(
      and(
        eq(groupMessages.message_id, messageId),
        eq(groupMessages.sender_id, senderId)
      )
    )
    .returning();
  return deleted;
};

export const toggleGroupReaction = async (messageId, userId, emoji) => {
  const existing = await db.query.groupReactions.findFirst({
    where: (reactions, { and, eq }) => and(
      eq(reactions.message_id, messageId),
      eq(reactions.user_id, userId)
    )
  });

  const userRecord = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, userId)
  });

  if (existing) {
    if (existing.emoji === emoji) {
      await db.delete(groupReactions).where(eq(groupReactions.reaction_id, existing.reaction_id));
      return { action: "remove", emoji, userId };
    } else {
      const [updated] = await db.update(groupReactions)
        .set({ emoji })
        .where(eq(groupReactions.reaction_id, existing.reaction_id))
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
    const [inserted] = await db.insert(groupReactions).values({
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

export const getGroupMessageById = async (messageId) => {
  const [msg] = await db.select()
    .from(groupMessages)
    .where(eq(groupMessages.message_id, messageId));
  return msg;
};

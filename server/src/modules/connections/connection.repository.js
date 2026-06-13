import { db } from '../../db/postgresSQL/index.js';
import { connections, users, publicKeys, messages } from '../../db/postgresSQL/schema/index.js';
import { eq, and, or, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export const createConnection = async (user1Id, user2Id, status = 'pending') => {
    const [connection] = await db.insert(connections).values({
        user1_id: user1Id,
        user2_id: user2Id,
        status: status,
        encrypted_AES_key_user1: "",
        encrypted_AES_key_user2: ""
    }).returning();
    return connection;
};

export const getConnectionById = async (connectionId) => {
    return db.query.connections.findFirst({
        where: (connections, { eq }) => eq(connections.connection_id, connectionId)
    });
};

export const getConnectionBetweenUsers = async (user1Id, user2Id) => {
    return db.query.connections.findFirst({
        where: (connections, { or, and, eq }) => or(
            and(eq(connections.user1_id, user1Id), eq(connections.user2_id, user2Id)),
            and(eq(connections.user1_id, user2Id), eq(connections.user2_id, user1Id))
        )
    });
};

export const updateConnectionStatus = async (connectionId, status) => {
    const [updated] = await db.update(connections)
        .set({ status })
        .where(eq(connections.connection_id, connectionId))
        .returning();
    return updated;
};

export const updateConnectionKeys = async (connectionId, status, encryptedAesKeyUser1, encryptedAesKeyUser2) => {
    const [updated] = await db.update(connections)
        .set({
            status,
            encrypted_AES_key_user1: encryptedAesKeyUser1,
            encrypted_AES_key_user2: encryptedAesKeyUser2
        })
        .where(eq(connections.connection_id, connectionId))
        .returning();
    return updated;
};

export const getUserPublicKey = async (userId) => {
    const pk = await db.query.publicKeys.findFirst({
        where: (publicKeys, { eq }) => eq(publicKeys.user_id, userId)
    });
    return pk ? pk.public_key : null;
};

export const getPendingRequestsReceived = async (userId) => {
    return db.select({
        connectionId: connections.connection_id,
        senderId: users.id,
        senderUsername: users.username,
        senderProfilePicture: users.profilePicture,
        createdAt: connections.created_at
    })
    .from(connections)
    .innerJoin(users, eq(connections.user1_id, users.id))
    .where(and(
        eq(connections.user2_id, userId),
        eq(connections.status, 'pending')
    ));
};

export const getConnectionsList = async (userId) => {
    const user1 = alias(users, 'user1');
    const user2 = alias(users, 'user2');

    const results = await db.select({
        connectionId: connections.connection_id,
        createdAt: connections.created_at,
        user1: {
            id: user1.id,
            username: user1.username,
            profilePicture: user1.profilePicture
        },
        user2: {
            id: user2.id,
            username: user2.username,
            profilePicture: user2.profilePicture
        },
        encryptedAESKeyUser1: connections.encrypted_AES_key_user1,
        encryptedAESKeyUser2: connections.encrypted_AES_key_user2
    })
    .from(connections)
    .innerJoin(user1, eq(connections.user1_id, user1.id))
    .innerJoin(user2, eq(connections.user2_id, user2.id))
    .where(and(
        eq(connections.status, 'accepted'),
        or(eq(connections.user1_id, userId), eq(connections.user2_id, userId))
    ));

    if (results.length === 0) return [];

    // Query last message timestamp for each active connection
    const connectionIds = results.map(r => r.connectionId);
    const lastMsgTimes = await db.select({
        chatId: messages.chat_id,
        lastMessageAt: sql`max(${messages.created_at})`.as('lastMessageAt')
    })
    .from(messages)
    .where(inArray(messages.chat_id, connectionIds))
    .groupBy(messages.chat_id);

    return results.map(row => {
        const isUser1 = row.user1.id === userId;
        const peer = isUser1 ? row.user2 : row.user1;
        const encryptedAESKey = isUser1 ? row.encryptedAESKeyUser1 : row.encryptedAESKeyUser2;
        
        const lastMsg = lastMsgTimes.find(t => t.chatId === row.connectionId);
        const lastActivityAt = lastMsg ? lastMsg.lastMessageAt : row.createdAt;

        return {
            connectionId: row.connectionId,
            createdAt: row.createdAt,
            peerId: peer.id,
            peerUsername: peer.username,
            peerProfilePicture: peer.profilePicture,
            encryptedAESKey,
            lastActivityAt
        };
    });
};

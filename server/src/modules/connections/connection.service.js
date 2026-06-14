import crypto from 'crypto';
import { onlineUsers } from '../../sockets/handlers/presence.handler.js';
import { db } from '../../db/postgresSQL/index.js';
import { connections } from '../../db/postgresSQL/schema/connections.js';
import { eq } from 'drizzle-orm';
import { findUserById } from '../auth/auth.repository.js';
import {
    createConnection,
    getConnectionById,
    getConnectionBetweenUsers,
    updateConnectionStatus,
    updateConnectionKeys,
    getUserPublicKey,
    getPendingRequestsReceived,
    getConnectionsList
} from './connection.repository.js';

export const sendRequest = async (senderId, receiverId) => {
    if (senderId === receiverId) {
        throw new Error("You cannot send a connection request to yourself");
    }

    // Verify receiver exists
    const receiver = await findUserById(receiverId);
    if (!receiver) {
        throw new Error("Receiver user not found");
    }

    if (!receiver.allowConnectionRequests) {
        throw new Error("This user does not accept connection requests");
    }

    // Check existing connection
    const existingConnection = await getConnectionBetweenUsers(senderId, receiverId);
    if (existingConnection) {
        if (existingConnection.status === 'pending') {
            throw new Error("Connection request already pending");
        }
        if (existingConnection.status === 'accepted') {
            throw new Error("Already connected with this user");
        }
        if (existingConnection.status === 'rejected') {
            // Remove the rejected connection record so we can create a new pending one
            await db.delete(connections).where(eq(connections.connection_id, existingConnection.connection_id));
        }
    }

    // Create the connection
    const connection = await createConnection(senderId, receiverId, 'pending');

    return {
        connection,
        receiver: {
            id: receiver.id,
            username: receiver.username,
            profilePicture: receiver.profilePicture
        }
    };
};

export const acceptRequest = async (connectionId, userId, encryptedAESKeyUser1, encryptedAESKeyUser2) => {
    const connection = await getConnectionById(connectionId);
    if (!connection) {
        throw new Error("Connection request not found");
    }

    if (connection.status !== 'pending') {
        throw new Error("Connection request is not pending");
    }

    if (connection.user2_id !== userId) {
        throw new Error("You are not authorized to accept this connection request");
    }

    if (!encryptedAESKeyUser1 || !encryptedAESKeyUser2) {
        throw new Error("Encrypted AES keys for both users are required");
    }

    // Update connection status and encrypted AES keys in database
    const updated = await updateConnectionKeys(connectionId, 'accepted', encryptedAESKeyUser1, encryptedAESKeyUser2);

    // Fetch user profiles to return detailed information
    const sender = await findUserById(connection.user1_id);
    const receiver = await findUserById(connection.user2_id);

    return {
        connection: updated,
        user1: { id: sender.id, username: sender.username, profilePicture: sender.profilePicture },
        user2: { id: receiver.id, username: receiver.username, profilePicture: receiver.profilePicture }
    };
};

export const rejectRequest = async (connectionId, userId) => {
    const connection = await getConnectionById(connectionId);
    if (!connection) {
        throw new Error("Connection request not found");
    }

    if (connection.status !== 'pending') {
        throw new Error("Connection request is not pending");
    }

    if (connection.user2_id !== userId) {
        throw new Error("You are not authorized to reject this connection request");
    }

    const updated = await updateConnectionStatus(connectionId, 'rejected');
    return updated;
};

export const getPending = async (userId) => {
    return getPendingRequestsReceived(userId);
};

export const getConnections = async (userId) => {
    const list = await getConnectionsList(userId);
    return list.map(chat => {
        const isOnline = chat.peerShowOnlineStatus ? onlineUsers.has(chat.peerId) : false;
        return {
            ...chat,
            isOnline
        };
    });
};

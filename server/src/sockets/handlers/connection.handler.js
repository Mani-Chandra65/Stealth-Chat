import * as connectionService from '../../modules/connections/connection.service.js';
import { onlineUsers } from './presence.handler.js';

export const registerConnectionHandlers = (
    io,
    socket
) => {

    socket.on(
        "connection:send-request",
        async (payload, callback) => {
            try {
                const senderId = socket.user.id;
                const { receiverId } = payload;

                if (!receiverId) {
                    throw new Error("Receiver ID is required");
                }

                const result = await connectionService.sendRequest(senderId, receiverId);

                // Find receiver sockets and notify them
                const receiverSockets = onlineUsers.get(receiverId);
                if (receiverSockets) {
                    receiverSockets.forEach(socketId => {
                        io.to(socketId).emit("connection:request-received", {
                            connectionId: result.connection.connection_id,
                            senderId: socket.user.id,
                            senderUsername: socket.user.username,
                            createdAt: result.connection.created_at
                        });
                    });
                }

                if (typeof callback === 'function') {
                    callback({
                        success: true,
                        message: "Connection request sent!",
                        connection: result.connection
                    });
                }
            } catch (error) {
                console.error("Socket error on connection:send-request:", error);
                if (typeof callback === 'function') {
                    callback({
                        success: false,
                        error: error.message || "Failed to send connection request"
                    });
                }
            }
        }
    );

    socket.on(
        "connection:accept-request",
        async (payload, callback) => {
            try {
                const userId = socket.user.id;
                const { connectionId, encryptedAESKeyUser1, encryptedAESKeyUser2 } = payload;

                if (!connectionId) {
                    throw new Error("Connection ID is required");
                }

                if (!encryptedAESKeyUser1 || !encryptedAESKeyUser2) {
                    throw new Error("Encrypted AES keys for both users are required");
                }

                const result = await connectionService.acceptRequest(
                    connectionId, 
                    userId, 
                    encryptedAESKeyUser1, 
                    encryptedAESKeyUser2
                );

                // Notify user 1 (requester)
                const user1Sockets = onlineUsers.get(result.connection.user1_id);
                if (user1Sockets) {
                    user1Sockets.forEach(socketId => {
                        io.to(socketId).emit("connection:accepted", {
                            connectionId: result.connection.connection_id,
                            status: "accepted",
                            encryptedAESKey: result.connection.encrypted_AES_key_user1,
                            peerId: result.user2.id,
                            peerUsername: result.user2.username,
                            peerProfilePicture: result.user2.profilePicture
                        });
                    });
                }

                // Notify user 2 (acceptor)
                const user2Sockets = onlineUsers.get(result.connection.user2_id);
                if (user2Sockets) {
                    user2Sockets.forEach(socketId => {
                        io.to(socketId).emit("connection:accepted", {
                            connectionId: result.connection.connection_id,
                            status: "accepted",
                            encryptedAESKey: result.connection.encrypted_AES_key_user2,
                            peerId: result.user1.id,
                            peerUsername: result.user1.username,
                            peerProfilePicture: result.user1.profilePicture
                        });
                    });
                }

                if (typeof callback === 'function') {
                    callback({
                        success: true,
                        message: "Connection accepted!",
                        connection: result.connection
                    });
                }
            } catch (error) {
                console.error("Socket error on connection:accept-request:", error);
                if (typeof callback === 'function') {
                    callback({
                        success: false,
                        error: error.message || "Failed to accept connection request"
                    });
                }
            }
        }
    );

    socket.on(
        "connection:reject-request",
        async (payload, callback) => {
            try {
                const userId = socket.user.id;
                const { connectionId } = payload;

                if (!connectionId) {
                    throw new Error("Connection ID is required");
                }

                const result = await connectionService.rejectRequest(connectionId, userId);

                // Notify user 1 (requester)
                const user1Sockets = onlineUsers.get(result.user1_id);
                if (user1Sockets) {
                    user1Sockets.forEach(socketId => {
                        io.to(socketId).emit("connection:rejected", {
                            connectionId: result.connection_id
                        });
                    });
                }

                if (typeof callback === 'function') {
                    callback({
                        success: true,
                        message: "Connection rejected!",
                        connection: result
                    });
                }
            } catch (error) {
                console.error("Socket error on connection:reject-request:", error);
                if (typeof callback === 'function') {
                    callback({
                        success: false,
                        error: error.message || "Failed to reject connection request"
                    });
                }
            }
        }
    );
};
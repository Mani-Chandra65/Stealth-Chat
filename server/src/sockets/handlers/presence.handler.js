import { getConnectionsList } from '../../modules/connections/connection.repository.js';

export const onlineUsers = new Map();

export const broadcastPresence = async (io, userId, status) => {
    try {
        const list = await getConnectionsList(userId);
        list.forEach(chat => {
            const peerSockets = onlineUsers.get(chat.peerId);
            if (peerSockets) {
                peerSockets.forEach(socketId => {
                    io.to(socketId).emit("presence:update", {
                        userId,
                        status // "online" or "offline"
                    });
                });
            }
        });
    } catch (err) {
        console.error("Failed to broadcast presence:", err);
    }
};
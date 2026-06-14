import { getConnectionsList } from '../../modules/connections/connection.repository.js';
import { db } from '../../db/postgresSQL/index.js';
import { users } from '../../db/postgresSQL/schema/users.js';
import { eq } from 'drizzle-orm';

export const onlineUsers = new Map();

export const broadcastPresence = async (io, userId, status) => {
    try {
        const [user] = await db
            .select({ showOnlineStatus: users.showOnlineStatus })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        // If the user has showOnlineStatus disabled, suppress broadcasting the "online" state
        if (status === "online" && user && !user.showOnlineStatus) {
            return;
        }

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
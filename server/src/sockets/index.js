import {Server} from 'socket.io';

import {socketAuthMiddleware} from './middleware/auth.middleware.js';
import {registerConnectionHandlers} from './handlers/connection.handler.js';
import {registerMessageHandlers} from './handlers/message.handler.js';
import {registerNotificationHandlers} from './handlers/notification.handler.js';
import {registerGroupHandlers} from './handlers/group.handler.js';
import {onlineUsers, broadcastPresence} from './handlers/presence.handler.js';

export const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            credentials: true
        }
    });

    io.use(socketAuthMiddleware);

    io.on('connection', async (socket) => {
        console.log(`${socket.user.username} connected`);

        const isNewConnection = !onlineUsers.has(socket.user.id);
        if (isNewConnection) {
            onlineUsers.set(socket.user.id, new Set());
        }
        onlineUsers.get(socket.user.id).add(socket.id);

        if (isNewConnection) {
            await broadcastPresence(io, socket.user.id, "online");
        }

        registerConnectionHandlers(io, socket);
        registerMessageHandlers(io, socket);
        registerNotificationHandlers(io, socket);
        registerGroupHandlers(io, socket);

        socket.on('disconnect', async () => {
            console.log(`${socket.user.username} disconnected`);
            const userSockets = onlineUsers.get(socket.user.id);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(socket.user.id);
                    await broadcastPresence(io, socket.user.id, "offline");
                }
            }
        })
    })
}
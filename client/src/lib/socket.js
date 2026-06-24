import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (token) => {
    if (socket?.connected) {
        return socket;
    }

    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        auth: {
            token,
        },
        withCredentials: true,
    });

    socket.on("connect", () => {
        console.log("Socket connected");
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected");
    });

    socket.on("connect_error", (err) => {
        console.error("Socket error:", err.message);
    });

    return socket;
};

export const disconnectSocket = () => {
    if (!socket) return;

    socket.disconnect();
    socket = null;
};

export const getSocket = () => socket;
import jwt from "jsonwebtoken";
import { verifyToken } from "../../services/jwt.service.js";

export const socketAuthMiddleware = async (
    socket,
    next
) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(
                new Error("Authentication required")
            );
        }

        const decoded = verifyToken(token);
        socket.user = {
            id: decoded.userId,
            userId: decoded.userId,
            username: decoded.username,
        };

        next();

    } catch (error) {
        next(
            new Error("Invalid token")
        );
    }
};
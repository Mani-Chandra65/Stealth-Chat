import { verifyToken } from "../../services/jwt.service.js";
import { db } from "../../db/postgresSQL/index.js";
import { deviceSessions } from "../../db/postgresSQL/schema/index.js";
import { eq, and, gt, isNull } from "drizzle-orm";

export const socketAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Authentication required"));
        }

        const decoded = verifyToken(token);
        
        // Verify that the user has an active, non-revoked session in the database
        const sessions = await db.select()
            .from(deviceSessions)
            .where(
                and(
                    eq(deviceSessions.user_id, decoded.userId),
                    isNull(deviceSessions.revoked_at),
                    gt(deviceSessions.expires_at, new Date())
                )
            )
            .limit(1);

        if (sessions.length === 0) {
            return next(new Error("Session revoked or expired"));
        }

        socket.user = {
            id: decoded.userId,
            userId: decoded.userId,
            username: decoded.username,
        };
        socket.deviceSession = sessions[0];

        next();
    } catch (error) {
        return next(new Error("Invalid token"));
    }
};
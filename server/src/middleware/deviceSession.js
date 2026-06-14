import { db } from '../db/postgresSQL/index.js';
import { deviceSessions } from '../db/postgresSQL/schema/index.js';
import { eq, and, gt, isNull } from 'drizzle-orm';

/**
 * Middleware to validate that the user's active access token corresponds to
 * an active (non-revoked, non-expired) session in the device_sessions database table.
 * 
 * Must be placed AFTER the `authenticate` middleware.
 */
export const validateDeviceSession = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized: Missing user context" 
            });
        }

        // Query the database to check if there is an active session for the authenticated user
        const sessionId = req.user.sessionId;
        const queryCondition = sessionId
            ? eq(deviceSessions.session_id, sessionId)
            : eq(deviceSessions.user_id, req.user.userId);

        const sessions = await db.select()
            .from(deviceSessions)
            .where(
                and(
                    queryCondition,
                    eq(deviceSessions.user_id, req.user.userId),
                    isNull(deviceSessions.revoked_at),
                    gt(deviceSessions.expires_at, new Date())
                )
            )
            .limit(1);

        if (sessions.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: "Unauthorized: Session has been revoked or expired" 
            });
        }

        // Bind session object to the request
        req.deviceSession = sessions[0];

        // Asynchronously update last_active_at timestamp without blocking request execution
        db.update(deviceSessions)
            .set({ last_active_at: new Date() })
            .where(eq(deviceSessions.session_id, sessions[0].session_id))
            .catch(err => console.error("[Device Session] Failed to update last_active_at:", err));

        next();
    } catch (error) {
        next(error);
    }
};

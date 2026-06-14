import { verifyToken } from '../services/jwt.service.js';
import { validateDeviceSession } from './deviceSession.js';

export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing token" });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyToken(token);
        req.user = decoded; // { userId, username }
        
        // Delegate to deviceSession middleware to verify active DB session
        validateDeviceSession(req, res, next);
    } catch (error) {
        return res.status(401).json({ success: false, error: "Unauthorized: Invalid token" });
    }
};
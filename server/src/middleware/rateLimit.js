import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per window
    standardHeaders: true, // Return rate limit info in standard headers
    legacyHeaders: false, // Disable legacy headers
    message: {
        success: false,
        error: "Too many requests from this IP, please try again after 15 minutes."
    }
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 15 attempts per window (brute-force defense)
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many attempts from this IP, please try again after 15 minutes."
    }
});

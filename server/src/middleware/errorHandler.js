import { ZodError } from 'zod';

export const errorHandler = (err, req, res, next) => {
    // Log the error internally for server-side debugging
    console.error(`[Error Handler] path: ${req.path}, message: ${err.message || err}`, err);

    // 1. Zod Validation Error (Bad Request)
    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            error: "Validation failed",
            details: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message
            }))
        });
    }

    // 2. JWT Authentication Errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: "Unauthorized: Invalid token structure"
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: "Unauthorized: Token has expired"
        });
    }

    // 3. PostgreSQL Database Conflict / Unique Constraint Violation
    if (err.code === '23505') {
        const isEmail = err.constraint?.includes('email');
        const isUsername = err.constraint?.includes('username');
        return res.status(409).json({
            success: false,
            error: isEmail 
                ? "A user with this email already exists." 
                : isUsername 
                    ? "A user with this username already exists." 
                    : "Conflict: Resource already exists."
        });
    }

    // 4. Custom/Operational Errors (e.g. from service layers with statusCode)
    const statusCode = err.statusCode || err.status || 500;
    const isOperational = err.isOperational || statusCode < 500;

    // 5. Response Sanitization
    return res.status(statusCode).json({
        success: false,
        error: isOperational ? err.message : "Internal Server Error"
    });
};

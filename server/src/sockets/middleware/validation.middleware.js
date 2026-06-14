import { ZodError } from "zod";

/**
 * Higher-order helper to validate incoming socket event payloads against Zod schemas.
 * 
 * @param {import("zod").ZodSchema} schema - The Zod validation schema
 * @param {Function} handler - The socket event handler callback
 * @returns {Function} Wrapped socket handler that performs validation
 */
export const validateEvent = (schema, handler) => {
    return (payload, callback) => {
        try {
            // Parse and validate the payload data
            const validatedPayload = schema.parse(payload);
            
            // Execute the handler with validated data
            handler(validatedPayload, callback);
        } catch (error) {
            console.error("[Socket Validation] Event payload validation failed:", error.message || error);
            
            // If the client provided an acknowledgement callback, return structured validation errors
            if (typeof callback === "function") {
                if (error instanceof ZodError) {
                    return callback({
                        success: false,
                        error: "Validation failed",
                        details: error.errors.map(e => ({
                            field: e.path.join('.'),
                            message: e.message
                        }))
                    });
                }
                
                return callback({
                    success: false,
                    error: "Invalid payload data"
                });
            }
        }
    };
};

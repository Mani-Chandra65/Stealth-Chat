// In-memory map to store event timestamps per socket
const eventRates = new Map();

const WINDOW_MS = 10000; // 10 seconds sliding window
const MAX_EVENTS = 100;  // Max 100 event emits allowed in window

/**
 * Socket.io middleware to intercept and rate-limit client event emissions.
 * Overrides socket.onevent to monitor event frequency.
 */
export const socketRateLimitMiddleware = (socket, next) => {
    const originalOnEvent = socket.onevent;

    socket.onevent = function (packet) {
        const eventName = packet.data?.[0];
        // Exclude typing indicator events from rate limiting
        if (eventName && eventName.startsWith("typing:")) {
            originalOnEvent.call(this, packet);
            return;
        }

        const socketId = socket.id;
        const now = Date.now();

        if (!eventRates.has(socketId)) {
            eventRates.set(socketId, []);
        }

        const timestamps = eventRates.get(socketId);
        
        // Remove timestamps outside of the sliding window
        const validTimestamps = timestamps.filter(ts => now - ts < WINDOW_MS);
        validTimestamps.push(now);
        eventRates.set(socketId, validTimestamps);

        if (validTimestamps.length > MAX_EVENTS) {
            console.warn(`[Socket Rate Limit] Socket ${socketId} (${socket.user?.username || "anonymous"}) rate limited.`);
            
            // Emit rate limit error to client
            socket.emit("error:rate-limited", { 
                success: false,
                error: "Rate limit exceeded. Please wait before sending more messages." 
            });
            
            // Return early to drop the packet and ignore the event
            return;
        }

        // Forward valid events to standard handlers
        originalOnEvent.call(this, packet);
    };

    next();
};

/**
 * Cleans up in-memory rates for a socket on disconnect.
 */
export const cleanSocketRateLimitStore = (socketId) => {
    eventRates.delete(socketId);
};

import 'dotenv/config';
import express from 'express';
import {createServer} from 'node:http';
import authRoutes from './src/modules/auth/auth.routes.js';
import userRoutes from './src/modules/users/user.routes.js';
import connectionRoutes from './src/modules/connections/connection.routes.js';
import messageRoutes from './src/modules/messages/message.routes.js';
import groupRoutes from './src/modules/groups/group.routes.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { initSocket } from './src/sockets/index.js';

// Middlewares
import { apiLimiter, authLimiter } from './src/middleware/rateLimit.js';
import { notFound } from './src/middleware/notFound.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();
app.set("trust proxy", 1); // Trust Render's reverse proxy
const server = createServer(app);

initSocket(server);

// Security Headers (configured to allow cross-origin requests for uploads/static assets)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Route Registrations with Rate Limiting
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/users", apiLimiter, userRoutes);
app.use("/api/v1/connections", apiLimiter, connectionRoutes);
app.use("/api/v1/messages", apiLimiter, messageRoutes);
app.use("/api/v1/groups", apiLimiter, groupRoutes);
app.use("/uploads", express.static("uploads"));

app.get('/', (req, res) => {
    return res.status(200).send("Home Page");
});

// 404 Route Not Found Middleware
app.use(notFound);

// Global Error Handler Middleware
app.use(errorHandler);

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Backend running on port:${port}`);
});

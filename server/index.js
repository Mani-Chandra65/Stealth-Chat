import express from 'express';
import {createServer} from 'node:http';
import authRoutes from './src/modules/auth/auth.routes.js';
import userRoutes from './src/modules/users/user.routes.js';
import connectionRoutes from './src/modules/connections/connection.routes.js';
import messageRoutes from './src/modules/messages/message.routes.js';
import groupRoutes from './src/modules/groups/group.routes.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { initSocket } from './src/sockets/index.js';

const app = express();
const server = createServer(app);

initSocket(server);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth",authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/connections", connectionRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/groups", groupRoutes);
app.use("/uploads", express.static("uploads"));


app.get('/',(req,res) => {
    return res.status(200).send("Home Page");
})

const port = process.env.PORT || 3000;
server.listen(port,()=>{
    console.log(`Backend running on port:${port}`);
})

import express from 'express';
import {createServer} from 'node:http';
import {join} from 'node:path';
import {Server} from 'socket.io';
import authRoutes from './src/modules/auth/auth.routes.js';
import userRoutes from './src/modules/users/user.routes.js';
import cookieParser from 'cookie-parser';

const app = express();
const server = createServer(app);
// const io = new Server(server);

app.use(express.json());
app.use(cookieParser());
app.use("/api/v1/auth",authRoutes);
app.use("/api/v1/users", userRoutes);

app.get('/',(req,res) => {
    return res.status(200).send("Home Page");
})

// io.on('connection',(socket) => {
//     console.log('Device connected');

//     socket.on('disconnect',()=>{
//         console.log('Device disconnected');
//     })

//     socket.on('chat message',(msg) => {
//         console.log('message: ' + msg);
//     })
// })

const port = process.env.PORT || 3000;
server.listen(port,()=>{
    console.log(`Backend running on port:${port}`);
})

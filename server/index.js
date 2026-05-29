import express from 'express';
import {createServer} from 'node:http';
import {join} from 'node:path';
import {Server} from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.get('/',(req,res) => {
    return res.status(200).sendFile(join(process.cwd(),'index.html'));
})

io.on('connection',(socket) => {
    console.log('Device connected');

    socket.on('disconnect',()=>{
        console.log('Device disconnected');
    })

    socket.on('chat message',(msg) => {
        console.log('message: ' + msg);
    })
})

const port = process.env.PORT || 3000;
server.listen(port,()=>{
    console.log(`Backend running on port:${port}`);
})
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for LAN flexibility
        methods: ["GET", "POST"]
    }
});

// Resolve the path to the 'dist' directory
const distPath = path.resolve(__dirname, 'dist');

console.log(`Static files are being served from: ${distPath}`);

if (!fs.existsSync(distPath)) {
    console.error(`ERROR: The directory '${distPath}' does not exist. Did you run 'npm run build'?`);
}

// Serve static files from the React app build directory
app.use(express.static(distPath));

let users = [];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Add new user
    const user = { id: socket.id, name: `Device ${socket.id.substring(0, 4)}` };
    users.push(user);

    // Broadcast updated user list to ALL clients
    io.emit('user-list', users);

    socket.on('ptt-stream', (data) => {
        // Broadcast chunks to everyone else
        socket.broadcast.emit('ptt-stream', data);
    });

    socket.on('ptt-status', (status) => {
        // Broadcast status updates (isTalking: true/false)
        socket.broadcast.emit('ptt-status', { id: socket.id, ...status });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        users = users.filter(u => u.id !== socket.id);
        io.emit('user-list', users);
    });
});

// Handle React routing, return all requests to React app
app.use((req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    fs.readFile(indexPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading index.html:", err);
            return res.status(500).send("Error loading application.");
        }
        res.send(data);
    });
});

const PORT = 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});

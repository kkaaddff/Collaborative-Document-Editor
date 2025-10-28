import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

const app = express();

app.use(cors());
app.use(express.json());

const roomStats = new Map();

app.get('/health', (_req, res) => {
  const rooms = Array.from(roomStats.entries()).map(([code, data]) => ({
    code,
    userCount: data.clients.size,
    lastActivity: data.lastActivity,
  }));

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    totalRooms: rooms.length,
    totalUsers: rooms.reduce((sum, room) => sum + room.userCount, 0),
    rooms,
  });
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  const { url } = req;
  const roomUrl = new URL(
    url ?? '/',
    `http://${req.headers.host ?? 'localhost'}`
  );

  const roomCode = decodeURIComponent(roomUrl.pathname.slice(1) || 'default');

  let roomData = roomStats.get(roomCode);
  if (!roomData) {
    roomData = { clients: new Set(), lastActivity: Date.now() };
    roomStats.set(roomCode, roomData);
  }

  roomData.clients.add(ws);
  roomData.lastActivity = Date.now();

  ws.on('message', () => {
    const room = roomStats.get(roomCode);
    if (room) {
      room.lastActivity = Date.now();
    }
  });

  ws.on('close', () => {
    const room = roomStats.get(roomCode);
    if (room) {
      room.clients.delete(ws);
      room.lastActivity = Date.now();

      if (room.clients.size === 0) {
        roomStats.delete(roomCode);
      }
    }
  });

  setupWSConnection(ws, req, {
    docName: roomCode,
    gc: true,
  });
});

const port = Number(process.env.PORT) || 3001;

httpServer.listen(port, () => {
  console.log(`[y-websocket] Server listening on port ${port}`);
});

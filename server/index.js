import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// 确保上传文件夹存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 静态文件服务
app.use('/uploads', express.static(uploadsDir));

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'image-' + uniqueSuffix + ext);
  },
});

// 文件过滤器：只允许图片
const fileFilter = (_req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('只支持上传 jpg, jpeg, png, gif, webp 格式的图片'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
});

// 图片上传端点
app.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({ error: '图片上传失败' });
  }
});

// 处理 multer 错误
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小不能超过 5MB' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

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

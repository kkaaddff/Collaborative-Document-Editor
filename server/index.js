import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import RoomManager from './roomManager.js';
import { transform, applyOperation } from './otAlgorithm.js';
import { encryptObject, decryptObject } from './crypto.js';

const app = express();
const httpServer = createServer(app);

// 配置 CORS
app.use(cors());

// Socket.IO 服务器
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 房间管理器
const roomManager = new RoomManager();

// 健康检查端点
app.get('/health', (req, res) => {
  const stats = roomManager.getStats();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ...stats
  });
});

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log(`[Socket] 新连接: ${socket.id}`);

  // 加入房间
  socket.on('join-room', (data) => {
    try {
      const { roomCode, userName, userId } = data;
      
      console.log(`[Join] 用户 ${userName} 尝试加入房间 ${roomCode}`);

      // 加入 Socket.IO 房间
      socket.join(roomCode);

      // 在房间管理器中注册
      const roomData = roomManager.joinRoom(roomCode, userId, userName, socket.id);

      // 向用户发送当前房间状态
      socket.emit('room-state', {
        content: roomData.content,
        users: roomData.users
      });

      // 通知房间内其他用户
      socket.to(roomCode).emit('user-joined', {
        user: {
          id: userId,
          name: userName,
          cursorPosition: 0,
          color: roomManager.getRoom(roomCode)?.users.get(userId)?.color
        }
      });

      // 发送欢迎消息
      socket.emit('message', {
        type: 'success',
        content: `欢迎加入房间 ${roomCode}`
      });

    } catch (error) {
      console.error('[Join] 加入房间失败:', error);
      socket.emit('error', {
        message: '加入房间失败',
        error: error.message
      });
    }
  });

  // 接收操作
  socket.on('operation', (data) => {
    try {
      const { roomCode, operation, encrypted } = data;
      
      // 如果是加密的，先解密（实际使用中，这里需要房间密钥）
      let op = operation;
      if (encrypted) {
        // 注意：这里简化处理，实际应该使用房间特定的密钥
        // op = decryptObject(operation, roomCode);
      }

      const room = roomManager.getRoom(roomCode);
      if (!room) {
        socket.emit('error', { message: '房间不存在' });
        return;
      }

      // 应用操作变换
      const recentOps = roomManager.getOperations(roomCode);
      let transformedOp = op;

      // 对最近的操作进行变换
      for (const existingOp of recentOps) {
        if (existingOp.userId !== op.userId && existingOp.timestamp > op.timestamp) {
          transformedOp = transform(transformedOp, existingOp);
          if (!transformedOp) {
            // 操作被完全覆盖，忽略
            return;
          }
        }
      }

      // 应用操作到房间内容
      const newContent = applyOperation(room.content, transformedOp);
      roomManager.updateContent(roomCode, newContent);
      
      // 记录操作
      roomManager.addOperation(roomCode, transformedOp);

      // 广播操作到房间内其他用户
      socket.to(roomCode).emit('operation', {
        operation: transformedOp
      });

      console.log(`[Operation] 房间 ${roomCode}: ${transformedOp.type} at ${transformedOp.position}`);

    } catch (error) {
      console.error('[Operation] 操作处理失败:', error);
      socket.emit('error', {
        message: '操作处理失败',
        error: error.message
      });
    }
  });

  // 更新光标位置
  socket.on('cursor-update', (data) => {
    try {
      const { roomCode, userId, position } = data;
      
      roomManager.updateCursorPosition(roomCode, userId, position);
      
      // 广播光标位置到房间内其他用户
      socket.to(roomCode).emit('cursor-update', {
        userId,
        position
      });

    } catch (error) {
      console.error('[Cursor] 更新光标失败:', error);
    }
  });

  // 离开房间
  socket.on('leave-room', (data) => {
    try {
      const { roomCode, userId } = data;
      
      const user = roomManager.leaveRoom(roomCode, userId);
      
      if (user) {
        socket.leave(roomCode);
        
        // 通知房间内其他用户
        socket.to(roomCode).emit('user-left', {
          userId: userId,
          userName: user.name
        });
        
        console.log(`[Leave] 用户 ${user.name} 离开房间 ${roomCode}`);
      }

    } catch (error) {
      console.error('[Leave] 离开房间失败:', error);
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`[Socket] 断开连接: ${socket.id}`);
    
    // 查找并清理用户
    const result = roomManager.leaveRoomBySocketId(socket.id);
    
    if (result) {
      const { roomCode, userId } = result;
      socket.to(roomCode).emit('user-left', {
        userId: userId
      });
    }
  });

  // 心跳检测
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 WebSocket 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health\n`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  httpServer.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});


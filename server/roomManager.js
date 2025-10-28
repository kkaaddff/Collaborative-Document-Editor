/**
 * 房间管理器
 * 管理所有文档房间的状态
 */

class RoomManager {
  constructor() {
    // 存储所有房间 { roomCode: { users: Map, content: string, operations: [], lastActivity: timestamp } }
    this.rooms = new Map();
    
    // 每 5 分钟清理一次空房间
    this.startCleanupInterval();
  }

  /**
   * 创建或获取房间
   */
  getOrCreateRoom(roomCode) {
    if (!this.rooms.has(roomCode)) {
      this.rooms.set(roomCode, {
        code: roomCode,
        users: new Map(), // userId -> { id, name, socketId, cursorPosition, color }
        content: '',
        operations: [], // 最近的操作历史
        lastActivity: Date.now()
      });
      console.log(`[Room] 创建新房间: ${roomCode}`);
    }
    
    const room = this.rooms.get(roomCode);
    room.lastActivity = Date.now();
    return room;
  }

  /**
   * 用户加入房间
   */
  joinRoom(roomCode, userId, userName, socketId) {
    const room = this.getOrCreateRoom(roomCode);
    
    // 为用户分配颜色
    const color = this.generateUserColor(userId);
    
    room.users.set(userId, {
      id: userId,
      name: userName,
      socketId: socketId,
      cursorPosition: 0,
      color: color
    });

    console.log(`[Room] 用户 ${userName}(${userId}) 加入房间 ${roomCode}`);
    
    return {
      content: room.content,
      users: Array.from(room.users.values()).map(u => ({
        id: u.id,
        name: u.name,
        cursorPosition: u.cursorPosition,
        color: u.color
      }))
    };
  }

  /**
   * 用户离开房间
   */
  leaveRoom(roomCode, userId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const user = room.users.get(userId);
    room.users.delete(userId);
    
    console.log(`[Room] 用户 ${user?.name}(${userId}) 离开房间 ${roomCode}`);

    // 如果房间为空，标记为待清理
    if (room.users.size === 0) {
      console.log(`[Room] 房间 ${roomCode} 现在为空`);
    }

    return user;
  }

  /**
   * 通过 socketId 离开房间
   */
  leaveRoomBySocketId(socketId) {
    for (const [roomCode, room] of this.rooms.entries()) {
      for (const [userId, user] of room.users.entries()) {
        if (user.socketId === socketId) {
          this.leaveRoom(roomCode, userId);
          return { roomCode, userId };
        }
      }
    }
    return null;
  }

  /**
   * 获取房间信息
   */
  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  /**
   * 获取房间的所有用户
   */
  getRoomUsers(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return [];
    
    return Array.from(room.users.values()).map(u => ({
      id: u.id,
      name: u.name,
      cursorPosition: u.cursorPosition,
      color: u.color
    }));
  }

  /**
   * 更新房间内容
   */
  updateContent(roomCode, content) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.content = content;
      room.lastActivity = Date.now();
    }
  }

  /**
   * 添加操作到历史
   */
  addOperation(roomCode, operation) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.operations.push(operation);
      room.lastActivity = Date.now();
      
      // 只保留最近 100 个操作
      if (room.operations.length > 100) {
        room.operations.shift();
      }
    }
  }

  /**
   * 获取房间的操作历史
   */
  getOperations(roomCode) {
    const room = this.rooms.get(roomCode);
    return room ? room.operations : [];
  }

  /**
   * 更新用户光标位置
   */
  updateCursorPosition(roomCode, userId, position) {
    const room = this.rooms.get(roomCode);
    if (room && room.users.has(userId)) {
      const user = room.users.get(userId);
      user.cursorPosition = position;
      room.lastActivity = Date.now();
    }
  }

  /**
   * 生成用户颜色
   */
  generateUserColor(userId) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788', '#E76F51', '#8338EC'
    ];
    
    // 基于 userId 生成一致的颜色
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * 清理空房间
   */
  cleanupEmptyRooms() {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 分钟

    for (const [roomCode, room] of this.rooms.entries()) {
      // 清理超过30分钟无活动的空房间
      if (room.users.size === 0 && (now - room.lastActivity) > timeout) {
        this.rooms.delete(roomCode);
        console.log(`[Room] 清理空房间: ${roomCode}`);
      }
    }
  }

  /**
   * 启动定时清理
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupEmptyRooms();
    }, 5 * 60 * 1000); // 每 5 分钟
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalUsers: Array.from(this.rooms.values()).reduce((sum, room) => sum + room.users.size, 0),
      rooms: Array.from(this.rooms.entries()).map(([code, room]) => ({
        code,
        userCount: room.users.size,
        lastActivity: room.lastActivity
      }))
    };
  }
}

export default RoomManager;


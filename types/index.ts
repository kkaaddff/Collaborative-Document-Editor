// 操作类型
export interface Operation {
  type: 'insert' | 'delete';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

// 用户信息
export interface User {
  id: string;
  name: string;
  cursorPosition: number;
  color?: string;
}

// 房间状态
export interface RoomState {
  code: string;
  users: User[];
  content: string;
}

// WebSocket 消息类型
export interface WSMessage {
  type: 'join' | 'leave' | 'operation' | 'cursor' | 'sync' | 'error';
  payload: any;
  encrypted?: boolean;
}

// 加入房间参数
export interface JoinRoomParams {
  roomCode: string;
  userName: string;
  userId: string;
}

// 操作消息
export interface OperationMessage {
  operation: Operation;
  roomCode: string;
}

// 光标位置消息
export interface CursorMessage {
  userId: string;
  position: number;
  roomCode: string;
}


'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Operation, User } from '@/types';
import { encryptObject, decryptObject } from './crypto';

interface UseCollaborationProps {
  roomCode: string;
  userName: string;
  userId: string;
  onContentChange: (content: string) => void;
  onUsersChange: (users: User[]) => void;
}

export function useCollaboration({
  roomCode,
  userName,
  userId,
  onContentChange,
  onUsersChange,
}: UseCollaborationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const contentRef = useRef<string>('');
  const pendingOpsRef = useRef<Operation[]>([]);

  // 连接 WebSocket
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    
    console.log('[Collaboration] 连接到 WebSocket:', wsUrl);
    
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // 连接成功
    socket.on('connect', () => {
      console.log('[Collaboration] WebSocket 连接成功');
      setIsConnected(true);
      setError(null);
      
      // 加入房间
      socket.emit('join-room', {
        roomCode,
        userName,
        userId,
      });
    });

    // 连接失败
    socket.on('connect_error', (err) => {
      console.error('[Collaboration] 连接失败:', err);
      setError('连接服务器失败，请检查服务器是否运行');
      setIsConnected(false);
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log('[Collaboration] WebSocket 断开连接');
      setIsConnected(false);
    });

    // 接收房间状态
    socket.on('room-state', (data: { content: string; users: User[] }) => {
      console.log('[Collaboration] 收到房间状态:', data);
      contentRef.current = data.content;
      onContentChange(data.content);
      onUsersChange(data.users);
    });

    // 接收操作
    socket.on('operation', (data: { operation: Operation }) => {
      console.log('[Collaboration] 收到操作:', data.operation);
      applyRemoteOperation(data.operation);
    });

    // 用户加入
    socket.on('user-joined', (data: { user: User }) => {
      console.log('[Collaboration] 用户加入:', data.user);
      onUsersChange((prev) => [...prev, data.user]);
    });

    // 用户离开
    socket.on('user-left', (data: { userId: string }) => {
      console.log('[Collaboration] 用户离开:', data.userId);
      onUsersChange((prev) => prev.filter((u) => u.id !== data.userId));
    });

    // 光标更新
    socket.on('cursor-update', (data: { userId: string; position: number }) => {
      onUsersChange((prev) =>
        prev.map((u) =>
          u.id === data.userId ? { ...u, cursorPosition: data.position } : u
        )
      );
    });

    // 错误消息
    socket.on('error', (data: { message: string }) => {
      console.error('[Collaboration] 服务器错误:', data.message);
      setError(data.message);
    });

    // 消息
    socket.on('message', (data: { type: string; content: string }) => {
      console.log('[Collaboration] 消息:', data);
    });

    // 心跳
    const heartbeat = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      socket.emit('leave-room', { roomCode, userId });
      socket.disconnect();
    };
  }, [roomCode, userName, userId, onContentChange, onUsersChange]);

  // 应用远程操作
  const applyRemoteOperation = useCallback(
    (operation: Operation) => {
      let content = contentRef.current;

      if (operation.type === 'insert') {
        const before = content.substring(0, operation.position);
        const after = content.substring(operation.position);
        content = before + (operation.content || '') + after;
      } else if (operation.type === 'delete') {
        const before = content.substring(0, operation.position);
        const after = content.substring(operation.position + (operation.length || 0));
        content = before + after;
      }

      contentRef.current = content;
      onContentChange(content);
    },
    [onContentChange]
  );

  // 发送操作
  const sendOperation = useCallback(
    (operation: Omit<Operation, 'userId' | 'timestamp'>) => {
      if (!socketRef.current?.connected) {
        console.warn('[Collaboration] 未连接，操作暂存');
        return;
      }

      const fullOperation: Operation = {
        ...operation,
        userId,
        timestamp: Date.now(),
      };

      console.log('[Collaboration] 发送操作:', fullOperation);

      socketRef.current.emit('operation', {
        roomCode,
        operation: fullOperation,
        encrypted: false,
      });

      // 立即应用到本地
      applyRemoteOperation(fullOperation);
    },
    [roomCode, userId, applyRemoteOperation]
  );

  // 发送光标位置
  const sendCursorPosition = useCallback(
    (position: number) => {
      if (!socketRef.current?.connected) return;

      socketRef.current.emit('cursor-update', {
        roomCode,
        userId,
        position,
      });
    },
    [roomCode, userId]
  );

  return {
    isConnected,
    error,
    sendOperation,
    sendCursorPosition,
  };
}


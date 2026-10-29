"use client";

// 顶栏：房间名（就地重命名，状态内聚于此）+ 房间码复制 + 连接状态 + 退出。
import { useState } from "react";

interface RoomHeaderProps {
  roomCode: string;
  roomName: string;
  isConnected: boolean;
  onRename: (name: string) => void;
  onLeave: () => void;
}

export function RoomHeader({
  roomCode,
  roomName,
  isConnected,
  onRename,
  onLeave,
}: RoomHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startRename = () => {
    setDraft(roomName);
    setEditing(true);
  };
  const commitRename = () => {
    const next = draft.trim();
    if (next) onRename(next);
    setEditing(false);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    alert("房间代码已复制到剪贴板");
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          协同编辑器
        </h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            房间:
          </span>
          {editing ? (
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(false);
                }
              }}
              onBlur={commitRename}
              maxLength={40}
              placeholder="输入房间名"
              className="px-2 py-1 rounded text-sm border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 max-w-[12rem]"
            />
          ) : (
            <button
              onClick={startRename}
              title="点击重命名房间"
              className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline truncate max-w-[12rem]"
            >
              {roomName || "未命名文档"}
            </button>
          )}
          <code className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-sm font-mono text-gray-900 dark:text-white">
            {roomCode}
          </code>
          <button
            onClick={copyRoomCode}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
          >
            复制
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isConnected ? "已连接" : "未连接"}
          </span>
        </div>

        <button
          onClick={onLeave}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          退出房间
        </button>
      </div>
    </div>
  );
}

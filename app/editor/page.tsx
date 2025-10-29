"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCollaboration } from "@/lib/useCollaboration";
import { User } from "@/types";

function EditorPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomCode = useMemo(
    () => searchParams.get("code")?.toUpperCase() ?? "",
    [searchParams]
  );
  const userName = searchParams.get("name") || "匿名用户";
  const [userId] = useState(
    () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  useEffect(() => {
    if (!roomCode) {
      router.replace("/");
    }
  }, [roomCode, router]);

  const [content, setContent] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isConnected, error, applyLocalChange, sendCursorPosition } =
    useCollaboration({
      roomCode,
      userName,
      userId,
      onContentChange: setContent,
      onUsersChange: setUsers,
    });

  const handleContentChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      applyLocalChange(newContent);
    },
    [applyLocalChange]
  );

  const handleCursorChange = useCallback(() => {
    if (textareaRef.current) {
      const position = textareaRef.current.selectionStart;
      sendCursorPosition(position);
    }
  }, [sendCursorPosition]);

  const handleLeaveRoom = () => {
    router.push("/");
  };

  const handleCopyRoomCode = () => {
    if (!roomCode) {
      return;
    }
    navigator.clipboard.writeText(roomCode);
    alert("房间代码已复制到剪贴板");
  };

  if (!roomCode) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            协同编辑器
          </h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              房间:
            </span>
            <code className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-sm font-mono text-gray-900 dark:text-white">
              {roomCode}
            </code>
            <button
              onClick={handleCopyRoomCode}
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
            onClick={handleLeaveRoom}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            退出房间
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 px-6 py-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                文档内容
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {content.length} 字符
              </span>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onSelect={handleCursorChange}
              onClick={handleCursorChange}
              onKeyUp={handleCursorChange}
              placeholder="开始输入内容..."
              className="flex-1 w-full p-4 resize-none focus:outline-none font-mono text-base text-gray-900 dark:text-gray-100 dark:bg-gray-800 bg-white"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            在线用户 ({users.length})
          </h2>

          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: user.color || "#999" }}
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    光标位置: {user.cursorPosition ?? 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">加载中...</div>}>
      <EditorPageContent />
    </Suspense>
  );
}

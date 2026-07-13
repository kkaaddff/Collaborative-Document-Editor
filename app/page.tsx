"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getRecentRooms,
  removeRecentRoom,
  upsertRecentRoom,
  useLocalStorageState,
} from "@/lib/storage";
import type { RecentRoom } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

type OnlineRoom = { code: string; userCount: number };

// 相对时间格式化（中文，简版）
function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}

export default function Home() {
  const router = useRouter();

  // 用户名：localStorage 持久化、双面板共用、预填
  const [userName, setUserName] = useLocalStorageState<string>(
    "coordination.username",
    ""
  );

  const [roomCode, setRoomCode] = useState("");
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [onlineRooms, setOnlineRooms] = useState<OnlineRoom[]>([]);

  // 生成随机房间代码
  const generateRoomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const resolveName = () => {
    const n = userName.trim();
    return n || `用户${Math.floor(Math.random() * 1000)}`;
  };

  // 统一进入房间：记录最近房间 + 跳转
  const enterRoom = useCallback(
    (code: string) => {
      const existing =
        getRecentRooms().find((r) => r.code === code)?.name ?? "";
      upsertRecentRoom({ code, name: existing });
      setRecentRooms(getRecentRooms());
      router.push(
        `/editor?code=${code}&name=${encodeURIComponent(resolveName())}`
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userName]
  );

  // 创建新文档
  const handleCreateNew = () => {
    enterRoom(generateRoomCode());
  };

  // 加入已有文档（表单提交）
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      alert("请输入房间代码");
      return;
    }
    if (!userName.trim()) {
      alert("请输入用户名");
      return;
    }
    enterRoom(code);
  };

  // 拉取服务器在线房间
  const fetchOnline = useCallback(async () => {
    try {
      const res = await fetch(`${WS_URL}/health`);
      if (!res.ok) return;
      const data = await res.json();
      const raw = (
        Array.isArray(data?.rooms) ? data.rooms : []
      ) as Array<Record<string, unknown>>;
      const rooms: OnlineRoom[] = raw
        .map((r) => ({
          code: String(r?.code ?? ""),
          userCount: Number(r?.userCount ?? 0),
        }))
        .filter((r) => r.code);
      setOnlineRooms(rooms);
    } catch {
      /* 离线/服务不可达：静默降级 */
    }
  }, []);

  useEffect(() => {
    setRecentRooms(getRecentRooms());
    fetchOnline();
    const id = window.setInterval(fetchOnline, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchOnline();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchOnline]);

  const handleRemoveRecent = (code: string) => {
    removeRecentRoom(code);
    setRecentRooms(getRecentRooms());
  };

  // code → 本地名（在线房间列表交叉引用显示）
  const nameByCode = new Map(recentRooms.map((r) => [r.code, r.name]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            协同文档编辑器
          </h1>
          <p className="text-lg text-gray-600">
            实时协同编辑，支持多用户同时编写文档
          </p>
        </div>

        {/* 主要内容卡片 */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-8">
          {/* 创建新文档 */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              创建新文档
            </h2>
            <p className="text-gray-600 mb-6">
              快速创建一个新的协同文档，系统会自动生成房间代码
            </p>

            <div className="mb-4">
              <label
                htmlFor="createUserName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                用户名
              </label>
              <input
                type="text"
                id="createUserName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="输入您的用户名（下次自动带出）"
                maxLength={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              onClick={handleCreateNew}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建新文档
            </button>
          </div>

          {/* 加入已有文档 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              加入已有文档
            </h2>
            <p className="text-gray-600 mb-6">
              输入房间代码加入现有文档，或从下方列表直接进入
            </p>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label
                  htmlFor="roomCode"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  房间代码
                </label>
                <input
                  type="text"
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="输入 8 位房间代码"
                  maxLength={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="userName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  用户名
                </label>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="输入您的用户名（下次自动带出）"
                  maxLength={20}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gray-900 text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                加入文档
              </button>
            </form>
          </div>
        </div>

        {/* 房间列表：最近房间（本地） + 在线房间（服务器） */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 我的最近房间 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🕘</span> 我的最近房间
            </h3>
            {recentRooms.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                还没有访问过的房间
              </p>
            ) : (
              <ul className="space-y-2">
                {recentRooms.map((room) => (
                  <li key={room.code}>
                    <div className="group flex items-center gap-2 p-3 rounded-lg hover:bg-blue-50 transition-colors">
                      <button
                        onClick={() => enterRoom(room.code)}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        <span className="font-medium text-gray-900 truncate">
                          {room.name || "未命名文档"}
                        </span>
                        <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono shrink-0">
                          {room.code}
                        </code>
                        <span className="text-xs text-gray-400 shrink-0">
                          {formatRelative(room.lastUsed)}
                        </span>
                      </button>
                      <button
                        onClick={() => handleRemoveRecent(room.code)}
                        title="移出列表"
                        className="text-gray-300 hover:text-red-500 px-1 text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 服务器在线房间 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🟢</span> 服务器在线房间
            </h3>
            {onlineRooms.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                当前没有在线房间
              </p>
            ) : (
              <ul className="space-y-2">
                {onlineRooms.map((room) => (
                  <li key={room.code}>
                    <button
                      onClick={() => enterRoom(room.code)}
                      className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left"
                    >
                      <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono shrink-0">
                        {room.code}
                      </code>
                      <span className="font-medium text-gray-900 truncate">
                        {nameByCode.get(room.code) || "在线房间"}
                      </span>
                      <span className="ml-auto text-xs text-green-600 shrink-0">
                        {room.userCount} 人在线
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 功能特性 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold text-gray-900 mb-2">实时同步</h3>
            <p className="text-sm text-gray-600">
              基于 Yjs CRDT，多人并发编辑自动收敛、无冲突
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-2">富文本协同</h3>
            <p className="text-sm text-gray-600">
              表格、图片、代码块、列表，多人同时编辑实时可见
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-3">🏠</div>
            <h3 className="font-semibold text-gray-900 mb-2">房间管理</h3>
            <p className="text-sm text-gray-600">
              最近房间一键回归，房间可命名、用户名自动记住
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

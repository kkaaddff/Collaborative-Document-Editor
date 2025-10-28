'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [userName, setUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // 生成随机房间代码
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // 创建新文档
  const handleCreateNew = () => {
    const newCode = generateRoomCode();
    const defaultName = `用户${Math.floor(Math.random() * 1000)}`;
    router.push(`/editor/${newCode}?name=${encodeURIComponent(defaultName)}`);
  };

  // 加入已有文档
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCode.trim()) {
      alert('请输入房间代码');
      return;
    }
    
    if (!userName.trim()) {
      alert('请输入用户名');
      return;
    }

    router.push(`/editor/${roomCode.trim().toUpperCase()}?name=${encodeURIComponent(userName.trim())}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            协同文档编辑器
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            实时协同编辑，支持多用户同时编写文档
          </p>
        </div>

        {/* 主要内容卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-8">
          {/* 创建新文档 */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              创建新文档
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              快速创建一个新的协同文档，系统会自动生成房间代码
            </p>
            <button
              onClick={handleCreateNew}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? '创建中...' : '创建新文档'}
            </button>
          </div>

          {/* 加入已有文档 */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              加入已有文档
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              输入房间代码和您的用户名以加入现有文档
            </p>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  房间代码
                </label>
                <input
                  type="text"
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="输入 8 位房间代码"
                  maxLength={8}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>
              
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="输入您的用户名"
                  maxLength={20}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gray-900 dark:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                加入文档
              </button>
            </form>
          </div>
        </div>

        {/* 功能特性 */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">加密传输</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              所有数据都经过 AES 加密，保护您的隐私
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">实时协同</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              多人同时编辑，实时同步更改
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-3">🔄</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">冲突解决</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              智能的操作变换算法处理编辑冲突
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

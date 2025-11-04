#!/bin/bash

# 协同编辑器初始化脚本

echo "🎉 欢迎使用协同文档编辑器"
echo "================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js (https://nodejs.org/)"
    exit 1
fi

echo "✓ Node.js 版本: $(node -v)"
echo "✓ npm 版本: $(npm -v)"
echo ""

# 安装前端依赖
echo "📦 正在安装前端依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 前端依赖安装失败"
    exit 1
fi

echo "✓ 前端依赖安装完成"
echo ""

# 安装服务器依赖
echo "📦 正在安装服务器依赖..."
cd server
npm install

if [ $? -ne 0 ]; then
    echo "❌ 服务器依赖安装失败"
    exit 1
fi

cd ..
echo "✓ 服务器依赖安装完成"
echo ""

# 删除并重建环境变量文件
echo "📝 重建环境变量文件..."
echo "BASE_URL=http://localhost:3001" > .env.local
echo "✅ 环境变量文件已重建"

# 创建日志目录
if [ ! -d logs ]; then
    mkdir -p logs
    echo "✓ 日志目录已创建"
else
    echo "✓ 日志目录已存在"
fi
echo ""

echo "================================"
echo "✅ 初始化完成！"
echo ""
echo "📖 快速开始:"
echo ""
echo "  开发模式（同时启动前端和后端）:"
echo "    npm run dev:all"
echo ""
echo "  或分别启动:"
echo "    npm run dev      # 启动 Next.js"
echo "    npm run server   # 启动 WebSocket 服务器"
echo ""
echo "  健康检查:"
echo "    npm run health"
echo ""
echo "  生产部署:"
echo "    npm run build    # 构建前端"
echo "    npm run pm2:start # 使用 PM2 启动"
echo ""
echo "📚 文档:"
echo "  - README.md          完整文档"
echo "  - QUICKSTART.md      快速启动指南"
echo "  - ENVIRONMENT.md     环境配置说明"
echo ""
echo "🌐 访问地址:"
echo "  - 前端: http://localhost:3000"
echo "  - WebSocket: http://localhost:3001"
echo "  - 健康检查: http://localhost:3001/health"
echo ""
echo "祝使用愉快！🎉"


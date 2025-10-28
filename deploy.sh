#!/bin/bash

# 协同编辑器部署脚本

echo "🚀 开始部署协同编辑器..."

# 安装前端依赖
echo "📦 安装前端依赖..."
npm install

# 安装服务器依赖
echo "📦 安装服务器依赖..."
cd server
npm install
cd ..

# 创建环境变量文件（如果不存在）
if [ ! -f .env.local ]; then
  echo "📝 创建环境变量文件..."
  echo "NEXT_PUBLIC_WS_URL=http://localhost:3001" > .env.local
  echo "⚠️  请根据实际情况修改 .env.local 中的配置"
fi

# 构建前端
echo "🔨 构建前端应用..."
npm run build

echo "✅ 部署准备完成！"
echo ""
echo "启动命令："
echo "  开发环境: npm run dev:all"
echo "  生产环境: pm2 start server/index.js --name ws-server && pm2 start npm --name next-app -- start"
echo ""
echo "访问地址: http://localhost:3000"
echo "WebSocket 服务器: http://localhost:3001"


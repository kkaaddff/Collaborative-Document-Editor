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

# 构建前端
echo "🔨 构建前端应用..."
npm run build

echo "✅ 部署准备完成！"
echo ""
echo "启动命令："
echo "  开发环境: npm run dev:all"
echo "  生产环境: pm2 start server/index.js --name ws-server && pm2 start npm --name next-app -- start"
echo ""
echo "访问地址: http://www.hengheng.online:8100"
echo "WebSocket 服务器: http://www.hengheng.online:8101"


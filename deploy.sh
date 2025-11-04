#!/bin/bash

# 协同编辑器部署脚本

echo "🚀 开始部署协同编辑器..."

# 安装协作服务依赖
echo "📦 安装协作服务依赖..."
cd server
npm install --omit=dev
cd ..

# 删除并重建环境变量文件
echo "📝 重建环境变量文件..."
echo "BASE_URL=http://www.hengheng.online:8101" > .env.local
echo "✅ 环境变量文件已重建"

echo "🌐 前端静态资源位于 ./frontend"
echo "   可直接部署到任意静态站点服务（如 Nginx、OSS、CDN）。"

echo "✅ 部署准备完成！"
echo ""
echo "启动命令："
echo "  协作服务: pm2 start server/index.js --name ws-server"
echo ""
echo "建议将 ./frontend 内容部署至 http://www.hengheng.online:8100"
echo "WebSocket 服务器: http://www.hengheng.online:8101"

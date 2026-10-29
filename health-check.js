#!/usr/bin/env node

/**
 * 健康检查脚本
 * 检查 WebSocket 服务器是否正常运行
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const http = require('http');

// PORT 若设置则是纯端口号（如 ecosystem 的 8101），需拼成完整 base URL
const port = process.env.PORT || '3001';
const url = new URL('/health', `http://localhost:${port}`);

console.log(`🔍 检查服务器健康状态: ${url.href}\n`);

http.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const health = JSON.parse(data);
      
      console.log('✅ 服务器运行正常\n');
      console.log('📊 服务器状态:');
      console.log(`   状态: ${health.status}`);
      console.log(`   时间: ${health.timestamp}`);
      console.log(`   房间数: ${health.totalRooms}`);
      console.log(`   用户数: ${health.totalUsers}`);
      
      if (health.rooms && health.rooms.length > 0) {
        console.log('\n📁 活跃房间:');
        health.rooms.forEach((room) => {
          console.log(`   - ${room.code}: ${room.userCount} 用户`);
        });
      } else {
        console.log('\n📁 暂无活跃房间');
      }
      
      process.exit(0);
    } catch (error) {
      console.error('❌ 解析响应失败:', error.message);
      process.exit(1);
    }
  });
}).on('error', (error) => {
  console.error('❌ 服务器连接失败:', error.message);
  console.error('\n请确保:');
  console.error('  1. WebSocket 服务器已启动 (npm run server)');
  console.error(`  2. 端口 ${port} 没有被占用`);
  console.error('  3. .env.local 配置正确');
  process.exit(1);
});

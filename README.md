# 协同文档编辑器

一个基于 Next.js 和 WebSocket 的实时协同文档编辑器，支持多用户同时编辑文档，具有 AES 加密、操作变换算法等特性。

## ✨ 功能特性

- ✅ **实时协同编辑**: 多用户可以同时编辑同一文档，实时同步更改
- ✅ **加密传输**: 使用 AES 对称加密保护传输数据
- ✅ **冲突解决**: 实现操作变换（OT）算法处理并发编辑冲突
- ✅ **房间系统**: 通过代码创建或加入文档房间
- ✅ **用户状态**: 显示在线用户和实时光标位置
- ✅ **简洁界面**: 使用 textarea 实现简化的编辑器，专注协同功能

## 🛠 技术栈

- **前端**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **实时通信**: Socket.IO (WebSocket)
- **加密**: crypto-js (AES 对称加密)
- **冲突解决**: 自定义操作变换（OT）算法

## 📦 项目结构

```
coordination-v2/
├── app/                      # Next.js 应用目录
│   ├── page.tsx             # 首页（创建/加入房间）
│   ├── layout.tsx           # 根布局
│   ├── globals.css          # 全局样式
│   └── editor/[code]/       # 编辑器页面
│       └── page.tsx
├── server/                   # WebSocket 服务器
│   ├── index.js             # 主服务器文件
│   ├── roomManager.js       # 房间管理
│   ├── otAlgorithm.js       # 操作变换算法
│   ├── crypto.js            # 服务端加密工具
│   └── package.json         # 服务器依赖
├── lib/                      # 工具库
│   ├── crypto.ts            # 客户端加密工具
│   └── useCollaboration.ts  # 协同编辑 Hook
├── types/                    # TypeScript 类型定义
│   └── index.ts
└── package.json             # 前端依赖
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装服务器依赖
cd server
npm install
cd ..
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### 3. 启动服务

#### 方式一：同时启动（推荐）

```bash
npm run dev:all
```

#### 方式二：分别启动

**终端 1 - 启动 WebSocket 服务器：**
```bash
npm run server
```

**终端 2 - 启动 Next.js 开发服务器：**
```bash
npm run dev
```

### 4. 访问应用

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 📖 使用方法

### 创建新文档

1. 在首页点击 "创建新文档" 按钮
2. 系统会自动生成 8 位房间代码
3. 自动跳转到编辑器页面
4. 分享房间代码给其他用户

### 加入已有文档

1. 输入 8 位房间代码
2. 输入您的用户名
3. 点击 "加入文档" 按钮
4. 进入协同编辑环境

### 协同编辑

- 在编辑器中输入内容，会实时同步给房间内所有用户
- 右侧显示在线用户列表和光标位置
- 不同用户用不同颜色标识
- 支持多人同时编辑，自动处理冲突

## 🔐 安全特性

### AES 加密

所有传输数据都经过 AES 对称加密：

```typescript
// 加密
const encrypted = encryptText(content, documentCode);

// 解密
const decrypted = decryptText(encrypted, documentCode);
```

**注意**: 文档代码作为加密密钥，建议使用复杂的代码以提高安全性。

### 操作变换（OT）算法

实现了简单但有效的 OT 算法来处理并发编辑冲突：

- **插入操作**: 自动调整后续操作的位置
- **删除操作**: 处理重叠删除，避免数据不一致
- **混合操作**: 正确处理插入和删除同时发生的情况
- **优先级**: 使用时间戳和用户 ID 确定操作优先级

## 🏗 架构说明

### 客户端架构

1. **首页 (`app/page.tsx`)**: 提供创建/加入房间的入口
2. **编辑器页面 (`app/editor/[code]/page.tsx`)**: 主编辑界面
3. **协同 Hook (`lib/useCollaboration.ts`)**: 封装 Socket.IO 连接和消息处理
4. **加密工具 (`lib/crypto.ts`)**: AES 加密/解密功能

### 服务器架构

1. **主服务器 (`server/index.js`)**: Express + Socket.IO 服务器
2. **房间管理器 (`server/roomManager.js`)**: 管理房间和用户状态（内存存储）
3. **OT 算法 (`server/otAlgorithm.js`)**: 操作变换和应用
4. **加密工具 (`server/crypto.js`)**: 服务端加密支持

### 消息流程

```
客户端                    服务器                    其他客户端
  |                        |                          |
  |-- join-room --------->|                          |
  |<------- room-state ---|                          |
  |                        |                          |
  |-- operation --------->|                          |
  |                        |-- transform ----------->|
  |                        |<-- operation -----------|
  |<------ operation ------|                          |
  |                        |                          |
  |-- cursor-update ----->|                          |
  |                        |-- cursor-update -------->|
```

## 🚢 部署指南

### 自有服务器部署

1. **安装 Node.js**（推荐 v18 或更高版本）

2. **克隆并构建项目**：
```bash
git clone <repository-url>
cd coordination-v2

# 安装依赖
npm install
cd server && npm install && cd ..

# 构建前端
npm run build
```

3. **配置环境变量**：
```bash
# .env.local
NEXT_PUBLIC_WS_URL=http://your-server-ip:3001

# server/.env (可选)
PORT=3001
CLIENT_URL=http://your-server-ip:3000
```

4. **使用 PM2 部署**（推荐）：
```bash
# 安装 PM2
npm install -g pm2

# 启动 WebSocket 服务器
pm2 start server/index.js --name ws-server

# 启动 Next.js 应用
pm2 start npm --name next-app -- start

# 保存配置
pm2 save
pm2 startup
```

5. **配置 Nginx 反向代理**（可选）：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Next.js 应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 服务器
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🔧 开发说明

### 扩展功能建议

1. **更强的 OT 算法**: 集成专业的 OT 库如 ShareJS 或 Y.js
2. **持久化存储**: 添加 Redis 或 MongoDB 保存文档历史
3. **用户认证**: 集成登录系统和权限管理
4. **版本控制**: 实现文档版本管理和回滚功能
5. **富文本编辑**: 集成 MDX 编辑器或其他富文本编辑器
6. **文件上传**: 支持图片和附件上传
7. **评论系统**: 添加文档评论和批注功能

### 调试

开发时可以在浏览器控制台查看：
- Socket.IO 连接状态
- 操作日志
- 用户加入/离开事件

服务器端日志会显示：
- 房间创建/销毁
- 用户连接/断开
- 操作处理详情

### 性能优化

- 操作历史限制为最近 100 条
- 空房间 30 分钟后自动清理
- 心跳检测保持连接活跃
- 使用 WebSocket 而不是轮询

## 📝 API 接口

### WebSocket 事件

**客户端 -> 服务器**:
- `join-room`: 加入房间
- `leave-room`: 离开房间
- `operation`: 发送编辑操作
- `cursor-update`: 更新光标位置
- `ping`: 心跳检测

**服务器 -> 客户端**:
- `room-state`: 房间初始状态
- `operation`: 广播编辑操作
- `user-joined`: 用户加入通知
- `user-left`: 用户离开通知
- `cursor-update`: 光标位置更新
- `error`: 错误消息
- `pong`: 心跳响应

### HTTP 接口

- `GET /health`: 健康检查和统计信息

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请查看：
- [Socket.IO 文档](https://socket.io/docs/)
- [Next.js 文档](https://nextjs.org/docs)
- 项目 Issue 页面

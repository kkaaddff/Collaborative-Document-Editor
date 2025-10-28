# 项目总览

## 📁 项目结构

```
coordination-v2/
├── 📱 前端应用
│   ├── app/
│   │   ├── page.tsx                    # 首页（创建/加入房间）
│   │   ├── layout.tsx                  # 根布局
│   │   ├── globals.css                 # 全局样式
│   │   └── editor/[code]/
│   │       └── page.tsx                # 编辑器页面
│   ├── lib/
│   │   ├── crypto.ts                   # 客户端加密工具
│   │   └── useCollaboration.ts         # 协同编辑 Hook
│   ├── types/
│   │   └── index.ts                    # TypeScript 类型定义
│   └── public/                         # 静态资源
│
├── 🖥️ WebSocket 服务器
│   └── server/
│       ├── index.js                    # 主服务器文件
│       ├── roomManager.js              # 房间管理器
│       ├── otAlgorithm.js              # 操作变换算法
│       ├── crypto.js                   # 服务端加密工具
│       └── package.json                # 服务器依赖
│
├── 📚 文档
│   ├── README.md                       # 完整项目文档
│   ├── QUICKSTART.md                   # 快速启动指南
│   ├── ENVIRONMENT.md                  # 环境配置说明
│   ├── CONTRIBUTING.md                 # 贡献指南
│   ├── CHANGELOG.md                    # 变更日志
│   └── PROJECT_OVERVIEW.md             # 本文件
│
├── 🛠️ 配置和脚本
│   ├── package.json                    # 前端依赖和脚本
│   ├── tsconfig.json                   # TypeScript 配置
│   ├── next.config.ts                  # Next.js 配置
│   ├── ecosystem.config.js             # PM2 部署配置
│   ├── setup.sh                        # 初始化脚本
│   ├── deploy.sh                       # 部署脚本
│   └── health-check.js                 # 健康检查脚本
│
└── 其他
    ├── LICENSE                         # MIT 许可证
    ├── .gitignore                      # Git 忽略规则
    ├── logs/                           # 日志目录
    └── prd.md                          # 产品需求文档
```

## 🎯 核心功能

### 1. 实时协同编辑
- ✅ 多用户可同时编辑同一文档
- ✅ 实时同步所有用户的编辑操作
- ✅ 使用 WebSocket 确保低延迟通信

### 2. 操作变换算法（OT）
- ✅ 处理并发编辑冲突
- ✅ 支持插入和删除操作
- ✅ 基于时间戳和用户 ID 的优先级

### 3. 加密传输
- ✅ AES 对称加密
- ✅ 使用房间代码作为密钥
- ✅ 保护数据传输安全

### 4. 房间管理
- ✅ 创建/加入房间
- ✅ 显示在线用户列表
- ✅ 实时光标位置同步
- ✅ 自动清理空房间

### 5. 用户体验
- ✅ 简洁直观的界面
- ✅ 响应式设计
- ✅ 深色模式支持
- ✅ 连接状态指示

## 🔑 关键文件说明

### 前端核心

**`app/page.tsx`** - 首页
- 创建新文档（生成随机代码）
- 加入已有文档（输入代码和用户名）
- 美观的 UI 设计

**`app/editor/[code]/page.tsx`** - 编辑器页面
- 基于 textarea 的编辑器
- 在线用户列表显示
- 光标位置同步
- 连接状态监控

**`lib/useCollaboration.ts`** - 协同编辑 Hook
- Socket.IO 连接管理
- 消息收发处理
- 操作应用和广播
- 错误处理

**`lib/crypto.ts`** - 加密工具
- AES 加密/解密函数
- 对象序列化加密

**`types/index.ts`** - 类型定义
- Operation（操作类型）
- User（用户信息）
- RoomState（房间状态）
- 其他接口定义

### 后端核心

**`server/index.js`** - 主服务器
- Express + Socket.IO 服务器
- WebSocket 事件处理
- 健康检查端点
- 优雅关闭处理

**`server/roomManager.js`** - 房间管理器
- 房间创建和销毁
- 用户加入/离开
- 房间状态维护
- 定时清理空房间

**`server/otAlgorithm.js`** - OT 算法
- transform() - 操作变换
- applyOperation() - 应用操作
- 处理插入/删除冲突

**`server/crypto.js`** - 服务端加密
- 与客户端对称的加密实现
- 支持加密对象

## 🚀 快速开始

### 最简启动（3 步）

```bash
# 1. 初始化项目
./setup.sh

# 2. 启动服务
npm run dev:all

# 3. 访问应用
# 打开 http://localhost:3000
```

### 详细步骤

```bash
# 安装依赖
npm install
cd server && npm install && cd ..

# 配置环境变量
echo "NEXT_PUBLIC_WS_URL=http://localhost:3001" > .env.local

# 启动开发服务器
npm run dev:all
```

## 📊 可用命令

### 开发命令

```bash
npm run dev          # 启动 Next.js 开发服务器
npm run server       # 启动 WebSocket 服务器
npm run dev:all      # 同时启动前端和后端（推荐）
npm run health       # 健康检查
npm run lint         # 代码检查
```

### 生产命令

```bash
npm run build        # 构建前端应用
npm start            # 启动 Next.js 生产服务器
npm run pm2:start    # 使用 PM2 启动所有服务
npm run pm2:stop     # 停止 PM2 服务
npm run pm2:restart  # 重启 PM2 服务
npm run pm2:logs     # 查看 PM2 日志
```

## 🔌 API 接口

### WebSocket 事件

**客户端 → 服务器**
- `join-room` - 加入房间
- `leave-room` - 离开房间
- `operation` - 发送编辑操作
- `cursor-update` - 更新光标位置
- `ping` - 心跳检测

**服务器 → 客户端**
- `room-state` - 房间初始状态
- `operation` - 广播编辑操作
- `user-joined` - 用户加入通知
- `user-left` - 用户离开通知
- `cursor-update` - 光标位置更新
- `error` - 错误消息
- `pong` - 心跳响应

### HTTP 端点

- `GET /health` - 健康检查和统计信息

## 🏗️ 架构设计

### 数据流

```
用户输入
    ↓
本地 textarea
    ↓
计算操作（Operation）
    ↓
发送到 WebSocket 服务器（加密）
    ↓
服务器应用 OT 算法
    ↓
广播给房间内其他用户
    ↓
其他用户接收并应用操作
    ↓
更新 textarea 内容
```

### 冲突解决

```
用户 A: 在位置 5 插入 "hello"
用户 B: 同时在位置 3 插入 "world"

OT 算法处理:
1. 检测到并发操作
2. 变换操作位置
3. 确保最终一致性

结果: 两个用户看到相同的内容
```

## 🔒 安全特性

1. **AES 加密**: 所有传输数据加密
2. **房间隔离**: 每个房间独立，互不干扰
3. **输入验证**: 服务器端验证所有输入
4. **自动清理**: 防止内存泄漏

## 📈 性能优化

- ✅ 操作历史限制（最近 100 条）
- ✅ 空房间自动清理（30 分钟）
- ✅ WebSocket 连接复用
- ✅ 心跳保持连接活跃

## 🎨 UI/UX 特点

- 🎨 现代化渐变背景
- 🌙 深色模式支持
- 📱 响应式设计
- ⚡ 流畅的动画过渡
- 🎯 直观的操作流程

## 🧪 测试

### 手动测试流程

1. **单用户测试**
   - 创建房间
   - 编辑内容
   - 检查保存状态

2. **多用户测试**
   - 在两个浏览器窗口打开
   - 使用相同房间代码
   - 同时编辑，检查同步

3. **连接测试**
   - 断开网络，检查重连
   - 关闭一个用户，检查通知
   - 健康检查端点

## 📦 依赖说明

### 前端主要依赖

- `next`: 16.0.0 - React 框架
- `react`: 19.2.0 - UI 库
- `socket.io-client`: ^4.7.2 - WebSocket 客户端
- `crypto-js`: ^4.2.0 - 加密库

### 后端主要依赖

- `express`: ^4.18.2 - Web 框架
- `socket.io`: ^4.7.2 - WebSocket 服务器
- `crypto-js`: ^4.2.0 - 加密库
- `cors`: ^2.8.5 - CORS 支持

## 🚢 部署选项

### 开发环境
- 本地运行
- 使用 npm 脚本

### 生产环境
- PM2 进程管理
- Nginx 反向代理
- Docker 容器化（待实现）

## 🔮 未来规划

### 短期（v0.2.0）
- [ ] Redis 持久化
- [ ] 用户认证
- [ ] 文档历史

### 中期（v0.3.0）
- [ ] MDX 编辑器
- [ ] 文件上传
- [ ] 权限管理

### 长期（v1.0.0）
- [ ] 移动端应用
- [ ] 离线支持
- [ ] AI 辅助写作

## 📞 获取帮助

- 📖 [README.md](./README.md) - 完整文档
- 🚀 [QUICKSTART.md](./QUICKSTART.md) - 快速上手
- 🔧 [ENVIRONMENT.md](./ENVIRONMENT.md) - 环境配置
- 🤝 [CONTRIBUTING.md](./CONTRIBUTING.md) - 贡献指南

## 📝 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

**当前版本**: v0.1.0  
**最后更新**: 2025-10-28  
**状态**: ✅ 稳定


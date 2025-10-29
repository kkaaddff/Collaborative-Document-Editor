# 快速启动指南

## 第一次使用

### 1. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装服务器依赖
cd server
npm install
cd ..
```

### 3. 启动服务

#### 开发环境

**方式一：一键启动（推荐）**

```bash
npm run dev:all
```

**方式二：分别启动**

终端 1：
```bash
npm run server
```

终端 2：
```bash
npm run dev
```

#### 生产环境

```bash
# 构建前端
npm run build

# 启动 WebSocket 服务器
npm run server &

# 启动 Next.js 应用
npm start
```

#### 使用 PM2（推荐生产环境）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server/index.js --name ws-server
pm2 start npm --name next-app -- start

# 查看状态
pm2 list

# 查看日志
pm2 logs

# 保存配置
pm2 save
pm2 startup
```

### 4. 访问应用

- **前端应用**: http://localhost:3000
- **WebSocket 服务器**: http://localhost:3001
- **健康检查**: http://localhost:3001/health

## 使用流程

### 创建文档

1. 打开 http://localhost:3000
2. 点击"创建新文档"按钮
3. 系统自动生成 8 位房间代码
4. 复制房间代码分享给其他用户

### 加入文档

1. 打开 http://localhost:3000
2. 输入房间代码（8 位）
3. 输入您的用户名
4. 点击"加入文档"

### 协同编辑

- 在编辑器中输入内容
- 内容会实时同步给所有在线用户
- 右侧显示在线用户列表
- 可以看到其他用户的光标位置

## 故障排查

### 前端无法连接 WebSocket

**问题**: 页面显示"未连接"

**解决方案**:
1. 确认 WebSocket 服务器已启动
2. 检查 `.env.local` 中的 `PORT` 配置
3. 查看浏览器控制台的错误信息
4. 确认端口 3001 没有被占用

### WebSocket 服务器无法启动

**问题**: `npm run server` 报错

**解决方案**:
1. 确认已安装服务器依赖: `cd server && npm install`
2. 检查端口 3001 是否被占用: `lsof -i :3001`
3. 查看服务器日志获取详细错误信息

### 页面 404 错误

**问题**: 访问编辑器页面显示 404

**解决方案**:
1. 确认 Next.js 开发服务器已启动
2. 清除 `.next` 缓存: `rm -rf .next && npm run dev`

### 编辑不同步

**问题**: 一个用户的编辑在其他用户那里看不到

**解决方案**:
1. 检查所有用户的连接状态（右上角指示灯）
2. 刷新页面重新连接
3. 查看浏览器控制台和服务器日志

## 端口配置

默认端口：
- Next.js: 3000
- WebSocket: 3001

修改端口：

**Next.js**:
```bash
PORT=3002 npm run dev
```

**WebSocket**:
```bash
# server/index.js 中修改或设置环境变量
PORT=3003 npm run server
```

记得同步更新 `.env.local` 中的 `PORT`

## 常用命令

```bash
# 开发
npm run dev:all          # 同时启动前端和后端

# 分别启动
npm run dev             # 启动 Next.js
npm run server          # 启动 WebSocket 服务器

# 生产
npm run build           # 构建前端
npm start               # 启动 Next.js 生产服务器

# 其他
npm run lint            # 代码检查
```

## 开发提示

1. **热重载**: Next.js 支持热重载，修改前端代码会自动刷新
2. **服务器重启**: 修改服务器代码需要手动重启 `npm run server`
3. **调试**: 打开浏览器控制台查看 Socket.IO 连接状态和日志
4. **健康检查**: 访问 http://localhost:3001/health 查看服务器状态

## 下一步

- 阅读 [README.md](./README.md) 了解详细文档
- 查看 [prd.md](./prd.md) 了解产品需求
- 探索代码，自定义功能


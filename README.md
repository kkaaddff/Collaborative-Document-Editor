# 协同文档编辑器

基于 Next.js 16 + Yjs 的实时协同富文本编辑器。多用户可同时编辑同一文档，变更实时同步；支持图片上传、房间码加入、在线用户与光标感知。

## ✨ 功能特性

- ✅ **实时协同编辑**：基于 Yjs CRDT，多人并发编辑自动收敛、无冲突
- ✅ **富文本编辑**：MDX 编辑器，支持加粗/斜体/下划线、列表、引用、表格、代码块、图片、链接等
- ✅ **房间系统**：首页生成 8 位房间码，或凭码 + 用户名加入
- ✅ **用户感知**：在线用户列表、实时光标位置
- ✅ **图片上传**：服务端 multer 接收，5MB 内、仅限常见图片格式
- ✅ **客户端加密工具**：`lib/crypto.ts` 提供 AES 加解密（crypto-js）

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16（静态导出）· React 19 · TypeScript · Tailwind CSS v4 |
| 编辑器 | `@mdxeditor/editor` |
| 协同内核 | Yjs（CRDT）· `y-websocket`（客户端 provider） |
| 加密 | crypto-js（AES，客户端） |
| 服务端 | Node · express · ws · `y-websocket` 服务端 · multer（图片上传） |
| 进程管理 | PM2 |
| 静态托管 / 反向代理 | OpenResty（nginx） |

## 📦 项目结构

```
coordination—v2/
├── app/                      # Next.js App Router
│   ├── page.tsx             # 首页（创建/加入房间）
│   ├── editor/page.tsx      # 编辑器页（query 参数 ?code=&name=）
│   ├── layout.tsx           # 根布局（强制浅色主题）
│   └── globals.css          # Tailwind v4 入口 + 主题变量
├── lib/
│   ├── useCollaboration.ts  # Yjs + y-websocket 协同 Hook
│   └── crypto.ts            # AES 加解密工具
├── types/                    # TypeScript 类型
├── server/                   # 协同 WebSocket 服务（独立 Node 进程）
│   ├── index.js             # express + ws + y-websocket + multer
│   ├── uploads/             # 运行时：用户上传的图片（部署时保留）
│   └── package.json
├── deploy/                   # 部署体系（配置内化）
│   ├── config.sh            # 部署配置 —— 唯一真源
│   ├── deploy.sh            # 本地入口：构建→上传→远端重启
│   ├── remote-restart.sh    # 远端：npm ci + pm2 + nginx reload + 健康检查
│   └── nginx/coordination.conf  # nginx 站点配置（含 try_files 修复）
├── ecosystem.config.js       # PM2 配置
├── health-check.js           # 健康检查脚本（dev）
└── package.json
```

## 🚀 快速开始（本地开发）

```bash
npm install            # 前端依赖
cd server && npm install && cd ..   # 服务端依赖
cp .env.example .env.local          # 默认指向 localhost:3001
npm run dev:all        # 同时启动前端(3000) + WS 服务(3001)
```

打开 [http://localhost:3000](http://localhost:3000)。也可分别 `npm run dev` 与 `npm run server`。

环境变量（`.env.local`）：

```
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

> 该变量在 `next build` 时内联进静态产物，生产值由部署脚本写入（见下）。

## 🚢 部署

### 拓扑

```
浏览器  ──www.hengheng.online──▶  反向代理 (139.224.29.117, 1Panel OpenResty)
                                   │  :8100 → 静态前端
                                   │  :8101 → WebSocket  (含 /health /upload /uploads)
                                   ▼
                          应用服务器 (112.124.21.6)
                                   │  :8100  OpenResty 容器托管静态文件
                                   │         (root /www/sites/coordination/index)
                                   │  :8101  PM2 coordination-ws (server/index.js)
```

- 反向代理仅做端口转发，**部署不涉及它**（1Panel 管理）。
- 所有部署参数集中在 `deploy/config.sh`（SSH、路径、WS 地址、端口、PM2 名）。
- nginx 站点配置真源在 `deploy/nginx/coordination.conf`，每次部署覆盖到服务器并 reload。

### 一键部署

```bash
npm run deploy         # = bash deploy/deploy.sh
```

脚本完成：

1. 写入 `.env.production.local`（`NEXT_PUBLIC_WS_URL`，取自 `deploy/config.sh`）。
2. `npm ci` + `npm run build` → 产出 `out/`（依赖经项目 `.npmrc` 走淘宝源）。
3. `tar | ssh` 上传 `out/` → 服务器静态目录（先清空旧产物；`--no-same-owner`）。
4. `tar | ssh` 上传 `server/`（**排除 `node_modules` 与 `uploads`**，保留运行时图片与远端依赖）。
5. `scp` 上传 `ecosystem.config.js` + `.npmrc` + `deploy/` 脚本 + nginx 配置。
6. ssh 远端执行 `remote-restart.sh`：
   - `server/ npm ci --omit=dev`（服务器读项目 `.npmrc`，走淘宝源）
   - `pm2 startOrReload ecosystem.config.js`
   - 备份后覆盖 nginx 配置 → `openresty -t` 通过才 reload（失败自动回滚）
   - curl 前端 + `/health` 健康检查

> 上传只用 `tar/scp/ssh`，**不依赖服务器装 rsync**。本地需 `node(≥18) / npm / tar / scp / ssh`。
> `package-lock.json`（根与 `server/`）的 `resolved` URL 已统一指向 `registry.npmmirror.com`，故 `npm ci` 在任意机器都能直连淘宝镜像。

### 一次性前置（新服务器）

应用服务器上需先就位（仅首次，之后由 `npm run deploy` 维护）：

1. 1Panel 建一个静态站点，端口 8100，index 指向 `/opt/1panel/apps/openresty/openresty/www/sites/coordination/index`；反向代理 8100/8101 转发到本机。
2. 安装 `node@18`、`pm2`（`npm i -g pm2`）。
3. PM2 自启：`pm2 startup && pm2 save`（可选）。
4. 创建项目目录 `/home/coordinationv2/coordination—v2`（首次 deploy 会 tar 进去）。

### 手动运维

```bash
# 服务器上
pm2 list / pm2 logs coordination-ws / pm2 restart coordination-ws
docker exec <openresty容器> openresty -s reload      # 改 nginx 后
curl http://www.hengheng.online:8101/health
```

### 离线打包（备选）

`bash build-release.sh` 产出 `dist/coordination-v2-*.zip`（含 `frontend/` + `server/` + 运维文件），供无法直连 scp 的环境手动部署。注意：zip 内不含 `.env.local`，消费者需自行设置 `NEXT_PUBLIC_WS_URL` 后再构建。

## 🏗 架构说明

### 协同数据流

```
客户端 A                     y-websocket 服务端                    客户端 B
  │  WebsocketProvider             (server/index.js)                     │
  │── Y.Doc update (CRDT) ───────▶ setupWSConnection ─────▶ 广播 ──────▶│ applyUpdate
  │◀──── awareness (光标/用户) ─────────────────────────────────────────│
```

- 每个「房间」= 一个 Yjs 文档，以房间码为 doc name。
- 服务端用 `y-websocket/bin/utils.setupWSConnection` 仅做中继与持久化，不解析内容。
- 客户端通过 `lib/useCollaboration.ts` 建立 `WebsocketProvider`，绑定 `@mdxeditor/editor`。

### HTTP 接口（WS 服务端，:8101）

- `GET /health` → `{ status, timestamp, totalRooms, totalUsers, rooms:[{code,userCount,lastActivity}] }`
- `POST /upload`（`multipart/form-data`，字段名 `image`，≤5MB，jpg/png/gif/webp）→ `{ url: "/uploads/<name>" }`
- `GET /uploads/<name>` → 静态图片

## 📝 使用方法

- **创建文档**：首页点「创建新文档」→ 生成 8 位房间码 → 进入编辑器 → 把链接/房间码分享给他人。
- **加入文档**：输入 8 位房间码与用户名 →「加入文档」。
- **协同编辑**：编辑内容实时同步；右侧显示在线用户与光标；可粘贴/拖入或工具栏插入图片。

## 🔧 开发说明

- 强制浅色主题：`app/layout.tsx` 给 `<html>` 设 `class="light"`，并在 `globals.css` 用 `@custom-variant dark` 把 dark 变体改为基于 `.dark` 类（永不触发）。
- 服务端房间状态为内存存储（`server/index.js` 的 `roomStats`），重启后清空。
- `lib/crypto.ts` 提供客户端 AES 工具，可按需在编辑器侧启用。

## 📄 许可证

MIT

# 协同文档编辑器

基于 Next.js 16 + Yjs 的实时协同富文本编辑器。多用户可同时编辑同一文档，变更实时同步；支持图片上传、房间码加入、在线用户感知。

## ✨ 功能特性

- ✅ **实时协同编辑**：基于 Yjs CRDT，多人并发编辑自动收敛、无冲突
- ✅ **富文本编辑**：MDX 编辑器，支持加粗/斜体/下划线、列表、引用、表格、代码块、图片、链接等
- ✅ **房间系统**：首页生成 8 位房间码，或凭码 + 用户名加入
- ✅ **用户感知**：在线用户列表（awareness）
- ✅ **图片上传**：服务端 multer 接收，5MB 内、仅限常见图片格式

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16（静态导出）· React 19 · TypeScript · Tailwind CSS v4 |
| 编辑器 | `@mdxeditor/editor` |
| 协同内核 | Yjs（CRDT）· `y-websocket`（客户端 provider） |
| 服务端 | Node · express · ws · `y-websocket` 服务端 · multer（图片上传） |
| 进程管理 | PM2 |
| 静态托管 / 反向代理 | OpenResty（nginx） |

## 📦 项目结构

```
coordination—v2/
├── app/                      # Next.js App Router
│   ├── page.tsx             # 首页（创建/加入房间）
│   ├── editor/              # 编辑器页（page 编排 + RoomHeader/UsersPanel/editorConfig）
│   ├── layout.tsx           # 根布局（强制浅色主题）
│   └── globals.css          # Tailwind v4 入口 + 主题变量
├── lib/
│   ├── useCollaboration.ts  # Yjs + y-websocket 协同 Hook
│   ├── storage.ts           # localStorage 工具（用户名/最近房间）
│   ├── serverBase.ts        # 服务地址解析（环境变量 → 同源回退）
│   └── roomCode.ts          # 房间码生成 / 相对时间纯函数
├── types/                    # TypeScript 类型
├── server/                   # 协同 WebSocket 服务（独立 Node 进程）
│   ├── index.js             # express + ws + y-websocket + multer
│   ├── uploads/             # 运行时：用户上传的图片（部署时保留）
│   └── package.json
├── deploy/                   # 部署体系（配置内化）
│   ├── config.sh            # 部署配置 —— 唯一真源
│   ├── deploy.sh            # 本地入口：构建→上传→远端重启
│   ├── remote-restart.sh    # 远端：npm ci + pm2 + nginx reload + 健康检查
│   └── nginx/               # nginx 站点配置（docz.hengheng.online.conf 等）
├── Dockerfile / docker-compose.yml  # all-in-one 镜像（前端静态 + WS 同端口）
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
浏览器  ──http/ws──▶ 应用服务器 (112.124.21.6, docz.hengheng.online)
                          │  :80   OpenResty 容器 (docz.hengheng.online.conf, host 网络)
                          │        ├ 静态前端 (root /www/sites/docz/index)
                          │        └ /ws /upload /uploads /health → 反代到 127.0.0.1:8101
                          │  :8101  PM2 coordination-ws (server/index.js)
```

- 与同服务器其他 1Panel 站点（www/bitwarden/cookiecloud…）共享 80 端口，按 `server_name` 区分；**不另装系统 nginx**（80 已被 OpenResty 占用，且 nginx 本就是它）。
- 所有部署参数集中在 `deploy/config.sh`（SSH、路径、WS 地址、端口、PM2 名）。
- nginx 站点配置真源在 `deploy/nginx/docz.hengheng.online.conf`，每次部署覆盖到服务器并 reload。
- DNS：`docz.hengheng.online` 需 A 记录 → `112.124.21.6`（健康检查用 `--resolve` 本机直连，不依赖 DNS 生效）。

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

1. node@18 与 pm2（`npm i -g pm2`）；PM2 自启：`pm2 startup && pm2 save`（可选）。
2. OpenResty（1Panel 自带即可）：`deploy/remote-restart.sh` 会自动建站点目录（index/log）并覆盖站点配置到 conf.d/。
3. DNS 添加 A 记录：`docz.hengheng.online` → 服务器公网 IP。

### 手动运维

```bash
# 服务器上
pm2 list / pm2 logs coordination-ws / pm2 restart coordination-ws
docker exec <openresty容器> openresty -s reload      # 改 nginx 后
curl http://docz.hengheng.online/health
```

### Docker all-in-one（备选）

`docker compose up -d --build` 单容器跑「前端静态 + 协同 WS」同端口（默认 9091），适配 fnos connect 等随机四级域名反代场景；上传图片挂载 `./data/uploads` 持久化。

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
- **协同编辑**：编辑内容实时同步；右侧显示在线用户；可粘贴/拖入或工具栏插入图片。

## 🔧 开发说明

- 强制浅色主题：`app/layout.tsx` 给 `<html>` 设 `class="light"`，并在 `globals.css` 用 `@custom-variant dark` 把 dark 变体改为基于 `.dark` 类（永不触发）。
- 服务端房间状态为内存存储（`server/index.js` 的 `roomStats`），重启后清空。

## 📄 许可证

MIT

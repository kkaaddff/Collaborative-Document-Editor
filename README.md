# 协同文档编辑器

基于 Yjs CRDT 的实时协同富文本编辑器，v3 起为 **CS 架构跨端应用**：同一套 React 代码构建 **Web / 桌面（mac·win·linux）/ Android** 三类客户端，全部产物由 GitHub Actions 一次触发产出；客户端**直连自建服务器**（IP:端口），手机**扫码直接进房**。

## ✨ 功能特性

- ✅ **实时协同编辑**：Yjs CRDT，多人并发编辑自动收敛、无冲突
- ✅ **富文本编辑**：MDX 编辑器——加粗/斜体、列表、引用、表格、代码块、图片、链接
- ✅ **房间系统**：8 位房间码创建/加入；最近房间、在线房间列表
- ✅ **服务器直连**：设置页配置 `http://IP:端口` 即切换服务器，运行时生效无需重构建；内置 `/health` 连通性测试（延迟/房间数/在线人数）
- ✅ **扫码进房**：房间二维码 = Web URL，任何手机相机扫码进 Web 版兜底；App 内扫码走直连
- ✅ **桌面增强**（Tauri）：托盘最近 5 房间直达、IndexedDB 离线缓存（断网可编辑，重连自动合并）
- ✅ **用户感知**：在线用户列表（awareness）；图片上传（multer，5MB 内常见格式）

## 🛠 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vite 7 · React 19 · React Router 7 · TypeScript · Tailwind CSS v4 |
| 桌面/移动壳 | Tauri 2（desktop：托盘；android：扫码插件；iOS 仅预留） |
| 编辑器 | `@mdxeditor/editor` |
| 协同内核 | Yjs（CRDT）· `y-websocket` provider · `y-indexeddb` 离线持久化 |
| 二维码 | `qrcode`（生成）· `jsqr` + getUserMedia（识别，App 内走原生插件） |
| 服务端 | Node · express · ws · `y-websocket` 服务端 · multer（图片上传）· CORS |
| 进程管理 / 反代 | PM2 · OpenResty（nginx） |
| 打包流水线 | GitHub Actions（web + 三平台桌面 + android 矩阵） |

## 📦 项目结构

```
coordination-v2/
├── client/                     # 前端 + 跨端壳（Vite / Tauri）
│   ├── src/
│   │   ├── pages/             # Home / Editor / Settings / Join(扫码落地)
│   │   ├── components/        # RoomHeader / UsersPanel / editorConfig / QrModal / ScanModal
│   │   ├── lib/               # useCollaboration / serverConfig(直连核心) / storage / qr / roomCode
│   │   ├── platform/          # 平台差异封装：isTauri / scanQr / tray
│   │   └── types/
│   ├── src-tauri/             # Tauri 2 工程：Rust（托盘/扫码插件门控）+ 图标 + capabilities
│   ├── scripts/android-patch.mjs  # android init 后补 cleartext/CAMERA/INTERNET
│   └── vite.config.ts
├── server/                     # 协同服务（express + ws + y-websocket + multer）
│   ├── index.js               # 静态托管 STATIC_DIR + /health + /upload
│   ├── convergence-smoke.mjs  # 双端交错写收敛冒烟脚本
│   └── uploads/               # 运行时图片（部署保留）
├── deploy/                     # 部署体系（config.sh 唯一真源；tar over ssh，无 rsync）
├── .github/workflows/build.yml # 全产物流水线（见下）
├── Dockerfile / docker-compose.yml  # all-in-one 备选
└── ecosystem.config.js         # PM2 配置
```

## 🚀 快速开始（本地开发）

```bash
./setup.sh              # 或手动：client/ 与 server/ 各 npm install
npm run dev:all         # 前端(Vite :5173) + WS 服务(:3001)
```

打开 <http://localhost:5173>。也可分别 `npm run dev`（前端）/ `npm run server`（WS 服务）。

- dev 下服务器地址取 `client/.env.local` 的 `VITE_SERVER_URL=http://localhost:3001`（**仅开发用**；生产是运行时配置，构建不内联任何地址）。
- 浏览器里首页状态条显示当前服务器；不可达时黄条引导去「设置」页配置直连地址。

### 桌面 / Android 本地开发（可选）

需要 Rust 工具链（`rustup`；国内可配 rsproxy 镜像）+ Android 场景另需 JDK 17 与 Android SDK/NDK：

```bash
cd client
npx tauri dev                # 桌面壳调试（自动起 Vite）
npm run android:init         # tauri android init + 清单补丁（生成 gen/android，不入库）
npm run android:dev          # 真机/模拟器调试
```

> 本机没有 Rust 也能开发全部 Web 功能——出包一律走 CI。

## 🏗 架构说明

```
 Tauri 桌面 (dmg/nsis/AppImage+deb)   托盘最近房间 · IndexedDB 离线缓存
 Tauri Android (arm64 apk)           扫码进房 · ws://IP:PORT 直连（cleartext）
 Web (Vite → dist/)                   同一 SPA；默认同源，?server= 可覆盖
        │  同一套 client/src（platform/ 收敛平台差异）
        ▼
 server/ Node —— express + y-websocket(CRDT 中继) + multer(上传) + /health
 直连：客户端设置页/扫码写入 http://host:port；Web 默认 location.origin 回退
```

### 服务器地址解析（`client/src/lib/serverConfig.ts`）

优先级：`?server=` URL 参数（扫码/分享）> 已保存配置（设置页/扫码写入；Web 用 localStorage）> `VITE_SERVER_URL`（仅 dev）> 同源 `location.origin`。协同 WS、图片上传、在线房间列表共用该地址。

### 扫码进房（双向）

- **码内容 = Web URL**：`<server>/join?code=<房间码>&server=<直连地址>`。系统相机扫码 → 手机浏览器进 Web 版（兜底）；App 内扫码（首页「扫码加入」）→ 解析直连。
- `/join` 落地页固化 server 配置；已存用户名直进编辑器，否则回首页预填房间码引导起名。
- **识别通道**：Android App = `tauri-plugin-barcode-scanner`（按 target 门控编译，桌面不引入）；其余 = jsQR + getUserMedia——**浏览器扫码需 HTTPS/localhost**，直连 `http://IP` 的手机浏览器请用系统相机扫（属预期）。

### 协同数据流

- 每个房间 = 一个 Yjs 文档（doc name = 房间码）；服务端 `setupWSConnection` 只中继不解析内容；房间状态内存存储，重启清空。
- 客户端 `useCollaboration` 建立 `WebsocketProvider` + `IndexeddbPersistence`（room 级离线持久化，隐私模式静默跳过）。

### HTTP 接口（WS 服务端）

- `GET /health` → `{ status, timestamp, totalRooms, totalUsers, rooms:[{code,userCount,lastActivity}] }`
- `POST /upload`（`multipart/form-data`，字段 `image`，≤5MB，jpg/png/gif/webp）→ `{ url: "/uploads/<name>" }`
- `GET /uploads/<name>` → 静态图片

## 📦 GitHub Actions 全产物流水线

`.github/workflows/build.yml`，两种触发：

- **手动**（workflow_dispatch）：全矩阵构建，产物同时进 workflow Artifacts 与 **GitHub Release**（默认勾选 `release`，tag = `v` + `tauri.conf.json` 版本号，如 `v3.0.0`；重复触发同版本会覆盖同名附件，升版本改 `client/src-tauri/tauri.conf.json`）。可另勾选 `deploy` 同时部署 Web 到生产（需 repo Secret `SSH_PRIVATE_KEY`，走 `deploy/deploy.sh` 全链路）。
- **推 `v*` tag**：同矩阵，Release 用 tag 名，全产物挂附件。

| Job | Runner | Artifacts（run 页面下载） |
|---|---|---|
| web | ubuntu | `web-dist`（`web-dist.zip`，Vite 构建） |
| desktop | macos-latest | `desktop-dmg-aarch64`（`*.dmg`，仅 Apple Silicon） |
| desktop | windows-latest | `desktop-nsis-x64`（NSIS `*-setup.exe`，未签名） |
| desktop | ubuntu-latest | `desktop-linux-x64`（`*.AppImage` + `*.deb`） |
| android | ubuntu-latest | `android-apk`（单包 arm64-v8a，debug 签名） |

> 未配置签名/公证证书：mac dmg 首次打开需右键→打开；win 会弹 SmartScreen；apk 为 debug 签名可直接侧载。正式签名后续用 repo Secrets 接入。

## 🚢 部署（Web + 服务端）

### 拓扑

```
浏览器/App ──http/ws──▶ 应用服务器 (112.124.21.6, docz.hengheng.online)
                          │ :80   OpenResty 容器 (docz.hengheng.online.conf, host 网络)
                          │       ├ 静态前端 (root /www/sites/docz/index)
                          │       └ /ws /upload /uploads /health → 127.0.0.1:8101
                          │ :8101  PM2 coordination-ws (server/index.js)
```

- 与同服务器其他 1Panel 站点共享 80 端口，按 `server_name` 区分；**不另装系统 nginx**（80 已被 OpenResty 占用）。
- 部署参数集中在 `deploy/config.sh`（SSH、路径、端口、PM2 名）；nginx 配置真源在 `deploy/nginx/`，每次部署覆盖并 reload。
- DNS：`docz.hengheng.online` A 记录 → `112.124.21.6`（健康检查 `--resolve` 本机直连，不依赖 DNS）。

### 一键部署

```bash
npm run deploy          # = bash deploy/deploy.sh
```

脚本完成：

1. `client/ npm ci + npm run build` → `client/dist/`（v3 起地址运行时化，构建不写任何环境值）。
2. `tar | ssh` 上传 `client/dist/` → 服务器静态目录（先清空旧产物）。
3. `tar | ssh` 上传 `server/`（**排除 `node_modules` 与 `uploads`**）。
4. `scp` 上传 `ecosystem.config.js` + `.npmrc` + `deploy/` 脚本 + nginx 配置。
5. ssh 远端 `remote-restart.sh`：`npm ci --omit=dev` → `pm2 startOrReload` → 备份后覆盖 nginx 配置（`openresty -t` 通过才 reload，失败回滚）→ 前端 + `/health` 健康检查。

> 上传只用 `tar/scp/ssh`，不依赖服务器装 rsync；`package-lock.json` 的 `resolved` 统一指向 npmmirror，任意机器 `npm ci` 可直连。

### 一次性前置（新服务器）

1. node@18 + pm2（`npm i -g pm2`）；`pm2 startup && pm2 save`（可选）。
2. OpenResty（1Panel 自带即可）：`remote-restart.sh` 自动建站点目录并覆盖 conf.d/。
3. DNS A 记录：`docz.hengheng.online` → 服务器公网 IP。

### 手动运维

```bash
pm2 list / pm2 logs coordination-ws / pm2 restart coordination-ws
docker exec <openresty容器> openresty -s reload      # 改 nginx 后
curl http://docz.hengheng.online/health
```

### Docker all-in-one（备选）

`docker compose up -d --build` 单容器跑「前端静态 + 协同 WS」同端口（默认 9091），适配 fnos connect 等随机四级域名反代场景；上传图片挂载 `./data/uploads` 持久化。

## 📝 使用方法

- **创建文档**：首页「创建新文档」→ 8 位房间码 → 编辑器内「二维码」按钮分享。
- **加入文档**：房间码 + 用户名；或首页「扫码加入」；或手机相机扫房间二维码。
- **切服务器**：首页「设置」→ 输入 `http://IP:端口` → 测试连接 → 保存（全端运行时生效）。
- **离线**：桌面/Web 断网仍可编辑，恢复后自动合并。

## 🔒 安全须知（如实）

- 房间码即凭据，服务端无鉴权——仅适合内网/受信小圈子，请勿放敏感内容。
- v1 直连均为明文 `ws://`（Android 已开 cleartext）；公网正式使用建议走 nginx https 反代。
- App 产物未签名/公证（见流水线说明）。

## 🔧 开发说明

- 强制浅色主题：`client/index.html` 设 `class="light"`，`index.css` 用 `@custom-variant dark` 让 dark 变体永不触发。
- rollup 平台原生包（`client/package.json` 的 `optionalDependencies`）：npm 只把 optional 平台包按「生成 lockfile 的平台」写入（npm/cli#4828），跨平台 CI 会缺包；显式声明保证全平台进 lockfile。**升级 rollup 时必须同步改这三项版本**（与 rollup 严格同版）。
- **收敛冒烟**（改 `useCollaboration`/Yjs 模型后必跑）：起服后 `cd server && node convergence-smoke.mjs`——双端 100 交错随机插入 + 删除 + meta + awareness 断言。
- 本地仓库路径须为 ASCII（`coordination-v2`）：em-dash 路径会挂 Android Gradle 构建。
- `client/src-tauri/gen/`（android 工程与 schemas）不入库，由 `android:init` / CI 生成。

## 📄 许可证

MIT

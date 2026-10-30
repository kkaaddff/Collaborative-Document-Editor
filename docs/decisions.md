# 决策记录与坑清单

## ADR 简表（为什么是现在这个样子）

| # | 决策 | 理由 / 放弃的方案 |
|---|---|---|
| 1 | 一套 React 代码出三端（Web + Tauri 桌面 + Tauri Android） | 上一版 Next.js 静态导出只有 Web；CS 直连 + 扫码需要原生壳。放弃 Electron（重、Linux 打包痛苦）与 RN（编辑器组件生态不匹配 MDXEditor） |
| 2 | 服务端零改动保留 express + y-websocket | 它本就是独立 CS 里的 S，监听 0.0.0.0 天然可直连；换 `@y/websocket-server` 留作 awareness 修复的备选 |
| 3 | 服务器地址运行时解析（`?server=` > saved > dev env > 同源） | v2 构建期内联地址 = 换服务器必须重构建；扫码带参即可直连任意部署 |
| 4 | QR 载荷 = Web URL（`/join?code=&server=`） | 任何手机系统相机都能兜底进 Web 版；深链 v1 不做（官方插件不支持自定义 scheme，App Links 要域名） |
| 5 | 出包全在 GitHub Actions，本机不装 Rust/JDK | 本地只需 `tsc`/`eslint`/`vite build` + 冒烟；CI runner 路径天然 ASCII，绕开 em-dash 坑 |
| 6 | Android 只出 arm64-v8a 单 apk（不拆 abi、不出 aab） | 用户拍板：只兼容最新 Android 设备；debug 签名可直接装机 |
| 7 | 不出 Intel mac dmg | 用户拍板：只要 Apple Silicon |
| 8 | 手动触发 CI 也创建 Release（v+版本号，非 draft） | 用户要求"触发即出全套可取回"；重复触发 `--clobber` 覆盖同名附件 |
| 9 | CRDT（Yjs）而非 OT/Socket.IO | 离线可编辑、重连自动合并、服务端零语义只中继；与 v2 一致平滑迁移 |
| 10 | e2e 只在本地，绝不进 CI | 依赖本机 Chrome/真实端口/系统剪贴板，CI 慢且不稳；CI 定位是"只出包" |
| 11 | 托盘/菜单代码 `#[cfg(desktop)]` 门控 | 这些 API 桌面-only，不门控 android 目标编译失败（实踩 E0432/E0599） |
| 12 | Tauri 差异全部收口 `client/src/platform/` | 页面/组件禁止直接 import `@tauri-apps/*`，保证 Web 构建不被原生依赖污染 |
| 13 | 部署内化 `deploy/` + `npm run deploy` | tar over ssh（不依赖远端 rsync）+ nginx conf 版本化进仓库 + PM2 单进程 |
| 14 | CORS 全开、房间码即凭据、明文 ws | 内网/受信场景的产品定位；公网使用需自行 TLS 反代（如实文档化，不做假安全） |

## 坑清单（按"再遇到怎么识别"组织）

### 构建/依赖

| 坑 | 症状 | 规避 |
|---|---|---|
| 本地 npm install 写回私有镜像 URL | `client/package-lock.json` 出现 `amh-group` 域 | **push 前必查** `rg -c amh-group client/package-lock.json`；e2e/ 已配 npmmirror `.npmrc` |
| rollup optional 平台原生包被裁剪 | 其它平台 `npm ci` 缺 `@rollup/*-gnu/msvc`（npm/cli#4828） | CI 用 `npm install`；升级 rollup 时 `optionalDependencies` 三项必须严格同步同版 |
| npmmirror 在海外 runner 不稳 | `npm ci` 中途崩且退出码 0 → 半残 node_modules | CI `NPM_CONFIG_REGISTRY` 覆盖回官方源 + `test -x node_modules/.bin/tsc` 兜底 |
| 本地路径 em-dash | `coordination—v2` 下 Android Gradle 直接挂 | 本地 checkout 必须 ASCII `coordination-v2`；**远端** `REMOTE_APP_DIR` 至今含 em-dash，引用必须双引号 |
| tauri-action 无 tagName 跳过上传 | 手动触发 Release 空 | 显式 upload-artifact 兜底 + `gh release create ... || true` + `--clobber` |
| gh CLI 不展开 glob | `**/*.apk` 传给 gh 报找不到 | `shopt -s globstar nullglob` |

### 协同（y-websocket）

| 坑 | 症状 | 规避 |
|---|---|---|
| destroy() 的 awareness 置空舞步 | 关页后其他端人数挂 ~30s | 卸载先 `provider.ws?.close()` 再 destroy（见 collaboration.md） |
| 同 context 双标签 awareness 归属错位 | 同上，且是上游语义 | e2e 双用户各开独立 context；单人双标签接受 30s 过期语义 |
| 交错插入拆散标记 | substring 断言假失败 | 冒烟按括号对计数断言 |
| e2e 共享房间码 | 并行 worker 人数互相串扰 | 每用例 `uniqRoom()` |
| `useLocalStorageState` 存 JSON | 裸读 localStorage 拿到带引号的 `"张三"` | 一律走 `storage.ts` 解析函数（getSavedUsername 等） |

### 运维/网络

| 坑 | 症状 | 规避 |
|---|---|---|
| nginx `/_next/static/` 遗留 | v3 的 `/assets/` 吃不到 immutable 缓存 | 下次部署改 `location /assets/`（不影响正确性） |
| fake-IP 代理到 GitHub 抖动 | git push SSH/HTTPS 失败、`gh api` EOF | GitHub 操作一律 `gh`（origin 已 HTTPS + gh 凭据）；EOF 多为网络抖动，隔秒重试，别急着查凭据 |
| `github.pluscn.cn` 是另一 GHE | 找不到本仓库 | 它是公司实例（账号 qicheng-zhang），本仓库只在 github.com/kkaaddff |
| zsh `=word` 展开 | `echo ======` 报 `not found` | 分隔符加引号 |
| SSH 私钥进 CI | secret 泄漏面 | 只经 `env: SSH_KEY: ${{ secrets.SSH_PRIVATE_KEY }}` 间接引用，绝不写进 run 脚本 |

### 平台

| 坑 | 症状 | 规避 |
|---|---|---|
| 桌面-only Rust API | android 目标 E0432/E0599 | `#[cfg(desktop)]` 门控 tray/menu/unminimize |
| Android WebView 禁明文 | 直连 ws:// 被拒 | `android-patch.mjs` 加 `usesCleartextTraffic`（内网定位） |
| 非安全上下文无 clipboard API | http://IP 直连时复制崩 | `navigator.clipboard?.` 判空 + textarea/execCommand 降级 + 失败提示手码 |
| barcode-scanner 插件成熟度 | iOS scan 不返回、QR 配置 bug、16KB page size | Android 才用插件，其余 jsQR 兜底；iOS 不出包；16KB 合规未专项验证（上架前处理） |
| `src-tauri/gen/` 生成物 | 合入仓库即污染 | 不入库，`android:init`/CI 现场生成 |

## 后续路线（v2 候选）

- 修同 context awareness 归属（patch utils.js 或换 `@y/websocket-server`）
- Android 正式签名 + aab + 16KB page size 合规；iOS 出包评估
- mac 公证 / win 代码签名；自动更新（需签名与分发清单）
- 移动端 MDXEditor 软键盘/选区体验（不适配则降级只读/简易模式）
- nginx 缓存规则换 `/assets/`；主包 1.3MB 可做 code-split

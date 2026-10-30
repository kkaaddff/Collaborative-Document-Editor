# Changelog

本文件记录面向用户的显著变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),
版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [3.3.1] - 2026-10-31

### 变更

- **APK 瘦身**:`[profile.dev] strip = "debuginfo"` 剥离 Rust debug 库的 DWARF 调试符号——`libpolyphony_lib.so` 117MB → ~20MB,整包 126MB → ~30MB(v3.0 起一直 126MB 的根因,ADR #6 修订)。

## [3.3.0] - 2026-10-30

账号 Token 体系 + 首页双栏一屏重构。**破坏性变更:WS 与上传强制 token 鉴权,v3.2 及更早的客户端将无法连接,请重装新版。**

### 新增

- **账号体系**:Web 独占创建账号(用户名唯一);**token 一次性展示**,服务端仅存哈希(sha256+盐);桌面/Android/其他浏览器粘贴 token 登录;401 统一登出回引导页。
- **服务端房间簿**:进入自动登记、改名同步;首页「我的房间」跨端一致;支持**单个退出与批量退出**(多选/全选),退出不影响房间内容,凭码可再进。
- **首次引导**(`/welcome`):创建账号 / 粘贴 token 双入口;未登录访问任意路由自动跳转,登录后回跳原地址。
- 首页顶栏右上角固定显示「用户名 · 服务器地址」+ 设置 + 退出登录。

### 变更

- **首页双栏一屏**:左栏创建/房间码/扫码,右栏「我的房间 | 在线房间」列表(内部滚动,整页无外滚);移除用户名输入(身份来自账号)。
- 相对时间改 `Intl.RelativeTimeFormat`(随界面语言)。
- 协同 WS 连接携带 `?token=`,无效即被服务端 `close(4001)`。

### 破坏性变更 / 升级说明

- 旧客户端(≤ v3.2)无 token,连接与上传将被拒绝——升级服务端后请**同步安装新版客户端**。
- 本地不再存用户名;首次使用走引导流程创建或粘贴账号。
- 服务端新增 `polyphony-data` 卷(accounts.json:token 哈希 + 房间簿),部署前确保挂载,否则重建容器账号丢失。

## [3.2.0] - 2026-10-30

中英双语界面,默认跟随系统语言。

### 新增

- **i18n（zh / en）**：默认跟随系统语言；设置页新增「界面语言」三选（跟随系统 / 中文 / English），即时生效并跨标签页同步。
- 服务端上传校验错误附稳定错误码（`E_NO_FILE` / `E_FILE_TYPE` / `E_FILE_SIZE`），客户端按界面语言本地化提示（`error` 文本保留,旧客户端兼容）。
- 桌面托盘菜单与 tooltip 随界面语言本地化（随 3.2.0 桌面安装包生效）。

### 变更

- 品牌呈现「各说各话」：中文界面显示「复调」、英文界面显示「Polyphony」，不再中英混排。
- 相对时间（最近房间列表）改用标准 `Intl.RelativeTimeFormat`，随界面语言格式化。
- 页面 `<title>` 与 `<html lang>` 随语言动态更新。

## [3.1.0] - 2026-10-30

项目更名:**coordination-v2 → 复调 Polyphony**(Many voices. One score.)。

### 新增

- 复调品牌与双语文案(应用名、窗口标题、商店描述、托盘)。
- 重写 all-in-one Docker 镜像适配 v3 布局:双阶段构建(client vite → server 运行时),
  同端口托管「Web 静态 + 协同 WS + 上传」,`docker compose up -d` 一条命令自托管;
  上传图片迁移到具名卷 `polyphony-uploads`,重建容器不丢数据。
- Gitea CI(`.gitea/workflows/deploy.yml`):push main 自动构建部署 server+Web;
  纯文档推送不触发;镜像按 git SHA 版本化;部署后 health + 双端 CRDT 收敛冒烟,
  验证失败自动回滚上一版本。
- `CHANGELOG.md`(本文件)、`README.md` 按开源产品标准重写、`docs/deploy-and-ops.md`
  重写为自托管指南。
- `.nvmrc` 与 `engines.node >= 20`。

### 变更

- 存储键更名:`coordination.*` → `polyphony.*`(localStorage 用户名/最近房间/服务器配置,
  IndexedDB 房间离线副本)。**旧版本本地缓存不迁移**——升级后需重填用户名与服务器地址,
  离线文档副本失效(在线房间由其他客户端或服务端状态恢复)。
- Tauri identifier `online.hengheng.coordination` → `online.hengheng.polyphony`,
  Android `applicationId` 随之变更:旧 apk 升级安装包会视为**全新应用**(不覆盖安装)。
- GitHub Release 标题与产物名改用 Polyphony。

### 移除

- 旧的 PM2 + OpenResty 部署链路(`deploy/`、`ecosystem.config.js`、根 `deploy.sh`、
  `health-check.js`):自托管统一走 Docker;历史可在 git 中找回。
- GitHub workflow 中的 `deploy` 选项与 SSH 部署步骤(由 Gitea CI 取代)。

## [3.0.0] - 2026-09

v3 跨平台架构:CS 架构重构,Web / 桌面(Tauri)/ Android 三端同源;Yjs CRDT 协同内核
+ 房间系统 + 扫码进房 + 服务器直连;GitHub Actions 全产物流水线(web + 三平台桌面 + android)。

## [2.x] - 2026-08 及更早

Next.js 单体 → 静态导出 + 独立 Node WS 服务的过渡版本。详见 git 历史与
`docs/decisions.md`。

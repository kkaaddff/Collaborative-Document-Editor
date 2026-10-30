# Changelog

本文件记录面向用户的显著变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),
版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

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

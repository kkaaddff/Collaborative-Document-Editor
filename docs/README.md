# coordination v3 交接文档（docs/）

> 全量架构设计与项目要点。2026-10 完成跨平台 CS 架构改造（Next.js 单 Web → Tauri 2 三端 + 独立 Node 服务），
> 本目录是这次改造的完整交接快照。日常速查仍以根 `README.md` 与 `AGENTS.md` 为准，本文档负责"为什么这样设计"与"所有踩过的坑"。

## 目录

| 文档 | 内容 |
|---|---|
| [architecture.md](architecture.md) | 总体架构图、分层结构、各子系统设计（运行时服务器配置 / QR 双向 / 平台抽象 / Tauri shell / 离线缓存） |
| [collaboration.md](collaboration.md) | 协同内核：Yjs 文档模型、数据流、awareness 在线状态语义、生命周期与已知边界 |
| [build-and-release.md](build-and-release.md) | GitHub Actions 全产物流水线：矩阵、Release 语义、Android 约束、CI 侧坑 |
| [deploy-and-ops.md](deploy-and-ops.md) | 部署与运维：`deploy/` 链路、nginx 反代、PM2、Docker 备选、生产拓扑 |
| [testing.md](testing.md) | 测试体系：收敛冒烟（必跑）、E2E UI 回归（仅本地）、QR roundtrip、手工场景 |
| [decisions.md](decisions.md) | 决策记录（ADR 简表）与全部已知坑清单 |

## 项目事实卡

| 项 | 值 |
|---|---|
| 版本 | 3.0.0（`client/src-tauri/tauri.conf.json`） |
| 仓库 | github.com/kkaaddff/Collaborative-Document-Editor（main；GitHub 操作一律走 `gh`，origin 已配 HTTPS + gh 凭据） |
| 客户端 | Web（Vite `client/dist/`）+ 桌面三平台（mac arm64 dmg / win nsis / linux AppImage+deb）+ Android（arm64-v8a apk，debug 签名） |
| 服务 | `server/index.js`：express + ws + y-websocket 中继 + multer 图片上传；dev `:3001`，prod `:8101`（PM2 `coordination-ws`） |
| 生产入口 | `http://docz.hengheng.online`（nginx `/ws` 剥前缀反代 `:8101`，静态产物走 1Panel openresty 站点目录） |
| CI | `.github/workflows/build.yml`：手动触发（默认建 Release v3.0.0 挂全产物，可勾选部署）/ 推 `v*` tag |
| 协议 | CRDT（Yjs）over y-websocket；无 Socket.IO / OT；房间码即凭据，无鉴权 |
| 本地出包 | **没有**。本机无 Rust/JDK，桌面/安卓包全部由 Actions 出；本地只跑 `tsc`/`eslint`/`vite build` + 收敛冒烟 + e2e |

## 快速上手

```bash
bash setup.sh            # client/ + server/ 一次性安装
npm run dev:all          # Vite :5173 + 协同服务 :3001
cd e2e && npx playwright test   # 本地 UI 回归（38 用例，不进 CI）
npm run deploy           # 构建并上生产（deploy/deploy.sh 全链路）
```

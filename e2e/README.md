# E2E UI 测试（Playwright，仅本地）

针对首页 / 加入 / 设置 / 编辑器的按钮、跳转、弹层、表单校验与双端协同的端到端回归套件。

> **约定：这套测试只在本机跑，绝不进 CI。** `.github/workflows/build.yml` 不引用 `e2e/`，
> 以后也不得把 `npx playwright test` 加进任何 workflow——它依赖本机 Chrome、真实
> `:3001`/`:5173` 服务与系统剪贴板，CI 环境既慢又不稳定，违背"流水线只出包"的定位。
> 提交前自查：`rg -n "playwright" .github/` 应无结果。

## 覆盖范围

| 文件 | 内容 |
|---|---|
| `tests/home.spec.ts` | 服务端状态点、创建/加入表单校验与跳转、用户名持久化、最近房间（空态/进入/二维码/移除）、在线房间列表、扫码弹层（含摄像头不可用分支、ESC 关闭）、`?join=` 预填 |
| `tests/join.spec.ts` | `/join` 分流四分支 + **用户名不得带 JSON 引号回归**（storage 曾裸读 JSON.stringify 的值） |
| `tests/settings.spec.ts` | 测试连接（成功/失败/裸 IP 补协议头）、保存/清除/返回、回落链 |
| `tests/editor.spec.ts` | 无 code 守卫、退出房间、复制房间码（含无 clipboard API 降级）、二维码弹层（载荷/ESC/遮罩/按钮）、就地重命名（Enter/Escape）、双端协同与人数回落 |

每个用例独立房间码（`uniqRoom`），4 worker 并行不串扰。

## 运行

```bash
cd e2e
npm install          # 首次；走 .npmrc 的 npmmirror 源
npx playwright test  # 全量
npx playwright test tests/home.spec.ts        # 单文件
npx playwright test --headed -g "重命名"       # 有头调试单个用例
npx playwright show-report                     # 看失败截图/trace
```

前置条件（`playwright.config.ts` 的 `webServer` 会自动拉起，已起则复用）：

- `server/` 协同服务 `:3001`（`npm run server`）
- `client/` Vite dev `:5173`（`npm run dev`）
- 本机 Google Chrome（`channel: "chrome"`，不额外下载浏览器）

## 已知语义（不是 bug，测试已按此断言）

- **同一浏览器双标签进同一房间**：共享 IndexedDB/BroadcastChannel 会让 y-websocket 的
  awareness 归属错位，一端关闭后另一端在线人数可能要等 ~30s（awareness 过期）才回落；
  **跨设备/跨浏览器立即回落**。双用户用例因此各开独立 `browser context`（也更贴近真实场景）。
- 清除已保存服务器地址后的回落：dev 构建取 `VITE_SERVER_URL`（`client/.env.local` = :3001），
  只有生产构建才回落 `location.origin`。
- 并行 worker 下 awareness 人数全局共享，必须人手一房，禁止固定房间码常量。

## 修 UI 前先跑一遍

改 `client/src/pages|components` 后本地跑 `npx playwright test` 当回归网；新增交互
（新按钮/新弹层/新校验）时同步补用例，失败截图在 `playwright-report/`（已 gitignore）。

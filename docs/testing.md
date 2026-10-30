# 测试体系

三层：收敛冒烟（协同正确性，必跑）→ E2E UI 回归（本地专属）→ 手工多端场景（发布前）。
**CI 不跑任何测试**——流水线只出包，这是明确约定。

## 1. 收敛冒烟（`server/convergence-smoke.mjs`）— REQUIRED

触发条件：任何改动触及 `useCollaboration.ts`、Yjs 文档模型、或服务端中继逻辑。

```bash
cd server && node index.js &                  # 起服（:3001）
node convergence-smoke.mjs ws://localhost:3001  # ⚠️ 默认打 :8101，本地必须传参
```

内容：双客户端 100 次随机位置交错插入 → 删除轮 → meta + awareness 断言。
**断言纪律**：交错插入会拆散文本标记，必须数括号对，不能 substring 匹配。

## 2. E2E UI 回归（`e2e/`，Playwright）— 仅本地，绝不进 CI

```bash
cd e2e && npm install && npx playwright test   # 38 用例，~15s
npx playwright test tests/home.spec.ts         # 单文件
npx playwright test --headed -g "重命名"        # 有头调试
npx playwright show-report                     # 失败截图/trace
```

- 自动拉起依赖：`webServer` 配置会起 `server/`（:3001）与 Vite dev（:5173），已起则复用；
  浏览器用系统 Chrome（`channel: "chrome"`，不下载）；摄像头用 fake device 参数。
- **CI 隔离是硬约定**：`.github/workflows/` 禁止引用 e2e/playwright；提交前自查 `rg -n "playwright" .github/` 应无结果。

覆盖（详见 `e2e/README.md`）：

| 文件 | 用例数 | 内容 |
|---|---|---|
| `home.spec.ts` | 12 | 状态点、表单校验/跳转、用户名持久化、最近房间、在线房间、扫码弹层（含摄像头不可用、ESC）、`?join=` 预填 |
| `join.spec.ts` | 5 | `/join` 四分支 + 用户名 JSON 引号回归 |
| `settings.spec.ts` | 9 | 测试连接成败、裸 IP 补协议头、保存/清除/返回回落链 |
| `editor.spec.ts` | 10 | 守卫、退出、复制（含无 clipboard API 降级）、二维码三关闭、重命名 Enter/Escape、双端协同与人数回落 |

写用例的纪律（都是实踩）：

- **并行隔离**：每用例独立房间码（`uniqRoom`），禁止共享常量房间码——awareness 人数是房间级全局，会互相串扰。
- **双用户各开独立 browser context**：同 context 双标签共享 IndexedDB/BroadcastChannel，y-websocket
  awareness 归属会错位（离开要等 ~30s），跨 context 才是真实多用户语义（见 [collaboration.md](collaboration.md#已知边界)）。
- localStorage 断言注意 `useLocalStorageState` 存的是 JSON.stringify 值（带引号），业务读取必须走 `storage.ts` 的解析函数。
- dev 构建的地址回落取 `VITE_SERVER_URL`（:3001），只有生产构建才回落 origin。

## 3. 纯逻辑 roundtrip

QR 载荷构建/解析（`client/src/lib/qr.ts`）是纯函数，改动后补断言式验证（build/parse 对拍）。

## 4. 手工多端场景（发布前）

`npm run server` + 两个编辑器标签同房间码；发布前建议完整过一遍：
桌面 App 直连 IP 编辑 ↔ 手机浏览器扫码进房 ↔ 内容收敛；断网编辑 → 重连合并（y-indexeddb）；
Android 真机装 CI 出的 apk 扫码进房。

## 5. 本地构建自检

```bash
npm run build          # tsc --noEmit + eslint + vite build（root 委托 client/）
STATIC_DIR=../client/dist node server/index.js   # 本地同源托管验证（/、/assets、SPA fallback、/health 全 200）
```

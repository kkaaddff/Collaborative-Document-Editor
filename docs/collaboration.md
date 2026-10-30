# 协同内核（Yjs / y-websocket）

## 模型

一个房间 = 一个 `Y.Doc`（roomCode 即 ws URL pathname），三个共享结构：

| 结构 | 用途 |
|---|---|
| `doc.getText("document")` | 正文（MDXEditor 内容），本地编辑经 `diffText` 转最小增删，`doc.transact(..., userId)` 提交 |
| `doc.getMap("meta")` | 房间元数据，目前只有 `roomName`（一人改名，全员 `yMeta.observe` 生效） |
| `provider.awareness` | 在线状态：`{ user: { id, name, color } }`；颜色由 userId 哈希到 12 色板 |

无 Socket.IO、无 OT——纯 CRDT 中继，服务端不解析文档内容，只按房间转发字节。

## 生命周期（`client/src/lib/useCollaboration.ts`）

挂载（`useEffect`，依赖 `roomCode`）：

1. `getServerBase()` 运行时解析地址 → `new WebsocketProvider(wsUrl, roomCode, doc, { params: { userId, token } })`（v3.3 起服务端强制校验 token，无效连接 close(4001)）
2. `IndexeddbPersistence` 离线库（失败静默跳过）
3. observe 注册：yText（内容）、awareness `change`（用户列表）、yMeta（房间名）
4. `awareness.setLocalState({ user })` 自我宣告

卸载顺序（**经过实测校准，勿改**）：

```ts
unobserve 全部 → provider.ws?.close()   // ① 先断 socket
             → persistence.destroy()
             → provider.destroy()        // ② 再 destroy
             → doc.destroy()
```

为什么 ① 在 ② 前：`provider.destroy()` 内部会先把本地 awareness 置空再触发一次全量广播，
时序上可能被服务端按"空名单"记账（y-websocket 服务端的 `connControlledIDs` 只在 `added`
事件注册、从不在 `updated` 重注册），导致连接关闭时**不再广播移除**，其他端要等 ~30s
awareness 过期才看到人离开。先主动断线，服务端按该连接的完整 clientID 名单立即广播离开。

## 已知边界

### 同浏览器双标签的 awareness 归属错位（y-websocket 上游语义，非本仓库 bug）

实测（服务端逐消息插桩 + 真浏览器双页复现）：**同一 browser context 的两个标签**进同一房间时，
后进者的初始握手字节会借道前进者的 socket 完成注册（两页共享 IndexedDB/BroadcastChannel），
于是后进者的 clientID 被记在错误连接名下——它关页时该连接名下"无人可移除"，其他端在线人数
要等 ~30s（`outdatedTimeout`）过期兜底才回落。

- **跨设备/跨浏览器（真实多用户）无此现象**：关页后服务端秒级广播离开，其他端立即回落。
- 应对：E2E 双用户用例各开独立 browser context（见 `e2e/tests/editor.spec.ts` 头注释）；
  单人双标签属边缘场景，接受 30s 语义。若未来要修，方向是服务端按"每条 awareness 消息
  重归属 clientID 到来信连接"（需 patch `y-websocket/bin/utils.js` 或换 `@y/websocket-server`）。

### 其他语义

- y-protocols 1.0.6 与 1.0.7 的 awareness.js 字节一致（版本偏差已排除过）。
- 收敛冒烟注意：交错插入会拆散文本标记，断言必须数括号对，不能 substring 匹配。

## 收敛验证

`server/convergence-smoke.mjs`（改 `useCollaboration.ts`/Yjs 模型/服务端中继后**必跑**）：
双客户端 100 次随机位置交错插入 → 删除轮 → meta + awareness 断言。

```bash
cd server && node index.js &        # 或 npm run server
node convergence-smoke.mjs ws://localhost:3001   # 注意默认打 :8101，本地要传参
```

# 部署与运维

## 生产拓扑

```text
browser/app --> http://docz.hengheng.online (port 80)
                 |
                 |  1Panel openresty container (host network: 127.0.0.1 == host)
                 |
                 |-- /ws/*                     --> 127.0.0.1:8101  (strip /ws prefix)
                 |-- /upload /uploads/ /health --> 127.0.0.1:8101
                 `-- other paths               --> static dist (STATIC_DIR)
                                                   ^
                                                   PM2 coordination-ws
                                                   (server/index.js, PORT=8101)
```

路由说明：`/ws/*` 由 `proxy_pass http://127.0.0.1:8101/;` 的尾斜杠剥掉 `/ws` 前缀（后端收到 `/<room>`）；静态产物目录即 1Panel 站点 index。

- **同源是刻意设计**：Web 端 `location.origin` 兜底天然指向协同服务，扫码/直连参数可覆盖；
  也适配 fnos 等随机四级域名反代场景。
- Web 直连 IP 场景（无 nginx）：设 `STATIC_DIR` 让 `server/index.js` 自己托管前端（含 SPA fallback），
  单端口即全功能。本地复现：`STATIC_DIR=../client/dist node index.js`。

## 一键部署：`npm run deploy` → `deploy/deploy.sh`

配置唯一真源 `deploy/config.sh`（本地与远端脚本共同 source）：

| 变量 | 值（要点） |
|---|---|
| `APP_SSH` | `root@112.124.21.6` |
| `REMOTE_APP_DIR` | `/home/coordinationv2/coordination—v2`（**路径含 em-dash，引用必须双引号**） |
| `STATIC_DIR` | `/opt/1panel/apps/openresty/openresty/www/sites/docz/index`（宿主机路径，容器内映射 `/www/sites/docz/index`） |
| `NGINX_CONF_DST` | openresty 容器 conf.d 下的 `docz.hengheng.online.conf` |
| `WS_PORT` / `PM2_APP_NAME` | `8101` / `coordination-ws` |

deploy.sh 流程：预检工具 → client `npm ci` + `vite build` → tar over ssh 清空并上传 `dist/` →
上传 `server/`（排除 node_modules/uploads）+ ecosystem + deploy 脚本 + nginx conf →
远端执行 `remote-restart.sh`（`npm ci --omit=dev` → `pm2 startOrReload` → 覆盖 nginx conf 并 reload → 健康检查）。

CI 里勾 `deploy=true` 时走同一条链路（SSH 私钥经 `secrets.SSH_PRIVATE_KEY` env 间接引用，**绝不明文进 run 脚本**）。

## 常用运维

```bash
npm run health        # 按 ecosystem 配置打健康检查
npm run pm2:logs      # 远端日志（其余 pm2:start/stop/restart 同理）
# 手动在服务器上重启：cd <REMOTE_APP_DIR> && bash remote-restart.sh
```

## nginx 配置要点（`deploy/nginx/docz.hengheng.online.conf`）

- `/ws/` 反代：`proxy_pass http://127.0.0.1:8101/;` 尾斜杠剥前缀（后端收到 `/<room>`）；`proxy_read_timeout 86400s` 撑长连接。
- `/upload` 单独 `client_max_body_size 6m`（后端 multer 限 5MB，留余量）。
- `/`：`try_files $uri $uri.html $uri/ /index.html`，且 `no-cache`——文档不缓存，部署后立即生效。
- ⚠️ **已知遗留**：`location /_next/static/` 的 immutable 长缓存规则是 Next.js 时代产物；v3（Vite）的带 hash 产物在 `/assets/`，目前被 `/` 的 no-cache 覆盖（每次 revalidate，不影响正确性，略损缓存效率）。下次部署宜改为 `location /assets/`。

## Docker all-in-one（备选，未上生产）

`Dockerfile`/`docker-compose.yml`：单镜像内起 server + 托管前端（`STATIC_DIR=/app/public`），
适合无 1Panel/nginx 的裸机直跑。主线部署不走它。

## 安全边界（如实）

- 房间码即凭据，服务端无鉴权、无限速；CORS 全开（直连客户端需要）。
- 全链路明文 http/ws（v1 直连场景无证书）——**仅内网/受信环境使用**，公网需自行加 TLS 反代。
- 上传仅图片类型 + 5MB 上限；uploads 目录随部署保留（不在覆盖范围）。

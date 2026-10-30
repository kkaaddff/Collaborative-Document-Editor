# 自托管指南(部署与运维)

## 拓扑

```text
browser/app --> http(s)://<host>:9091 (或经反代 https://docs.example.com)
                 |
                 |  可选: nginx/caddy TLS 反代(WebSocket 升级头)
                 v
+---------------------------------------------------------+
| Docker: polyphony (all-in-one)                          |
| server/index.js  express + ws + y-websocket CRDT relay  |
| POST /upload multer <=5MB   GET /health room stats      |
| STATIC_DIR=/app/public 静态托管 + SPA fallback(同源)      |
| port 9091  ·  volume polyphony-uploads                  |
+---------------------------------------------------------+
```

- **单容器即全功能**:同一端口提供 Web 前端 + 协同 WS + 图片上传;`docker compose up -d --build` 一条命令。
- **同源是刻意设计**:Web 端 `location.origin` 兜底天然指向协同服务;也适配随机四级域名反代场景。
- 上传图片在具名卷 `polyphony-uploads`,容器重建不丢。
- 房间状态在服务端内存,容器重建即清空;客户端从 IndexedDB 自动重同步(**所有客户端都关闭的房间在重启后为空**——服务端持久化见 decisions.md 路线条目)。

## 快速部署

```bash
git clone https://github.com/kkaaddff/polyphony.git && cd polyphony
docker compose up -d          # 首次会构建镜像(node:22-alpine 双阶段)
curl http://127.0.0.1:9091/health
```

自定义端口:改 `docker-compose.yml` 的 `ports`(如 `"8080:9091"`)。

## HTTPS 反代要点

`/ws` 是长连接 WebSocket,升级头不可少;上传走 5MB 限制,body 大小留余量:

```nginx
location / {
    proxy_pass http://127.0.0.1:9091;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400s;      # 撑住协同长连接
    client_max_body_size 6m;
}
```

## 自动化部署(自建 Gitea CI 参考)

仓库内 [`.gitea/workflows/deploy.yml`](../.gitea/workflows/deploy.yml) 是自托管 Gitea Actions 的完整参考(在生产环境的自建 runner 上运行):

- push `main` → 自动 `docker compose build` + 原地换容器(构建期间旧容器照常服务);
- 纯文档推送不触发(不打扰在线用户);连续推送自动取消旧任务;
- 镜像双标签(`polyphony:<git-sha>` / `:latest`),验证失败自动回滚上一版本;
- 部署后 `GET /health` + 双客户端 CRDT 收敛冒烟(`docker exec` 容器内自环验证)。

手动回滚(任一方式):

```bash
docker tag polyphony:<某历史sha12> polyphony:latest && docker compose up -d --force-recreate
docker tag polyphony:rollback polyphony:latest && docker compose up -d --force-recreate  # 最近一版
```

## 常用运维

```bash
docker compose ps / logs -f           # 状态与日志
docker compose up -d --build          # 手动更新部署
docker compose down                   # 停止(数据卷保留)
docker volume inspect polyphony_polyphony-uploads   # 上传图片实际位置
```

## 历史说明(v3.0 及之前)

v3.0 曾用「PM2 + OpenResty 静态站点 + tar over ssh」链路部署(`deploy/` 目录,已删除,
git 历史可寻)。v3.1 起自托管统一走 Docker all-in-one;该链路的经验(nginx 前缀剥除、
`openresty -t` 校验回滚、em-dash 路径坑)记录于 decisions.md 坑清单。

## 安全边界(如实)

- 房间码即凭据,服务端无鉴权、无限速;CORS 全开(直连客户端需要)。
- 明文 http/ws 直连仅适合内网/受信环境;公网使用请套 TLS 反代。
- 上传仅图片类型 + 5MB 上限;`/health` 会展示房间码与在线人数,介意暴露请在反代层屏蔽。

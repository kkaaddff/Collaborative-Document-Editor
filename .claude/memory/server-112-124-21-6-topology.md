---
name: server-112-124-21-6-topology
description: 112.124.21.6 并非空服务器：1Panel+OpenResty(host 网络)占用 80 端口跑多个活站点，不可另装系统 nginx
metadata:
  type: project
  origin: agent memory 2026-09-11（session dda29dfc），2026-10-29 内化入库
---

用户曾以为 112.124.21.6 是空服务器（2026-09-11 部署 docz 时说「啥也没有，nginx 需要你安装」），实际该机已运行 1Panel(8090) + OpenResty 容器 `1Panel-openresty-qgS1`（**host 网络模式**，占用 80/443/8100/8007-8009/5173），80 端口上按 server_name 挂着 www.hengheng.online、bitwarden、cookiecloud 等活站点；node18(nvm)+pm2 也在，coordination-ws(:8101) 常驻。

**Why:** 另装系统 nginx 必然与 openresty 端口冲突，且会连累这些线上站点；host 网络下 openresty 即 nginx，proxy_pass 可直接用 127.0.0.1。

**How to apply:** 在该机加站点 = 在 `deploy/nginx/` 新增 conf（listen 80 + server_name），由 `deploy/remote-restart.sh` 覆盖到 `/opt/1panel/apps/openresty/openresty/conf/conf.d/` 后容器内 reload；静态文件放 `.../www/sites/<站点>/index`（整目录 `/opt/.../www` bind-mount 为容器 `/www`）。改 nginx 后的健康检查要等 reload 完全接管（部署脚本里曾因太快 404，稍后重试即 200）。

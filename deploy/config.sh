#!/usr/bin/env bash
# =============================================================================
# 部署配置 —— 唯一真源。
# 被 deploy.sh(本地) 与 remote-restart.sh(远端) 共同 source。
# 修改这里 = 修改所有部署行为。
# =============================================================================

# SSH 连接串 (应用服务器：WS 服务 + 静态前端所在主机)
APP_SSH="root@112.124.21.6"

# 远端项目目录 (PM2 进程 cwd，server/index.js 的家)
# 注意：路径里有一个 em-dash(—)，引用时务必加双引号
REMOTE_APP_DIR="/home/coordinationv2/coordination—v2"

# 静态前端宿主机目录
# 1Panel 的 OpenResty 站点 index，rsync 的目标 (容器内映射为 /www/sites/coordination/index)
STATIC_DIR="/opt/1panel/apps/openresty/openresty/www/sites/coordination/index"

# nginx 站点配置的宿主机路径
# bind-mount 进 openresty 容器的 conf.d/，覆盖即生效
NGINX_CONF_DST="/opt/1panel/apps/openresty/openresty/conf/conf.d/coordination.conf"

# 前端公网访问地址 (健康检查用)
PUBLIC_WEB_URL="http://www.hengheng.online:8100"

# 协同 WebSocket 公网地址 (前端构建时以 NEXT_PUBLIC_WS_URL 内联进静态产物)
WS_PUBLIC_URL="http://www.hengheng.online:8101"

# WS 服务监听端口 (ecosystem.config.js 亦注入此 PORT；反代 8101 转发到此端口)
WS_PORT=8101

# PM2 进程名
PM2_APP_NAME="coordination-ws"

# 探测本机 openresty 容器名 (1Panel 通常单实例)
detect_openresty_container() {
  docker ps --format '{{.Names}}' 2>/dev/null \
    | grep -iE 'openresty|nginx' | head -1
}

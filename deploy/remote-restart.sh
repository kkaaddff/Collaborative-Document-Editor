#!/usr/bin/env bash
# =============================================================================
# 在应用服务器上执行（由 deploy.sh 通过 ssh 调用；亦可手动）：
#   安装 WS 依赖 → 重启 PM2 → 覆盖并 reload nginx → 健康检查
#   手动用法: cd <REMOTE_APP_DIR> && bash remote-restart.sh
# =============================================================================
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"
# shellcheck source=config.sh
source ./config.sh

log() { printf '\033[1;34m▶\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

mkdir -p "$HERE/logs"

# ---- 1. WS 服务依赖 ----
log "安装 WS 服务依赖 (server/ npm ci --omit=dev)"
( cd "$HERE/server" && npm ci --omit=dev )
ok "依赖就绪"

# ---- 2. PM2 (从项目根启动，使 ecosystem 里 script:./server/index.js 解析正确) ----
log "PM2 startOrReload $PM2_APP_NAME"
pm2 startOrReload ecosystem.config.js
sleep 1
pm2 list | grep -q "$PM2_APP_NAME" || die "PM2 中找不到 $PM2_APP_NAME"
ok "PM2 已就绪"
pm2 list | sed -n '1,5p'

# ---- 3. nginx 站点配置覆盖 + 校验 + reload (失败自动回滚) ----
log "覆盖 nginx 配置: $NGINX_CONF_DST"
[ -f "$HERE/coordination.conf" ] || die "缺少 coordination.conf"
BACKUP="$NGINX_CONF_DST.bak.$(date +%s)"
cp -a "$NGINX_CONF_DST" "$BACKUP" 2>/dev/null || true
cp -f "$HERE/coordination.conf" "$NGINX_CONF_DST"

CID="$(detect_openresty_container)"
if [ -z "$CID" ]; then
  [ -f "$BACKUP" ] && cp -f "$BACKUP" "$NGINX_CONF_DST"
  die "未探测到 openresty 容器 (docker ps 无 openresty/nginx)，已回滚"
fi

log "openresty -t (容器 $CID)"
if docker exec "$CID" openresty -t 2>&1; then
  docker exec "$CID" openresty -s reload
  ok "nginx 已 reload"
else
  [ -f "$BACKUP" ] && cp -f "$BACKUP" "$NGINX_CONF_DST"
  die "openresty -t 失败，已回滚配置，未 reload"
fi

# ---- 4. 健康检查 ----
log "健康检查"
curl -sS -o /dev/null -w "  WEB  %{http_code}  ${PUBLIC_WEB_URL}/editor?code=healthcheck\n" \
  "${PUBLIC_WEB_URL}/editor?code=healthcheck&name=deploy" || die "前端不可达"
curl -sS -w "  WS   %{http_code}  ${WS_PUBLIC_URL}/health\n" \
  "${WS_PUBLIC_URL}/health" || true

ok "服务端重启完成"

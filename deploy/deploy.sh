#!/usr/bin/env bash
# =============================================================================
# 一键部署：本地构建 → tar/scp 上传 → 远端重启 nginx + pm2
#   用法: bash deploy/deploy.sh
# 上传不依赖远端 rsync —— 静态与服务端代码用 tar over ssh，零散文件用 scp。
# 流程详见 README「部署」章节。
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

# ---- 日志 ----
log() { printf '\033[1;34m▶\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# ---- 1. 预检 ----
log "预检本地工具"
command -v node >/dev/null || die "缺少 node"
command -v npm  >/dev/null || die "缺少 npm"
command -v tar  >/dev/null || die "缺少 tar"
command -v scp  >/dev/null || die "缺少 scp"
command -v ssh  >/dev/null || die "缺少 ssh"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "需要 node >= 18，当前 $(node -v)"
ok "node $(node -v) / npm $(npm -v)"

# ---- 2. 写入构建期环境变量 (不污染本地 dev 的 .env.local) ----
# Next 构建 (NODE_ENV=production) 优先级: .env.production.local > .env.local
log "写入 .env.production.local (NEXT_PUBLIC_WS_URL=$WS_PUBLIC_URL)"
printf 'NEXT_PUBLIC_WS_URL=%s\n' "$WS_PUBLIC_URL" > "$PROJECT_DIR/.env.production.local"

# ---- 3. 本地构建 ----
log "安装前端依赖 (npm ci, 走项目 .npmrc 淘宝源)"
( cd "$PROJECT_DIR" && npm ci )
log "构建静态产物 (next build → out/)"
( cd "$PROJECT_DIR" && npm run build )
[ -d "$PROJECT_DIR/out" ] || die "构建未生成 out/"
ok "out/ 已生成 ($(find "$PROJECT_DIR/out" -type f | wc -l | tr -d ' ') 个文件)"

# ---- 4. 上传静态前端 (先清空目标，再 tar 解包；纯构建产物无运行时状态) ----
log "上传静态前端 → $APP_SSH:$STATIC_DIR (先清空)"
ssh "$APP_SSH" "mkdir -p '$STATIC_DIR' && find '$STATIC_DIR' -mindepth 1 -delete"
tar czf - -C "$PROJECT_DIR/out" . | ssh "$APP_SSH" "tar xzf - --no-same-owner -C '$STATIC_DIR'"
ok "静态前端已同步"

# ---- 5. 上传服务端代码 (保留远端 uploads / node_modules) ----
log "上传 server/ → $APP_SSH:$REMOTE_APP_DIR/server (排除 node_modules/uploads)"
ssh "$APP_SSH" "mkdir -p '$REMOTE_APP_DIR/server'"
tar czf - -C "$PROJECT_DIR/server" --exclude node_modules --exclude uploads . \
  | ssh "$APP_SSH" "tar xzf - --no-same-owner -C '$REMOTE_APP_DIR/server'"

log "上传 ecosystem.config.js + deploy 脚本 + nginx 配置 + .npmrc (scp)"
scp -q \
  "$PROJECT_DIR/ecosystem.config.js" \
  "$PROJECT_DIR/.npmrc" \
  "$SCRIPT_DIR/config.sh" \
  "$SCRIPT_DIR/remote-restart.sh" \
  "$APP_SSH:$REMOTE_APP_DIR/"
scp -q "$SCRIPT_DIR/nginx/coordination.conf" "$APP_SSH:$REMOTE_APP_DIR/coordination.conf"
ok "服务端文件已上传"

# ---- 6. 远端重启 ----
log "远端执行 remote-restart.sh"
ssh "$APP_SSH" "cd '$REMOTE_APP_DIR' && bash remote-restart.sh"

ok "部署完成 🎉  前端: $PUBLIC_WEB_URL   WS: $WS_PUBLIC_URL"

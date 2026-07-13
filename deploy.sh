#!/usr/bin/env bash
# 兼容入口：转发到 deploy/deploy.sh
# 一键部署：本地构建 → rsync 上传 → 远端重启 nginx + pm2
exec bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/deploy/deploy.sh" "$@"

# =============================================================================
# coordination-v2 all-in-one 镜像
#   前端: Next.js 静态导出  → 由 express 托管
#   后端: express + y-websocket (协同 WS / 图片上传 / health)
# 单容器单端口(9091)，前后端同源 —— 适配 fnos connect 随机四级域名反代
# =============================================================================

# ---- 阶段 1: 构建前端静态产物 ----
FROM node:20-alpine AS frontend
WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY app ./app
COPY lib ./lib
COPY types ./types
COPY public ./public
COPY next.config.ts tsconfig.json postcss.config.mjs next-env.d.ts ./
RUN NEXT_TELEMETRY_DISABLED=1 npm run build

# ---- 阶段 2: 安装服务端生产依赖 ----
FROM node:20-alpine AS server-deps
WORKDIR /build/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ---- 阶段 3: 运行时 ----
FROM node:20-alpine
ENV NODE_ENV=production \
    PORT=9091 \
    STATIC_DIR=/app/public

WORKDIR /app

COPY --from=server-deps /build/server/node_modules ./server/node_modules
COPY server/index.js ./server/index.js
COPY --from=frontend /build/out ./public

# 上传目录（运行时挂载卷持久化）
RUN mkdir -p /app/server/uploads && chown -R node:node /app
USER node
VOLUME ["/app/server/uploads"]

EXPOSE 9091

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:9091/health >/dev/null || exit 1

CMD ["node", "server/index.js"]

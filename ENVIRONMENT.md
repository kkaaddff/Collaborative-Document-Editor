# 环境配置说明

## 环境变量配置

项目需要配置环境变量才能正常运行。请按照以下步骤设置。

### 开发环境

在项目根目录创建 `.env.local` 文件：

```bash
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

或使用命令创建：

```bash
echo "NEXT_PUBLIC_WS_URL=http://localhost:3001" > .env.local
```

### 生产环境

在生产服务器上创建 `.env.local` 文件，并修改为实际的服务器地址：

```bash
# 替换为你的服务器 IP 或域名
NEXT_PUBLIC_WS_URL=http://your-server-ip:3001
```

如果使用域名和反向代理：

```bash
NEXT_PUBLIC_WS_URL=https://your-domain.com
```

### 服务器端环境变量（可选）

在 `server/` 目录下可以创建 `.env` 文件：

```bash
PORT=3001
CLIENT_URL=http://localhost:3000
NODE_ENV=production
```

## 配置说明

### NEXT_PUBLIC_WS_URL

- **必需**: 是
- **类型**: String
- **说明**: WebSocket 服务器的完整 URL
- **默认值**: `http://localhost:3001`
- **示例**:
  - 开发: `http://localhost:3001`
  - 生产（IP）: `http://192.168.1.100:3001`
  - 生产（域名）: `https://api.example.com`

**注意事项**:
- 必须包含协议（http:// 或 https://）
- 必须在客户端可访问
- 如果使用 HTTPS，需要配置 SSL 证书
- 如果通过反向代理使用路径前缀（例如 `/collab`），请在 URL 中加入该前缀，例如 `https://your-domain.com/collab`
- 该变量以 `NEXT_PUBLIC_` 开头，会暴露给客户端

### PORT（服务器端）

- **必需**: 否
- **类型**: Number
- **说明**: WebSocket 服务器监听端口
- **默认值**: `3001`

### CLIENT_URL（服务器端）

- **必需**: 否
- **类型**: String
- **说明**: 允许的客户端源（CORS）
- **默认值**: `http://localhost:3000`
- **示例**: `http://example.com,http://www.example.com`

## 验证配置

### 1. 检查文件是否存在

```bash
ls -la .env.local
```

### 2. 查看配置内容

```bash
cat .env.local
```

### 3. 测试连接

启动服务后运行：

```bash
npm run health
```

## 常见问题

### Q: .env.local 文件应该提交到 Git 吗？

**A**: 不应该。`.env.local` 已在 `.gitignore` 中，不会被提交。每个环境都应该有自己的配置。

### Q: 修改环境变量后需要重启吗？

**A**: 是的。修改 `.env.local` 后需要重启 Next.js 开发服务器（Ctrl+C 后重新运行 `npm run dev`）。

### Q: 如何在多个环境使用不同配置？

**A**: 
- 开发: `.env.local`
- 测试: `.env.test.local`
- 生产: 在服务器上直接设置环境变量或使用 `.env.production.local`

### Q: 前端一直显示"未连接"？

**A**: 
1. 检查 `.env.local` 中的 `NEXT_PUBLIC_WS_URL` 是否正确
2. 确认 WebSocket 服务器已启动
3. 检查防火墙是否阻止了连接
4. 使用 `npm run health` 测试服务器状态

### Q: 如何在 Docker 中配置？

**A**: 
在 `docker-compose.yml` 中设置：

```yaml
services:
  web:
    environment:
      - NEXT_PUBLIC_WS_URL=http://ws:3001
  ws:
    environment:
      - PORT=3001
      - CLIENT_URL=http://web:3000
```

## 安全建议

1. **不要硬编码敏感信息**: 使用环境变量而不是在代码中写死
2. **不要提交 .env 文件**: 确保 `.gitignore` 包含 `.env*`
3. **生产环境使用 HTTPS**: 保护 WebSocket 连接安全
4. **限制 CORS 源**: 在生产环境设置正确的 `CLIENT_URL`
5. **使用强密钥**: 如果添加了认证功能，使用强密钥

## 示例配置

### 本地开发

```bash
# .env.local
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### 局域网测试

```bash
# .env.local
NEXT_PUBLIC_WS_URL=http://192.168.1.100:3001
```

### 生产环境（自有服务器）

```bash
# .env.local
NEXT_PUBLIC_WS_URL=http://your-domain.com:3001
```

### 生产环境（使用 Nginx 反向代理）

```bash
# .env.local
NEXT_PUBLIC_WS_URL=https://your-domain.com
```

对应的 Nginx 配置（示例以 `/collab/` 为前缀）：

```nginx
location /collab/ {
    proxy_pass http://localhost:3001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

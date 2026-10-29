// 运行时服务器地址解析（CS 直连的核心）。
// 优先级：URL 参数 ?server=（扫码/分享链接进入）> 本机已保存配置（设置页/扫码写入）
//        > 环境变量 VITE_SERVER_URL（仅 dev）> Web 同源 location.origin（反代部署）。
// Tauri 侧持久化后续接 plugin-store（platform/store 适配器），Web 侧 localStorage。

const SERVER_KEY = "coordination.server";

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function getSavedServer(): string {
  try {
    return window.localStorage.getItem(SERVER_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveServer(url: string): string {
  const normalized = normalize(url);
  try {
    if (normalized) {
      window.localStorage.setItem(SERVER_KEY, normalized);
    } else {
      window.localStorage.removeItem(SERVER_KEY);
    }
  } catch {
    /* 忽略写入失败（隐私模式等） */
  }
  return normalized;
}

export function getServerBase(): string {
  // 1. URL 参数（扫码进入时 ?server= 直连地址）
  const fromUrl = new URLSearchParams(window.location.search).get("server");
  if (fromUrl) return normalize(fromUrl);
  // 2. 已保存配置
  const saved = getSavedServer();
  if (saved) return saved;
  // 3. dev 环境变量
  const env = import.meta.env.VITE_SERVER_URL;
  if (env) return normalize(env);
  // 4. Web 同源（nginx/OpenResty 反代同源部署）
  return window.location.origin;
}

/** 是否已配置显式服务器（用于 App/Web 首页引导提示）。 */
export function hasExplicitServer(): boolean {
  return !!(getSavedServer() || import.meta.env.VITE_SERVER_URL);
}

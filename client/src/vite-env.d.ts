/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** dev 时的服务器地址（见 .env.example）；运行时配置优先级见 lib/serverConfig.ts */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

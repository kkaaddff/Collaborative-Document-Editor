// 本地 UI/E2E 测试配置 —— 只在本地跑，绝不接入 CI（.github/workflows 不引用 e2e/）。
// 复用系统 Chrome（channel），无需 playwright install 下载浏览器；
// webServer 自动拉起协同服务(:3001) 与 Vite dev(:5173)，已起则复用。
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 6_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 4,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    channel: "chrome", // 系统 Chrome，免下载
    headless: true,
    permissions: ["clipboard-read", "clipboard-write"], // 房间码复制
    launchOptions: {
      // 假摄像头设备 + 自动授权：ScanModal 取景 UI 可测（假流无 QR 内容，解码路径由单测覆盖）
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node index.js",
      cwd: "../server",
      url: "http://localhost:3001/health",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run dev",
      cwd: "../client",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});

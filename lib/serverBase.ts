// 客户端服务地址解析：环境变量优先，否则回退当前页面同源地址。
// 同源默认适配 fnos connect 等随机四级域名反代——构建期无法内联地址，
// 运行时取 window.location.origin，https/wss 由浏览器与 y-websocket 自动推导。
// 仅在客户端调用（回调/事件内），不做 SSR 守卫。

export function getServerBase(): string {
  return process.env.NEXT_PUBLIC_WS_URL || window.location.origin;
}

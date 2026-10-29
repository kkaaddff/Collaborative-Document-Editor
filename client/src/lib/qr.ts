// 二维码载荷：统一编成 Web URL，任何手机系统相机都能扫码进 Web 版兜底，
// App 内扫码则解析出 code+server 走直连。
// 形如：<server>/join?code=<房间码>&server=<直连地址>
import QRCode from "qrcode";

export function buildJoinUrl(serverBase: string, code: string): string {
  const u = new URL("/join", serverBase);
  u.searchParams.set("code", code.toUpperCase());
  u.searchParams.set("server", serverBase);
  return u.toString();
}

/** 渲染到 canvas（240px，M 级纠错——内网 URL 约 100 字符足够）。 */
export function renderQr(canvas: HTMLCanvasElement, text: string): Promise<void> {
  return QRCode.toCanvas(canvas, text, {
    width: 240,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}

/** 解析扫码结果：完整 join URL 或裸房间码；不是则返回 null。 */
export function parseJoinPayload(
  text: string
): { code: string; server?: string } | null {
  const trimmed = text.trim();
  if (/^[A-Z0-9]{8}$/i.test(trimmed)) return { code: trimmed.toUpperCase() };
  try {
    const u = new URL(trimmed);
    const code = u.searchParams.get("code");
    if (!code) return null;
    return {
      code: code.toUpperCase(),
      server: u.searchParams.get("server") || undefined,
    };
  } catch {
    return null;
  }
}

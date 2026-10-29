// 房间码与相对时间纯函数（首页/列表共用小工具）。

const ROOM_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ROOM_CODE_LENGTH = 8;

/** 生成 8 位随机房间码（大写字母 + 数字）。 */
export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS.charAt(
      Math.floor(Math.random() * ROOM_CODE_CHARS.length)
    );
  }
  return code;
}

/** 相对时间格式化（中文，简版）。 */
export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  return `${Math.floor(hr / 24)} 天前`;
}

// 用户信息
export interface User {
  id: string;
  name: string;
  cursorPosition: number;
  color?: string;
}

// 本地「最近房间」记录（localStorage 快照）
export interface RecentRoom {
  code: string; // 不可变加入钥匙
  name: string; // 最近一次同步到的共享名快照（可能为 ""）
  lastUsed: number; // 时间戳，用于排序
}

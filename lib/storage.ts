"use client";

// 纯客户端 localStorage 工具：用户名持久化 + 最近房间列表。
// 所有读写都带 SSR 守卫与 try/catch 降级（隐私模式 / 解析失败不致崩溃）。

import { useEffect, useState } from "react";
import type { RecentRoom } from "@/types";

const USERNAME_KEY = "coordination.username";
const RECENT_ROOMS_KEY = "coordination.recentRooms";
const MAX_RECENT_ROOMS = 20;

// ---------- 用户名 ----------

export function getUserName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(USERNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setUserName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USERNAME_KEY, name);
  } catch {
    /* 忽略写入失败（隐私模式等） */
  }
}

// ---------- 最近房间 ----------

export function getRecentRooms(): RecentRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_ROOMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RecentRoom =>
          r && typeof r.code === "string" && typeof r.name === "string"
      )
      .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0));
  } catch {
    return [];
  }
}

function saveRecentRooms(rooms: RecentRoom[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RECENT_ROOMS_KEY,
      JSON.stringify(rooms.slice(0, MAX_RECENT_ROOMS))
    );
  } catch {
    /* 忽略 */
  }
}

/** 新增或更新一条最近房间（按 code 去重，刷新 name 与 lastUsed）。 */
export function upsertRecentRoom(entry: { code: string; name: string }): void {
  if (typeof window === "undefined") return;
  if (!entry.code) return;
  const rooms = getRecentRooms().filter((r) => r.code !== entry.code);
  rooms.unshift({
    code: entry.code,
    name: entry.name,
    lastUsed: Date.now(),
  });
  saveRecentRooms(rooms);
}

export function removeRecentRoom(code: string): void {
  if (typeof window === "undefined") return;
  saveRecentRooms(getRecentRooms().filter((r) => r.code !== code));
}

// ---------- 通用 hook ----------

/**
 * 与 localStorage 同步的 state。SSR 安全：首渲染返回 initial，
 * mount 后再读取真实值，避免静态导出 hydration mismatch。
 * 可选跨标签页同步（监听 storage 事件）。
 */
export function useLocalStorageState<T>(
  key: string,
  initial: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  // mount 后读
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      /* 忽略 */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // 写
  const update = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        /* 忽略 */
      }
      return resolved;
    });
  };

  // 跨标签页同步
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return;
      try {
        setValue(JSON.parse(e.newValue) as T);
      } catch {
        /* 忽略 */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  return [value, update, hydrated];
}

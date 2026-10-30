// 共用工具：localStorage 预置、alert 捕获。
// 注意 username 的存储格式：Home 走 useLocalStorageState（JSON.stringify），
// recentRooms 为对象数组 —— 预置必须与真实写入格式一致。
export const USERNAME_KEY = "polyphony.username";
export const RECENT_ROOMS_KEY = "polyphony.recentRooms";
export const SERVER_KEY = "polyphony.server";
export const LOCALE_KEY = "polyphony.locale";

type RecentRoomSeed = { code: string; name: string; lastUsed?: number };

export async function seedStorage(
  page: import("@playwright/test").Page,
  opts: {
    username?: string;
    recentRooms?: RecentRoomSeed[];
    server?: string;
    locale?: string;
  }
) {
  await page.addInitScript((args) => {
    const { username, recentRooms, server, locale, keys } = args;
    if (username !== undefined)
      localStorage.setItem(keys.username, JSON.stringify(username));
    if (recentRooms !== undefined)
      localStorage.setItem(
        keys.recentRooms,
        JSON.stringify(
          recentRooms.map((r) => ({
            code: r.code,
            name: r.name,
            lastUsed: r.lastUsed ?? Date.now(),
          }))
        )
      );
    if (server !== undefined) localStorage.setItem(keys.server, server);
    // locale 与 username 同走 useLocalStorageState(JSON.stringify 格式),裸写会解析失败回落 auto
    if (locale !== undefined)
      localStorage.setItem(keys.locale, JSON.stringify(locale));
  }, {
    username: opts.username,
    recentRooms: opts.recentRooms,
    server: opts.server,
    locale: opts.locale,
    keys: {
      username: USERNAME_KEY,
      recentRooms: RECENT_ROOMS_KEY,
      server: SERVER_KEY,
      locale: LOCALE_KEY,
    },
  });
}

/** 捕获原生 alert/confirm 的文案（自动 accept）。 */
export function captureDialogs(page: import("@playwright/test").Page) {
  const messages: string[] = [];
  page.on("dialog", (d) => {
    messages.push(d.message());
    void d.accept();
  });
  return messages;
}

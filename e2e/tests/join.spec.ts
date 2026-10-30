// /join 扫码落地页：server 固化、有/无用户名分流、缺参回退。
import { expect, test } from "@playwright/test";
import { seedStorage } from "./helpers";

test.describe("/join 分流", () => {
  test("已有用户名：固化 server 后直进编辑器（用户名不能带 JSON 引号）", async ({ page }) => {
    await seedStorage(page, { username: "张三" });
    await page.goto("/join?code=abcd1234&server=http%3A%2F%2Flocalhost%3A3001");
    await expect(page).toHaveURL(/\/editor\?code=ABCD1234&name=%E5%BC%A0%E4%B8%89$/);
    const saved = await page.evaluate(() => localStorage.getItem("polyphony.server"));
    expect(saved).toBe("http://localhost:3001");
  });

  test("无用户名：回首页预填房间码", async ({ page }) => {
    await page.goto("/join?code=abcd1234&server=http%3A%2F%2Flocalhost%3A3001");
    await expect(page).toHaveURL(/\/\?join=ABCD1234$/);
    await expect(page.locator("#roomCode")).toHaveValue("ABCD1234");
  });

  test("无房间码：回首页", async ({ page }) => {
    await page.goto("/join");
    await expect(page).toHaveURL("/");
  });

  test("server 缺省时不覆盖已存配置", async ({ page }) => {
    await seedStorage(page, { username: "张三", server: "http://localhost:3001" });
    await page.goto("/join?code=EFGH5678");
    await expect(page).toHaveURL(/\/editor\?code=EFGH5678/);
    const saved = await page.evaluate(() => localStorage.getItem("polyphony.server"));
    expect(saved).toBe("http://localhost:3001");
  });

  test("落地后用户名在编辑器顶栏正确显示（回归：曾带引号）", async ({ page, context }) => {
    await seedStorage(page, { username: "张三" });
    await page.goto("/join?code=abcd1234");
    await expect(page).toHaveURL(/\/editor\?code=ABCD1234/);
    await expect(page.getByText("在线用户 (1)")).toBeVisible({ timeout: 15_000 });
    // UsersPanel 内不应出现带引号的用户名
    await expect(page.locator("p", { hasText: '“张三”' })).toHaveCount(0);
    await expect(page.locator("p", { hasText: '"张三"' })).toHaveCount(0);
  });
});

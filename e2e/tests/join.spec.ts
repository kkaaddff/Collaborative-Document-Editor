// /join 扫码落地页:无 token 带 next 去引导;有 token 取账号名直进编辑器。
import { expect, test } from "@playwright/test";
import { loginTestAccount } from "./helpers";

test.describe("/join 分流", () => {
  test("无 token:重定向 /welcome 并保留 next=落地地址", async ({ page }) => {
    await page.goto("/join?code=abcd1234&server=http%3A%2F%2Flocalhost%3A3001");
    await expect(page).toHaveURL(/\/welcome\?next=%2Fjoin%3Fcode%3DABCD1234/);
  });

  test("有 token:账号名直进编辑器", async ({ page }) => {
    const acc = await loginTestAccount(page);
    await page.goto("/join?code=abcd1234&server=http%3A%2F%2Flocalhost%3A3001");
    await expect(page).toHaveURL(
      new RegExp(`/editor\\?code=ABCD1234&name=${encodeURIComponent(acc.name)}$`)
    );
    // server 参数已固化
    const saved = await page.evaluate(() => localStorage.getItem("polyphony.server"));
    expect(saved).toBe("http://localhost:3001");
  });

  test("无房间码:登录态回首页", async ({ page }) => {
    await loginTestAccount(page);
    await page.goto("/join");
    await expect(page).toHaveURL("/");
  });

  test("超长码截断到 8 位:?join 预填与手输进同一房间(回归)", async ({ page }) => {
    await loginTestAccount(page);
    // ?join= 传 10 位码 → 预填应截断为 8 位进入
    await page.goto("/?join=ABCDEFGHIJ");
    await expect(page.locator("#roomCode")).toHaveValue("ABCDEFGH");
    await page.getByRole("button", { name: "加入文档" }).click();
    await expect(page).toHaveURL(/\/editor\?code=ABCDEFGH/);

    // /join 直达路径同样截断
    await page.goto("/join?code=KLMNOPQRST");
    await expect(page).toHaveURL(/\/editor\?code=KLMNOPQR/);
  });
});

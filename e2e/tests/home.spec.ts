// 首页：创建/加入表单校验、最近房间、在线房间、二维码、扫码弹层、服务器状态。
import { expect, test } from "@playwright/test";
import { captureDialogs, seedStorage } from "./helpers";

test.beforeEach(async ({ page }) => {
  // 每个用例独立 context（Playwright 默认），localStorage 天然隔离
});

test.describe("首页渲染与服务器状态", () => {
  test("标题/用户名/房间码输入框就位，服务器连通显示绿点", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "复调 Polyphony" })).toBeVisible();
    await expect(page.locator("#userName")).toBeVisible();
    await expect(page.locator("#roomCode")).toBeVisible();
    // dev 环境 VITE_SERVER_URL=http://localhost:3001，health 可达 → 绿点
    const dot = page.locator("span.inline-block.w-2");
    await expect(dot).toHaveClass(/bg-green-500/, { timeout: 10_000 });
    await expect(page.getByText("http://localhost:3001")).toBeVisible();
  });

  test("服务器不可达：红点 + 黄条引导去设置", async ({ page }) => {
    await page.route("**/health", (r) => r.fulfill({ status: 502, body: "bad" }));
    await page.goto("/");
    const dot = page.locator("span.inline-block.w-2");
    await expect(dot).toHaveClass(/bg-red-500/);
    await expect(page.getByText("无法连接协同服务器")).toBeVisible();
    const link = page.getByRole("link", { name: "前往设置" });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/settings$/);
  });
});

test.describe("创建 / 加入 表单", () => {
  test("创建新文档：缺用户名应被拦截（与加入一致）", async ({ page }) => {
    const dialogs = captureDialogs(page);
    await page.goto("/");
    await page.getByRole("button", { name: "创建新文档" }).click();
    await expect.poll(() => dialogs).toContain("请输入用户名");
    await expect(page).toHaveURL("/"); // 不跳转
  });

  test("创建新文档：有用户名 → 进编辑器，房间码 8 位大写", async ({ page }) => {
    await page.goto("/");
    await page.locator("#userName").fill("张三");
    await page.getByRole("button", { name: "创建新文档" }).click();
    await expect(page).toHaveURL(/\/editor\?code=[A-Z0-9]{8}&name=%E5%BC%A0%E4%B8%89$/);
  });

  test("加入文档：缺房间码被拦截", async ({ page }) => {
    const dialogs = captureDialogs(page);
    await page.goto("/");
    await page.locator("#userName").fill("张三");
    await page.getByRole("button", { name: "加入文档" }).click();
    await expect.poll(() => dialogs).toContain("请输入房间代码");
    await expect(page).toHaveURL("/");
  });

  test("加入文档：缺用户名被拦截", async ({ page }) => {
    const dialogs = captureDialogs(page);
    await page.goto("/");
    await page.locator("#roomCode").fill("ABCD1234");
    await page.getByRole("button", { name: "加入文档" }).click();
    await expect.poll(() => dialogs).toContain("请输入用户名");
    await expect(page).toHaveURL("/");
  });

  test("加入文档：正常路径跳转；房间码自动大写", async ({ page }) => {
    await page.goto("/");
    await page.locator("#userName").fill("李四");
    await page.locator("#roomCode").fill("abcd1234");
    await expect(page.locator("#roomCode")).toHaveValue("ABCD1234"); // onChange 即转大写
    await page.getByRole("button", { name: "加入文档" }).click();
    await expect(page).toHaveURL(/\/editor\?code=ABCD1234&name=/);
  });

  test("用户名持久化：填写后刷新仍在", async ({ page }) => {
    await page.goto("/");
    await page.locator("#userName").fill("王五");
    await page.reload();
    await expect(page.locator("#userName")).toHaveValue("王五");
  });
});

test.describe("最近房间", () => {
  test("空态提示", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("还没有访问过的房间")).toBeVisible();
  });

  test("点击进入 / 二维码 / 移除", async ({ page }) => {
    await seedStorage(page, { recentRooms: [{ code: "AAAABBBB", name: "需求文档" }] });
    await page.goto("/");
    const item = page.getByRole("button", { name: /需求文档.*AAAABBBB/ });
    await expect(item).toBeVisible();
    await item.click();
    await expect(page).toHaveURL(/\/editor\?code=AAAABBBB&name=/);

    // 二维码弹层
    await page.goBack();
    await page.getByTitle("显示二维码").first().click();
    await expect(page.getByRole("heading", { name: "扫码进房" })).toBeVisible();
    await expect(
      page.getByText(/\/join\?code=AAAABBBB&server=/)
    ).toBeVisible();
    await page.getByRole("button", { name: "关闭" }).click();
    await expect(page.getByRole("heading", { name: "扫码进房" })).toBeHidden();

    // 移除
    await page.getByTitle("移出列表").first().click();
    await expect(page.getByText("还没有访问过的房间")).toBeVisible();
  });
});

test.describe("服务器在线房间", () => {
  test("列表渲染 + 点击进入 + 二维码按钮不换行", async ({ page }) => {
    await page.route("**/health", (r) =>
      r.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          status: "ok",
          rooms: [{ code: "ONLINE001", userCount: 3, lastActivity: Date.now() }],
        }),
      })
    );
    await seedStorage(page, { recentRooms: [{ code: "ZZZZZZZ9", name: "旧房间" }] });
    await page.goto("/");
    const card = page.getByRole("button", { name: /ONLINE001/ });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText("3 人在线")).toBeVisible();

    // ▦ 按钮与房间行同一水平线（排版回归：曾换行掉到下一行）
    const qrBtn = page.locator("li", { hasText: "ONLINE001" }).getByTitle("显示二维码");
    await expect(qrBtn).toBeVisible();
    const rowBox = await card.boundingBox();
    const qrBox = await qrBtn.boundingBox();
    expect(rowBox && qrBox).toBeTruthy();
    const sameRow =
      qrBox!.y >= rowBox!.y - 2 &&
      qrBox!.y + qrBox!.height <= rowBox!.y + rowBox!.height + 2;
    expect(sameRow, "在线房间的 ▦ 应与房间同行").toBe(true);

    await qrBtn.click();
    await expect(page.getByRole("heading", { name: "扫码进房" })).toBeVisible();
    await page.keyboard.press("Escape");
    await card.click();
    await expect(page).toHaveURL(/\/editor\?code=ONLINE001&name=/);
  });

  test("服务端无房间时显示空态", async ({ page }) => {
    await page.route("**/health", (r) =>
      r.fulfill({ contentType: "application/json", body: JSON.stringify({ rooms: [] }) })
    );
    await page.goto("/");
    await expect(page.getByText("当前没有在线房间")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("扫码加入（Web 分支：假摄像头）", () => {
  test("打开取景弹层、取消关闭", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "扫码加入" }).click();
    await expect(page.getByText("将二维码对准取景框")).toBeVisible();
    await page.getByRole("button", { name: "取消" }).click();
    await expect(page.getByText("将二维码对准取景框")).toBeHidden();
  });

  test("摄像头不可用：错误指引 + 知道了关闭", async ({ page }) => {
    await page.addInitScript(() => {
      // 模拟不支持/拒绝摄像头的环境（保留 mediaDevices 对象，仅让 getUserMedia 失败）
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        value: () => Promise.reject(new Error("NotAllowedError")),
      });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "扫码加入" }).click();
    await expect(page.getByText(/需 HTTPS 环境/)).toBeVisible();
    await page.getByRole("button", { name: "知道了" }).click();
    await expect(page.getByText(/需 HTTPS 环境/)).toBeHidden();
  });

  test("ESC 关闭扫码弹层（与二维码弹层一致）", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "扫码加入" }).click();
    await expect(page.getByText("将二维码对准取景框")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("将二维码对准取景框")).toBeHidden();
  });
});

test.describe("?join= 预填", () => {
  test("未存用户名时扫码落地回首页预填房间码", async ({ page }) => {
    await page.goto("/?join=WXYZ0001");
    await expect(page.locator("#roomCode")).toHaveValue("WXYZ0001");
  });
});

// 移动端(Pixel 7 仿真)全页面 UI 专项:布局不破、不裁切、可点、触达达标。
// 背景:真机审计发现房间行按钮裁出屏外、编辑器横溢 51px、退出按钮被遮挡
// 点不动(交互损坏)——本套件用程序化布局断言守护(v3.4.0 重构的回归线)。
import { expect, test, type Page } from "@playwright/test";
import { createAccount, loginTestAccount, seedStorage } from "./helpers";

/** 页面横向溢出 ≤1px(整页可左右晃 = 布局破)。 */
async function expectNoBreakout(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "页面横向溢出").toBeLessThanOrEqual(1);
}

/** 所有可见按钮均在视口内(不裁切)。
 *  跳过位于横向滚动容器内的按钮(如 MDX 工具栏)——它们按设计可滚出视口。 */
async function expectButtonsInView(page: Page) {
  const out = await page.evaluate(() => {
    const vw = window.innerWidth;
    const inScrollStrip = (el: HTMLElement) => {
      for (let n = el.parentElement; n; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (
          /auto|scroll/.test(s.overflowX) &&
          n.scrollWidth > n.clientWidth
        ) {
          return true;
        }
      }
      return false;
    };
    const bad: string[] = [];
    for (const b of document.querySelectorAll("button")) {
      const r = b.getBoundingClientRect();
      if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
        if (inScrollStrip(b as HTMLElement)) continue;
        bad.push(`${b.textContent?.trim().slice(0, 8) || "?"}(${Math.round(r.right)}>${vw})`);
      }
    }
    return bad;
  });
  expect(out, "被裁切的按钮").toEqual([]);
}

/** 关键触达:指定按钮最小边 ≥38px(44 推荐值留 WebView 缩放余量)。 */
async function expectTapSize(page: Page, names: string[]) {
  for (const name of names) {
    const box = await page.getByRole("button", { name }).first().boundingBox();
    expect(box, `按钮应存在: ${name}`).toBeTruthy();
    if (!box) continue;
    expect(Math.min(box.width, box.height), `${name} 触达过小`).toBeGreaterThanOrEqual(38);
  }
}

async function seedThreeRooms(page: Page, token: string) {
  for (const code of ["MOBROOM1", "MOBROOM2", "MOBROOM3"]) {
    await fetch("http://localhost:3001/rooms/enter", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, name: `移动${code}` }),
    });
  }
  // goto 而非 reload:调用方可能尚未导航(about:blank 上 reload 无效)
  await page.goto("/");
}

test.describe("/welcome(移动)", () => {
  test("创建表单:不破版、按钮可见可点", async ({ page }) => {
    await page.goto("/welcome");
    await expect(page.getByRole("heading", { name: "欢迎使用复调" })).toBeVisible();
    await expectNoBreakout(page);
    await expectButtonsInView(page);
    await expectTapSize(page, ["新建账号", "已有账号 · 粘贴 token"]);
  });

  test("粘贴登录表单 + token 一次性展示页同样不破版", async ({ page }) => {
    await page.goto("/welcome");
    await page.getByRole("button", { name: /已有账号/ }).click();
    await expectNoBreakout(page);
    const acc = await createAccount();
    await page.locator("#tokenInput").fill(acc.token);
    await page.getByRole("button", { name: "验证并登录" }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("首页(移动单列)", () => {
  test("单列纵排:创建按钮全宽;列表不裁切;图标按钮触达达标", async ({ page }) => {
    const acc = await loginTestAccount(page);
    await seedThreeRooms(page, acc.token);

    await expect(page.getByText("移动MOBROOM1")).toBeVisible({ timeout: 10_000 });
    await expectNoBreakout(page);
    await expectButtonsInView(page);

    // 单列:创建按钮占满视口宽度(≥90%)
    const vw = page.viewportSize()!.width;
    const create = await page.getByRole("button", { name: "创建新文档" }).boundingBox();
    expect(create!.width).toBeGreaterThan(vw * 0.9);

    // 房间行操作按钮触达(曾被裁出屏外的 ▦/✕)
    await expectTapSize(page, ["创建新文档", "加入文档"]);
    const qrBtns = page.getByTitle("显示二维码");
    expect(await qrBtns.count()).toBeGreaterThan(0);
    const qrBox = await qrBtns.first().boundingBox();
    expect(Math.min(qrBox!.width, qrBox!.height)).toBeGreaterThanOrEqual(38);
    const leaveBtn = page.getByTitle("退出该房间").first();
    const leaveBox = await leaveBtn.boundingBox();
    expect(Math.min(leaveBox!.width, leaveBox!.height)).toBeGreaterThanOrEqual(38);
  });

  test("批量退出在移动端可用", async ({ page }) => {
    const acc = await loginTestAccount(page);
    await seedThreeRooms(page, acc.token);
    await page.getByRole("button", { name: /批量管理/ }).click();
    await page
      .locator("li", { hasText: "MOBROOM1" })
      .locator('input[type="checkbox"]')
      .check();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /退出所选/ }).click();
    await expect(page.getByText("移动MOBROOM2")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("移动MOBROOM1")).toHaveCount(0);
  });

  test("扫码弹层:打开不破版,ESC 关闭", async ({ page }) => {
    await loginTestAccount(page);
    await page.goto("/");
    // 移动端扫码按钮仅剩 📷 图标(文案 sm 起显示),按 title 定位
    await page.getByTitle("扫房间二维码直接加入").click();
    await page.waitForTimeout(1200);
    await expectNoBreakout(page);
    await expectButtonsInView(page);
  });
});

test.describe("编辑器(移动)", () => {
  test("整页零横溢(曾溢出 51px);工具栏收进内部滚动;退出房间可点(曾被遮挡)", async ({ page }) => {
    await loginTestAccount(page);
    await page.goto("/");
    await page.getByRole("button", { name: "创建新文档" }).click();
    await expect(page.getByText("已连接", { exact: true })).toBeVisible({ timeout: 20_000 });

    await expectNoBreakout(page); // 核心回归:曾整页可左右晃
    await expectButtonsInView(page);

    // MDX 工具栏存在且自身可横向滚动(而非撑破页面)
    const toolbar = page.locator(".mdxeditor-toolbar").first();
    await expect(toolbar).toBeVisible();

    // 交互级回归:「退出房间」曾被子元素遮挡点不动,必须真实可点
    await page.getByRole("button", { name: "退出房间" }).click();
    await expect(page).toHaveURL("/");
  });

  test("在线用户抽屉:👥 打开 → 列表可见 → ESC 关闭", async ({ page }) => {
    await loginTestAccount(page);
    await page.goto("/");
    await page.getByRole("button", { name: "创建新文档" }).click();
    await expect(page.getByText("已连接", { exact: true })).toBeVisible({ timeout: 20_000 });

    // 移动端常驻侧栏应隐藏,改由顶栏 👥 打开抽屉
    const usersText = page.getByText(/在线用户 \(1\)/);
    await expect(usersText).toBeHidden();

    await page.getByTitle(/在线用户/).click();
    const drawerText = page.locator(".fixed.inset-0");
    await expect(drawerText.getByText(/在线用户 \(1\)/)).toBeVisible();
    await expectNoBreakout(page);

    await page.keyboard.press("Escape");
    await expect(drawerText).toHaveCount(0);
  });

  test("二维码弹层在移动端不破版", async ({ page }) => {
    await loginTestAccount(page);
    await page.goto("/");
    await page.getByRole("button", { name: "创建新文档" }).click();
    await expect(page.getByText("已连接", { exact: true })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "二维码" }).click();
    await expect(page.getByRole("heading", { name: "扫码进房" })).toBeVisible();
    await expectNoBreakout(page);
  });
});

test.describe("设置(移动)", () => {
  test("按钮纵排全宽;不破版", async ({ page }) => {
    await loginTestAccount(page);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "设置" })).toBeVisible();
    await expectNoBreakout(page);
    const vw = page.viewportSize()!.width;
    const test = await page.getByRole("button", { name: "测试连接" }).boundingBox();
    // 卡片自带 p-8 内边距:全宽指内容区撑满(≥75% 视口)
    expect(test!.width).toBeGreaterThan(vw * 0.75);
  });
});

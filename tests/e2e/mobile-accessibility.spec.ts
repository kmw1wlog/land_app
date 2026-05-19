import { expect, test } from "@playwright/test";

const routes = ["/feed", "/my-home", "/goal-path", "/community", "/portfolio", "/broker", "/sell-intent", "/compare-price-band"];

for (const route of routes) {
  test(`${route} renders without horizontal overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      headings: document.querySelectorAll("h1,h2").length,
      buttons: document.querySelectorAll("button").length,
      inputs: document.querySelectorAll("input,select,textarea").length
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
    expect(metrics.headings).toBeGreaterThan(0);
  });
}

test("community post API flow works from the mobile UI", async ({ page }, testInfo) => {
  const title = `모바일 점검 글 ${testInfo.project.name}`;
  await page.goto("/community");
  await page.getByPlaceholder("제목").fill(title);
  await page.getByPlaceholder("현장 분위기, 질문, 검증하고 싶은 내용을 남겨보세요.").fill("접근성 스모크 테스트입니다.");
  await page.getByRole("button", { name: "게시하기" }).click();
  await expect(page.getByRole("heading", { name: title }).first()).toBeVisible();
});

test("discovery feed shows real-transaction candidate affordances", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByText("내 사다리 요약")).toBeVisible();
  await expect(page.getByText("1.5배 후보")).toBeVisible();
  await expect(page.getByText("최근 실거래 기준가")).toBeVisible();
  await expect(page.getByText("공공 실거래가 기반 분석 후보").first()).toBeVisible();
  await expect(page.getByText("갈아타기 체크리스트")).toBeVisible();
  await expect(page.getByText("층별 실거래 기준가")).toBeVisible();
  await expect(page.getByRole("link", { name: "네이버에서 현재 매물 보기" }).last()).toBeVisible();
  await page.getByRole("link", { name: /같은 돈 비교/ }).click();
  await expect(page.getByText("같은 돈이면 어디?")).toBeVisible();
  await page.goto("/feed");
  await page.getByRole("link", { name: /도달경로/ }).first().click();
  await expect(page.getByRole("heading", { name: "내 부동산 사다리" }).first()).toBeVisible();
  await expect(page.getByText("가격대까지 가는 경로")).toBeVisible();
});

test("submission demo pages render guided recording and capture flows", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/demo-submission");
  await expect(page.getByRole("heading", { name: /내 집 팔고/ })).toBeVisible();
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("heading", { name: "내 상황을 입력합니다" })).toBeVisible();

  await page.goto("/demo-captures");
  await expect(page.getByText("제출 이미지 1")).toBeVisible();
  await expect(page.getByRole("heading", { name: "문제-해결 요약" })).toBeVisible();
});

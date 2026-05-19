import { chromium } from "@playwright/test";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = path.resolve("public/demo");
const rawDir = path.join(outputDir, "raw");
const outputPath = path.join(outputDir, "modoo-startup-demo.webm");

async function main() {
  await mkdir(rawDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: rawDir,
      size: { width: 1920, height: 1080 }
    }
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/demo-submission`, { waitUntil: "networkidle" });

  for (let index = 0; index < 6; index += 1) {
    await page.waitForTimeout(index === 0 ? 4000 : 6000);
    await page.getByRole("button", { name: "다음" }).click();
  }
  await page.waitForTimeout(5000);

  const video = page.video();
  await context.close();
  await browser.close();

  const rawPath = await video?.path();
  if (!rawPath) {
    throw new Error("Playwright video path was not created.");
  }
  await mkdir(outputDir, { recursive: true });
  await copyFile(rawPath, outputPath);
  console.info(`Demo video saved: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

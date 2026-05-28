import { chromium } from "@playwright/test";
import ffmpegStatic from "ffmpeg-static";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3002";
const chromiumExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  ["/usr/bin/chromium-browser", "/snap/bin/chromium", "/usr/bin/chromium", "/usr/bin/google-chrome"].find((candidate) =>
    existsSync(candidate)
  );

const outputDir = path.resolve("public/demo");
const artifactDir = path.resolve("artifacts/demo-video");
const sceneDir = path.join(artifactDir, "scenes");
const mp4Path = path.join(outputDir, "homepath-molit-demo-60s.mp4");
const webmPath = path.join(outputDir, "homepath-molit-demo-60s.webm");

const sceneDurations = [5, 7, 8, 10, 12, 10, 8];
const sceneNames = [
  "00-problem",
  "01-onboarding",
  "02-purchase-power",
  "03-fusion-candidate",
  "04-ai-chat",
  "05-budget-compare",
  "06-final"
];

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function captureScenes() {
  await rm(sceneDir, { recursive: true, force: true });
  await mkdir(sceneDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: chromiumExecutable,
    args: ["--no-sandbox", "--disable-dev-shm-usage"].filter(Boolean)
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/demo-submission`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);
  await page.waitForTimeout(900);

  for (let index = 0; index < sceneNames.length; index += 1) {
    await page.screenshot({ path: path.join(sceneDir, `${sceneNames[index]}.png`), fullPage: false });
    if (index < sceneNames.length - 1) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(800);
    }
  }

  await browser.close();
}

async function renderMp4() {
  if (!ffmpegStatic) {
    throw new Error("ffmpeg-static is not available. Run npm install first.");
  }

  const args: string[] = ["-y"];
  sceneNames.forEach((name, index) => {
    args.push("-loop", "1", "-t", String(sceneDurations[index]), "-i", path.join(sceneDir, `${name}.png`));
  });
  args.push(
    "-f",
    "lavfi",
    "-t",
    "60",
    "-i",
    "aevalsrc=0.020*sin(2*PI*196*t)+0.016*sin(2*PI*246.94*t)+0.012*sin(2*PI*329.63*t):s=48000"
  );

  const videoFilters = sceneNames
    .map((_, index) => {
      const duration = sceneDurations[index];
      return `[${index}:v]scale=1920:1080,setsar=1,format=yuv420p,fade=t=in:st=0:d=0.45,fade=t=out:st=${Math.max(
        duration - 0.45,
        0
      )}:d=0.45,setpts=PTS-STARTPTS[v${index}]`;
    })
    .join(";");
  const concatInputs = sceneNames.map((_, index) => `[v${index}]`).join("");
  const audioIndex = sceneNames.length;
  const filterComplex = `${videoFilters};${concatInputs}concat=n=${sceneNames.length}:v=1:a=0,format=yuv420p[v];[${audioIndex}:a]afade=t=in:st=0:d=2,afade=t=out:st=57:d=3,volume=0.45[a]`;

  args.push(
    "-filter_complex",
    filterComplex,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-r",
    "30",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "-shortest",
    mp4Path
  );

  await run(ffmpegStatic, args);
}

async function renderWebm() {
  if (!ffmpegStatic) {
    throw new Error("ffmpeg-static is not available. Run npm install first.");
  }
  await run(ffmpegStatic, [
    "-y",
    "-i",
    mp4Path,
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "2400k",
    "-c:a",
    "libopus",
    "-b:a",
    "96k",
    webmPath
  ]);
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });
  await captureScenes();
  await renderMp4();
  await renderWebm();

  await copyFile(mp4Path, path.join(artifactDir, "homepath-molit-demo-60s.mp4"));
  await copyFile(webmPath, path.join(artifactDir, "homepath-molit-demo-60s.webm"));
  console.info(`Demo video saved: ${mp4Path}`);
  console.info(`Demo video saved: ${webmPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

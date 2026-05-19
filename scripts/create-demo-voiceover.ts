import ffmpegPath from "ffmpeg-static";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const narration = [
  "부동산 앱은 많지만, 내 상황에서 어디까지 갈 수 있는지는 알기 어렵습니다.",
  "실거래가도 보고, 거래량도 보고, 단지도 보지만 결국 질문은 하나입니다.",
  "그래서 나는 어디까지 갈 수 있지?",
  "현재 집, 월급, 현금, 관심지역을 입력하면,",
  "지금 가능한 가격대, 집을 팔면 가능한 가격대, 5년 뒤 가능한 가격대를 계산합니다.",
  "그리고 공공 실거래 데이터를 바탕으로 최근 거래가 활발한 단지와 면적대를 보여줍니다.",
  "한 단지에 꽂히지 않도록, 같은 가격대의 다른 후보도 자동으로 비교합니다.",
  "데이터만으로 부족한 맥락은 단지별 커뮤니티에서 확인합니다.",
  "부동산을 보는 앱이 아니라, 내 미래를 그리는 앱."
].join("\n\n");

const demoDir = path.resolve("public/demo");
const sourceVideo = path.join(demoDir, "modoo-startup-demo.webm");
const narrationTextPath = path.join(demoDir, "modoo-startup-narration.txt");
const narrationAudioPath = path.join(demoDir, "modoo-startup-narration.mp3");
const noMusicOutput = path.join(demoDir, "modoo-startup-demo-voiceover.mp4");
const musicOutput = path.join(demoDir, "modoo-startup-demo-voiceover-bgm.mp4");

async function main() {
  await mkdir(demoDir, { recursive: true });
  await writeFile(narrationTextPath, narration, "utf-8");
  if (!existsSync(sourceVideo)) {
    throw new Error(`Source video not found: ${sourceVideo}. Run npm run record:demo first.`);
  }
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide a binary path.");
  }

  const apiKey = loadOpenAIKey();
  if (!apiKey) {
    throw new Error(
      [
        "OPENAI_API_KEY is missing.",
        "Set it in the shell or .env.local, then rerun:",
        "  npm run create:demo-voiceover"
      ].join("\n")
    );
  }

  await createOpenAiSpeech(apiKey);
  await muxVoiceover({ withMusic: false });
  await muxVoiceover({ withMusic: true });
  console.info(`Voiceover video saved: ${noMusicOutput}`);
  console.info(`Voiceover+BGM video saved: ${musicOutput}`);
}

function loadOpenAIKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf-8");
    const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
    if (match?.[1]) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

async function createOpenAiSpeech(apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: narration,
      speed: 1.06,
      response_format: "mp3",
      instructions:
        "차분하고 신뢰감 있는 한국어 내레이션. 창업경진대회 제품 소개 영상용으로 자연스럽게, 과장 없이 읽어주세요."
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI TTS request failed: ${response.status} ${detail}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(narrationAudioPath, Buffer.from(arrayBuffer));
}

async function muxVoiceover({ withMusic }: { withMusic: boolean }) {
  const output = withMusic ? musicOutput : noMusicOutput;
  const args = withMusic
    ? [
        "-y",
        "-i",
        sourceVideo,
        "-i",
        narrationAudioPath,
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=220:sample_rate=44100",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=329.63:sample_rate=44100",
        "-filter_complex",
        "[2:a]volume=0.035[a1];[3:a]volume=0.025[a2];[a1][a2]amix=inputs=2:duration=longest[bgm];[1:a]volume=1.0[voice];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]",
        "-map",
        "0:v:0",
        "-map",
        "[aout]",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        output
      ]
    : [
        "-y",
        "-i",
        sourceVideo,
        "-i",
        narrationAudioPath,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        output
      ];
  await run(ffmpegPath!, args);
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

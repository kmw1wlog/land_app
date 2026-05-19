import fs from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "capacitor-web");
const targetUrl =
  process.env.CAPACITOR_APP_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000";

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Landload App</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f7f1e7;
        --card: #ffffff;
        --text: #17202a;
        --muted: #586574;
        --accent: #2f5d50;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top left, rgba(214, 111, 74, 0.18), transparent 24rem),
          linear-gradient(180deg, #fcf8f1 0%, var(--bg) 100%);
        color: var(--text);
        font-family: "Noto Sans KR", "Apple SD Gothic Neo", sans-serif;
      }

      .card {
        width: min(92vw, 28rem);
        padding: 2rem;
        border-radius: 1.5rem;
        background: var(--card);
        box-shadow: 0 18px 42px rgba(17, 24, 39, 0.12);
      }

      h1 {
        margin: 0;
        font-size: 1.75rem;
        line-height: 1.2;
      }

      p {
        margin: 0.9rem 0 0;
        color: var(--muted);
        line-height: 1.7;
      }

      a {
        display: inline-flex;
        margin-top: 1.25rem;
        align-items: center;
        justify-content: center;
        min-height: 3rem;
        padding: 0 1rem;
        border-radius: 999px;
        background: var(--accent);
        color: white;
        text-decoration: none;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Landload App를 여는 중입니다</h1>
      <p>자동으로 연결되지 않으면 아래 버튼으로 현재 배포 주소를 열 수 있습니다.</p>
      <a id="open-link" href="${targetUrl}">웹앱 열기</a>
    </main>
    <script>
      window.setTimeout(function () {
        window.location.replace(${JSON.stringify(targetUrl)});
      }, 250);
    </script>
  </body>
</html>
`;

fs.writeFileSync(path.join(outDir, "index.html"), html);

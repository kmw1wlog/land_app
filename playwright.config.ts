import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  webServer: {
    command: "PATH=$PWD/.tools/node-v22.11.0-linux-x64/bin:$PATH npm run dev -- --hostname 127.0.0.1 --port 3010",
    url: "http://127.0.0.1:3010",
    reuseExistingServer: true,
    timeout: 120_000
  },
  use: {
    baseURL: "http://127.0.0.1:3010",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] }
    },
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});

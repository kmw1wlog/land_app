import type { CapacitorConfig } from "@capacitor/cli";

const remoteUrl = process.env.CAPACITOR_APP_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.kmw1wlog.landloadapp",
  appName: "Landload App",
  webDir: "capacitor-web",
  server: remoteUrl
    ? {
        url: remoteUrl,
        cleartext: remoteUrl.startsWith("http://"),
        allowNavigation: ["*"]
      }
    : undefined
};

export default config;

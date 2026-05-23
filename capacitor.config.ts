import type { CapacitorConfig } from "@capacitor/cli";

const remoteUrl = process.env.CAPACITOR_APP_URL?.trim();

if (remoteUrl && !remoteUrl.startsWith("https://")) {
  throw new Error("CAPACITOR_APP_URL must start with https://");
}

if (!remoteUrl) {
  console.warn(
    "[capacitor] CAPACITOR_APP_URL is not set. The Android wrapper will fall back to the local launcher page until a public HTTPS deployment URL is injected."
  );
}

const config: CapacitorConfig = {
  appId: "com.kmw1wlog.landloadapp",
  appName: "Landload App",
  webDir: "capacitor-web",
  server: remoteUrl
    ? {
        url: remoteUrl,
        cleartext: false,
        androidScheme: "https"
      }
    : undefined,
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;

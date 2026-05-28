import type { PublicDataTargetConfig } from "../types";

const DATA_GO_KR_SERVICE_KEY_ENV_NAMES = [
  "DATA_GO_KR_SERVICE_KEY",
  "DATAGO_SERVICE_KEY",
  "DATAGOKR_SERVICE_KEY",
  "PUBLIC_DATA_SERVICE_KEY",
  "PUBLIC_DATA_API_KEY",
  "MOLIT_SERVICE_KEY",
  "MOLIT_API_KEY",
  "MOLIT_OPENAPI_SERVICE_KEY",
  "GOV_DATA_SERVICE_KEY",
  "OPENAPI_SERVICE_KEY",
  "SERVICE_KEY"
] as const;

export function isConfigured(value: string | undefined): boolean {
  return Boolean(value && value.trim() && !value.includes("replace_with"));
}

export function resolveFirstConfiguredEnv(names: readonly string[]): { value?: string; name?: string } {
  for (const name of names) {
    const value = process.env[name];
    if (isConfigured(value)) return { value: value?.trim(), name };
  }
  return {};
}

export function resolveDataGoKrServiceKey() {
  return resolveFirstConfiguredEnv(DATA_GO_KR_SERVICE_KEY_ENV_NAMES);
}

export function dataGoKrServiceKeyEnvNames() {
  return [...DATA_GO_KR_SERVICE_KEY_ENV_NAMES];
}

export function resolveDataGoKrBaseUrl() {
  return (
    resolveFirstConfiguredEnv([
      "DATA_GO_KR_BASE_URL",
      "DATAGO_BASE_URL",
      "PUBLIC_DATA_BASE_URL",
      "MOLIT_OPENAPI_BASE_URL"
    ]).value || "https://apis.data.go.kr"
  );
}

export function getTargetConfig(): PublicDataTargetConfig {
  return {
    regions: splitEnvList(process.env.TARGET_REGIONS),
    lawdCodes: splitEnvList(process.env.TARGET_LAWD_CODES),
    monthFrom: process.env.TARGET_MONTH_FROM || "202501",
    monthTo: process.env.TARGET_MONTH_TO || "202604"
  };
}

export type PublicDataMode = "live" | "mock" | "mixed";

export function getPublicDataMode(): PublicDataMode {
  const value = (process.env.PUBLIC_DATA_MODE || "live").toLowerCase();
  if (value === "mock" || value === "mixed") return value;
  return "live";
}

function splitEnvList(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeServiceKeyForUrlSearchParams(key: string): string {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

export function allowGeocoderPersist(): boolean {
  return process.env.ALLOW_GEOCODER_PERSIST === "true";
}

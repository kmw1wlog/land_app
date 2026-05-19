import type { PublicDataTargetConfig } from "../types";

export function isConfigured(value: string | undefined): boolean {
  return Boolean(value && value.trim() && !value.includes("replace_with"));
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

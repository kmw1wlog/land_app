import {
  dataGoKrServiceKeyEnvNames,
  isConfigured,
  normalizeServiceKeyForUrlSearchParams,
  resolveDataGoKrBaseUrl,
  resolveDataGoKrServiceKey
} from "../utils/env";
import { logApiCall } from "../services/apiCallLogService";
import { stableHash } from "../utils/hash";
import { parseXml } from "../utils/xml";

export class DataGoKrClient {
  private readonly serviceKeyConfig = resolveDataGoKrServiceKey();
  private readonly serviceKey = this.serviceKeyConfig.value;
  private readonly baseUrl = resolveDataGoKrBaseUrl();

  isConfigured(): boolean {
    return isConfigured(this.serviceKey);
  }

  configuredEnvName(): string | null {
    return this.isConfigured() ? this.serviceKeyConfig.name ?? null : null;
  }

  async getXml<T = unknown>(
    endpoint: string,
    params: Record<string, string | number> = {}
  ): Promise<{ parsed: T; raw: string; url: string }> {
    const raw = await this.request(endpoint, params);
    const parsed = parseXml<T>(raw.body);
    assertDataGoKrSuccess(parsed);
    return { parsed, raw: raw.body, url: raw.url };
  }

  async getJson<T = unknown>(
    endpoint: string,
    params: Record<string, string | number> = {}
  ): Promise<{ parsed: T; raw: string; url: string }> {
    const raw = await this.request(endpoint, { ...params, _type: "json" });
    const parsed = JSON.parse(raw.body) as T;
    assertDataGoKrSuccess(parsed);
    return { parsed, raw: raw.body, url: raw.url };
  }

  private async request(
    endpoint: string,
    params: Record<string, string | number>
  ): Promise<{ body: string; url: string }> {
    if (!this.serviceKey) {
      throw new Error(`Data.go.kr service key is not configured. Supported env names: ${dataGoKrServiceKeyEnvNames().join(", ")}`);
    }

    const url = new URL(endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`);
    url.searchParams.set("serviceKey", normalizeServiceKeyForUrlSearchParams(this.serviceKey));
    url.searchParams.set("numOfRows", String(params.numOfRows ?? 100));
    url.searchParams.set("pageNo", String(params.pageNo ?? 1));

    Object.entries(params).forEach(([key, value]) => {
      if (key !== "serviceKey") {
        url.searchParams.set(key, String(value));
      }
    });

    let lastError: unknown;
    const startedAt = Date.now();
    const paramsHash = stableHash({ endpoint, params });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        if (attempt > 0) {
          await delay(400 * attempt);
        }
        const response = await fetch(url, { cache: "no-store" });
        const body = await response.text();
        if (!response.ok) {
          throw new Error(`Data.go.kr request failed: ${response.status} ${body.slice(0, 200)}`);
        }
        await logApiCall({
          provider: "data.go.kr",
          endpoint,
          paramsHash,
          status: "ok",
          statusCode: response.status,
          resultCode: extractResultCode(body),
          durationMs: Date.now() - startedAt,
          rawPreview: body
        });
        return { body, url: redactServiceKey(url.toString()) };
      } catch (error) {
        lastError = error;
      }
    }

    await logApiCall({
      provider: "data.go.kr",
      endpoint,
      paramsHash,
      status: "error",
      message: lastError instanceof Error ? lastError.message : String(lastError),
      durationMs: Date.now() - startedAt
    });
    throw lastError instanceof Error ? lastError : new Error("Data.go.kr request failed");
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assertDataGoKrSuccess(parsed: unknown): void {
  const text = JSON.stringify(parsed);
  if (
    text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR") ||
    text.includes("SERVICE ERROR") ||
    text.includes("INVALID_REQUEST_PARAMETER_ERROR")
  ) {
    throw new Error(`Data.go.kr API error: ${text.slice(0, 500)}`);
  }
}

function redactServiceKey(url: string): string {
  return url.replace(/serviceKey=[^&]+/g, "serviceKey=REDACTED");
}

function extractResultCode(body: string): string | undefined {
  return body.match(/<resultCode>(.*?)<\/resultCode>/)?.[1];
}

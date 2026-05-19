import { isConfigured } from "../utils/env";
import { logApiCall } from "../services/apiCallLogService";
import { stableHash } from "../utils/hash";

export class VWorldClient {
  private readonly key = process.env.VWORLD_API_KEY;

  isConfigured(): boolean {
    return isConfigured(this.key);
  }

  async geocodeAddress(
    address: string,
    type: "road" | "parcel" = "parcel"
  ): Promise<{ lat: number | null; lng: number | null; raw: unknown }> {
    if (!this.key) {
      throw new Error("VWORLD_API_KEY is not configured");
    }

    const url = new URL("https://api.vworld.kr/req/address");
    url.searchParams.set("service", "address");
    url.searchParams.set("version", "2.0");
    url.searchParams.set("request", "getCoord");
    url.searchParams.set("format", "json");
    url.searchParams.set("type", type);
    url.searchParams.set("key", this.key);
    url.searchParams.set("address", address);

    const startedAt = Date.now();
    const response = await fetch(url, { cache: "no-store" });
    const json = (await response.json()) as {
      response?: {
        status?: string;
        result?: {
          point?: {
            x?: string;
            y?: string;
          };
        };
      };
    };
    await logApiCall({
      provider: "vworld",
      endpoint: "address/getCoord",
      paramsHash: stableHash({ address, type }),
      status: response.ok ? "ok" : "error",
      statusCode: response.status,
      resultCode: json.response?.status,
      durationMs: Date.now() - startedAt,
      rawPreview: JSON.stringify({ status: json.response?.status })
    });

    const point = json.response?.result?.point;
    return {
      lat: point?.y ? Number(point.y) : null,
      lng: point?.x ? Number(point.x) : null,
      // VWorld geocoder data can have storage restrictions. Keep raw for
      // request-time diagnostics only; do not persist this raw payload.
      raw: json
    };
  }

  async getJson(
    endpoint: string,
    params: Record<string, string | number | undefined | null>
  ): Promise<unknown> {
    if (!this.key) {
      throw new Error("VWORLD_API_KEY is not configured");
    }

    const url = endpoint.startsWith("http")
      ? new URL(endpoint)
      : new URL(endpoint.replace(/^\//, ""), "https://api.vworld.kr/");
    url.searchParams.set("key", this.key);
    url.searchParams.set("format", "json");
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const startedAt = Date.now();
    const response = await fetch(url, { cache: "no-store" });
    const json = await response.json();
    await logApiCall({
      provider: "vworld",
      endpoint: endpoint.replace(this.key, "REDACTED"),
      paramsHash: stableHash(params),
      status: response.ok ? "ok" : "error",
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      rawPreview: JSON.stringify({ ok: response.ok }).slice(0, 500)
    });
    return json;
  }
}

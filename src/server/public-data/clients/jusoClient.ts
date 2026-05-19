import { isConfigured } from "../utils/env";
import { logApiCall } from "../services/apiCallLogService";
import { stableHash } from "../utils/hash";

export interface JusoSearchItem {
  roadAddr?: string;
  jibunAddr?: string;
  admCd?: string;
  bdMgtSn?: string;
  rnMgtSn?: string;
  udrtYn?: string;
  buldMnnm?: string;
  buldSlno?: string;
  siNm?: string;
  sggNm?: string;
  emdNm?: string;
  liNm?: string;
}

export class JusoClient {
  private readonly key = process.env.JUSO_CONFIRM_KEY;

  isConfigured(): boolean {
    return isConfigured(this.key);
  }

  async searchAddress(
    keyword: string,
    options: { currentPage?: number; countPerPage?: number } = {}
  ): Promise<JusoSearchItem[]> {
    if (!this.key) {
      throw new Error("JUSO_CONFIRM_KEY is not configured");
    }

    const url = new URL("https://business.juso.go.kr/addrlink/addrLinkApi.do");
    url.searchParams.set("confmKey", this.key);
    url.searchParams.set("resultType", "json");
    url.searchParams.set("currentPage", String(options.currentPage ?? 1));
    url.searchParams.set("countPerPage", String(options.countPerPage ?? 10));
    url.searchParams.set("keyword", keyword);

    const startedAt = Date.now();
    const response = await fetch(url, { cache: "no-store" });
    const json = (await response.json()) as {
      results?: {
        common?: {
          errorCode?: string;
          errorMessage?: string;
        };
        juso?: JusoSearchItem[];
      };
    };

    const code = json.results?.common?.errorCode;
    await logApiCall({
      provider: "juso",
      endpoint: "addrLinkApi",
      paramsHash: stableHash({ keyword, options }),
      status: response.ok && (!code || code === "0") ? "ok" : "error",
      statusCode: response.status,
      resultCode: code,
      message: json.results?.common?.errorMessage,
      durationMs: Date.now() - startedAt,
      rawPreview: JSON.stringify({ code, count: json.results?.juso?.length ?? 0 })
    });
    if (code && code !== "0") {
      throw new Error(`Juso API error ${code}: ${json.results?.common?.errorMessage ?? ""}`);
    }

    return json.results?.juso ?? [];
  }
}

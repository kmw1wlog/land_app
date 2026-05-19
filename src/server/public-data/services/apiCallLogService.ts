import { prisma } from "@/server/db";

interface ApiCallLogInput {
  provider: string;
  endpoint: string;
  paramsHash?: string;
  status: string;
  statusCode?: number;
  resultCode?: string;
  message?: string;
  durationMs?: number;
  rawPreview?: string;
}

export async function logApiCall(input: ApiCallLogInput) {
  try {
    await prisma.$transaction([
      prisma.apiCallLog.create({
        data: {
          provider: input.provider,
          endpoint: input.endpoint,
          paramsHash: input.paramsHash,
          status: input.status,
          statusCode: input.statusCode,
          resultCode: input.resultCode,
          message: input.message?.slice(0, 500),
          durationMs: input.durationMs,
          rawPreview: input.rawPreview?.replace(/serviceKey=[^&\s]+/g, "serviceKey=REDACTED").slice(0, 1000)
        }
      }),
      prisma.apiQuotaDaily.upsert({
        where: { provider_date: { provider: input.provider, date: new Date().toISOString().slice(0, 10) } },
        update: {
          callCount: { increment: 1 },
          errorCount: { increment: input.status === "ok" ? 0 : 1 }
        },
        create: {
          provider: input.provider,
          date: new Date().toISOString().slice(0, 10),
          callCount: 1,
          errorCount: input.status === "ok" ? 0 : 1,
          quotaLimit: quotaForProvider(input.provider)
        }
      })
    ]);
  } catch {
    // Logging must never break the user-facing API path.
  }
}

function quotaForProvider(provider: string) {
  if (provider === "data.go.kr") return Number(process.env.DATA_GO_KR_DAILY_QUOTA ?? 10000);
  if (provider === "vworld") return Number(process.env.VWORLD_DAILY_QUOTA ?? 40000);
  if (provider === "juso") return Number(process.env.JUSO_DAILY_QUOTA ?? 10000);
  return null;
}

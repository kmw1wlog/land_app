import { NextRequest, NextResponse } from "next/server";
import { DataGoKrClient } from "@/server/public-data/clients/dataGoKrClient";
import { JusoClient } from "@/server/public-data/clients/jusoClient";
import { VWorldClient } from "@/server/public-data/clients/vworldClient";
import { prisma } from "@/server/db";
import { getPublicDataMode, getTargetConfig } from "@/server/public-data/utils/env";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const dataGoKr = new DataGoKrClient();
  const vworld = new VWorldClient();
  const juso = new JusoClient();
  const target = getTargetConfig();
  const mode = getPublicDataMode();
  const probe = request.nextUrl.searchParams.get("probe") === "true";
  const molitCache = await getMolitCacheStatus();

  if (!probe) {
    return NextResponse.json({
      mode,
      dataGoKr: {
        configured: dataGoKr.isConfigured(),
        status: dataGoKr.isConfigured() ? "ok" : molitCache.realTransactionCount > 0 ? "cached" : "partial",
        configuredEnvName: dataGoKr.configuredEnvName(),
        cache: molitCache
      },
      vworld: {
        configured: vworld.isConfigured(),
        status: vworld.isConfigured() ? "ok" : "partial"
      },
      juso: {
        configured: juso.isConfigured(),
        status: juso.isConfigured() ? "ok" : "partial"
      },
      target
    });
  }

  const warnings: string[] = [];
  const lawdCode = target.lawdCodes[0] ?? "27260";
  const dealYmd = target.monthTo;
  const dataGoMessages: string[] = [];

  let dataGoStatus = "skipped";
  if (dataGoKr.isConfigured()) {
    const probes = [
      {
        label: "apartmentTrade",
        endpoint: "/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade"
      },
      {
        label: "apartmentRent",
        endpoint: "/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent"
      }
    ];
    const statuses = await Promise.all(
      probes.map(async (item) => {
        try {
          await dataGoKr.getXml(item.endpoint, {
            LAWD_CD: lawdCode,
            DEAL_YMD: dealYmd,
            numOfRows: 1,
            pageNo: 1
          });
          dataGoMessages.push(`${item.label} ok`);
          return "ok";
        } catch (error) {
          const message = `${item.label} ${error instanceof Error ? error.message : String(error)}`;
          dataGoMessages.push(message);
          warnings.push(message);
          return "error";
        }
      })
    );
    dataGoStatus = statuses.every((status) => status === "ok") ? "ok" : "error";
  }

  let vworldStatus = "skipped";
  if (vworld.isConfigured()) {
    try {
      await vworld.geocodeAddress(`${target.regions[0] ?? "대구 수성구"}청`, "road");
      vworldStatus = "ok";
    } catch (error) {
      vworldStatus = "error";
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  let jusoStatus = "skipped";
  if (juso.isConfigured() && process.env.DISABLE_JUSO !== "true") {
    try {
      await juso.searchAddress(`${target.regions[0] ?? "대구 수성구"}청`, { countPerPage: 1 });
      jusoStatus = "ok";
    } catch (error) {
      jusoStatus = "error";
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  return NextResponse.json({
    mode,
    dataGoKr: {
      configured: dataGoKr.isConfigured(),
      probeStatus: dataGoKr.isConfigured()
        ? dataGoStatus
        : molitCache.realTransactionCount > 0
          ? "cached"
          : dataGoStatus,
      message: dataGoMessages.join(", "),
      configuredEnvName: dataGoKr.configuredEnvName(),
      cache: molitCache
    },
    vworld: {
      configured: vworld.isConfigured(),
      probeStatus: vworldStatus
    },
    juso: {
      configured: juso.isConfigured(),
      probeStatus: jusoStatus
    },
    target,
    warnings
  });
}

async function getMolitCacheStatus() {
  const [realTransactionCount, successfulApiLogCount, latestApiLog] = await Promise.all([
    prisma.realTransaction.count({
      where: {
        sourceType: {
          not: {
            contains: "mock"
          }
        }
      }
    }),
    prisma.apiCallLog.count({
      where: {
        provider: "data.go.kr",
        status: "ok"
      }
    }),
    prisma.apiCallLog.findFirst({
      where: {
        provider: "data.go.kr",
        status: "ok"
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        endpoint: true,
        resultCode: true,
        createdAt: true
      }
    })
  ]);

  return {
    realTransactionCount,
    successfulApiLogCount,
    latestSuccessfulApiCall: latestApiLog
  };
}

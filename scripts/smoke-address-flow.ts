import { existsSync } from "fs";

if (existsSync(".env.local")) process.loadEnvFile?.(".env.local");
if (existsSync(".env")) process.loadEnvFile?.(".env");

async function main() {
  const { normalizeAddress } = await import("@/server/public-data/services/addressNormalizeService");
  const { seedTransactionsForTargets } = await import("@/server/public-data/services/realTransactionService");
  const { estimateCurrentHomeValue } = await import("@/server/public-data/services/valuationService");
  const { prisma } = await import("@/server/db");

  const address = process.env.SMOKE_ADDRESS || "대구광역시 수성구 범어동 1";
  const complexName = process.env.SMOKE_COMPLEX_NAME || "어나드범어";
  const areaM2 = Number(process.env.SMOKE_AREA_M2 || 84.9);

  const normalized = await normalizeAddress(address);
  if (!normalized.lawdCode5) throw new Error("lawdCode5 was not created");

  const seed = await seedTransactionsForTargets({
    lawdCodes: [normalized.lawdCode5],
    from: process.env.SMOKE_DEAL_MONTH || "202604",
    to: process.env.SMOKE_DEAL_MONTH || "202604",
    propertyTypes: ["apartment"],
    dealTypes: ["trade", "rent"],
    allowLarge: true
  });

  const snapshot = await estimateCurrentHomeValue({
    normalizedAddressId: normalized.id,
    pnu: normalized.pnu,
    lawdCode5: normalized.lawdCode5,
    complexName,
    areaM2,
    propertyType: "apartment"
  });

  const transactionCount = await prisma.realTransaction.count({
    where: { lawdCode5: normalized.lawdCode5, propertyType: "apartment" }
  });

  console.log(
    JSON.stringify(
      {
        normalized: {
          source: normalized.source,
          lawdCode5: normalized.lawdCode5,
          legalDongCode10: normalized.legalDongCode10,
          pnu: normalized.pnu,
          warnings: normalized.warnings
        },
        seed: seed.summary,
        transactionCount,
        valuation: {
          estimatedPrice: snapshot.estimatedPrice,
          estimatedJeonsePrice: snapshot.estimatedJeonsePrice,
          jeonseRatio: snapshot.jeonseRatio,
          method: snapshot.method,
          warnings: snapshot.warnings
        }
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { seedTransactionsForTargets } from "@/server/public-data/services/realTransactionService";
import { existsSync } from "fs";

if (existsSync(".env.local")) process.loadEnvFile?.(".env.local");
if (existsSync(".env")) process.loadEnvFile?.(".env");

type Args = {
  from: string;
  to: string;
  lawdCodes: string[];
  propertyTypes: string[];
  dealTypes: string[];
  dryRun: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const value = (name: string, fallback: string) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] ?? fallback : fallback;
  };
  const list = (name: string, fallback: string) =>
    value(name, fallback)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    from: value("from", "202401"),
    to: value("to", "202604"),
    lawdCodes: list("lawd", "27260"),
    propertyTypes: list("propertyTypes", "apartment"),
    dealTypes: list("dealTypes", "trade,rent"),
    dryRun: args.includes("--dry-run"),
  };
}

async function main() {
  const args = parseArgs();
  const startedAt = Date.now();
  const result = await seedTransactionsForTargets({
    lawdCodes: args.lawdCodes,
    from: args.from,
    to: args.to,
    propertyTypes: args.propertyTypes,
    dealTypes: args.dealTypes,
    dryRun: args.dryRun,
    allowLarge: true,
  });

  console.log(
    JSON.stringify(
      {
        request: args,
        durationMs: Date.now() - startedAt,
        summary: result.summary,
        failedEndpoints: result.results
          .filter((item) => item.status === "error")
          .map((item) => ({
            lawdCode: item.lawdCode,
            month: item.month,
            propertyType: item.propertyType,
            dealType: item.dealType,
            failed: item.failed,
          })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

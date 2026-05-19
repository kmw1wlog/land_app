import { DataGoKrClient } from "../src/server/public-data/clients/dataGoKrClient";
import { getPath } from "../src/server/public-data/utils/xml";

process.loadEnvFile?.(".env.local");
process.loadEnvFile?.(".env");

const candidates = [
  process.env.DATA_GO_KR_BUILDING_LEDGER_TITLE_ENDPOINT,
  process.env.DATA_GO_KR_BUILDING_LEDGER_TOTAL_ENDPOINT,
  "/1613000/BldRgstHubService/getBrTitleInfo",
  "/1613000/BldRgstHubService/getBrRecapTitleInfo",
  "/1613000/BldRgstHubService/getBrExposInfo",
  "/1613000/BldRgstHubService/getBrFlrOulnInfo",
  "/1613000/BldRgstHubService/getBrJijiguInfo",
  "/1613000/BldRgstService_v2/getBrTitleInfo",
  "/1613000/BldRgstService_v2/getBrRecapTitleInfo"
].filter((item): item is string => Boolean(item));

async function main() {
  const client = new DataGoKrClient();
  const rows = [];

  for (const endpoint of [...new Set(candidates)]) {
    try {
      const result = await client.getJson(endpoint, {
        sigunguCd: process.env.PROBE_SIGUNGU_CD || "27260",
        bjdongCd: process.env.PROBE_BJDONG_CD || "10100",
        bun: process.env.PROBE_BUN || "0123",
        ji: process.env.PROBE_JI || "0004",
        numOfRows: 1,
        _type: "json"
      });
      const resultCode =
        getPath(result.parsed, ["response", "header", "resultCode"]) ??
        getPath(result.parsed, ["response", "header", "resultMsg"]);
      const items = getPath(result.parsed, ["response", "body", "items", "item"]);
      rows.push({
        endpoint,
        status: "ok",
        resultCode,
        hasItems: Boolean(items)
      });
    } catch (error) {
      rows.push({
        endpoint,
        status: "error",
        error: error instanceof Error ? error.message.slice(0, 200) : String(error)
      });
    }
  }

  console.table(rows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

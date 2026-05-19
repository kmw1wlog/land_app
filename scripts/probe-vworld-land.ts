import { fetchCadastralByPnu, fetchLandUseInfo, fetchPublicLandPrice } from "@/server/public-data/services/landInfoService";

async function main() {
  const pnu = process.env.PROBE_PNU || "2726010100100010000";
  const probes = [
    ["cadastral", () => fetchCadastralByPnu(pnu)],
    ["landUse", () => fetchLandUseInfo(pnu)],
    ["publicLandPrice", () => fetchPublicLandPrice(pnu)]
  ] as const;

  for (const [name, run] of probes) {
    try {
      const result = await run();
      const text = JSON.stringify(result);
      console.log(`${name}: ok (${text.length} bytes)`);
    } catch (error) {
      console.log(`${name}: error - ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { getFusionCreditReadiness, getFusionDataEvidence } from "@/server/public-data/fusion/dataSourceRegistry";

async function main() {
  const evidence = getFusionDataEvidence();
  const readiness = getFusionCreditReadiness(evidence);
  console.log(JSON.stringify({ readiness, evidence }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

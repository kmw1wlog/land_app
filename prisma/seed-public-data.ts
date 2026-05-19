import { seedLegalDongCodes } from "../src/server/public-data/services/legalDongService";
import { seedTransactionsForTargets } from "../src/server/public-data/services/realTransactionService";

async function main() {
  await seedLegalDongCodes();
  const result = await seedTransactionsForTargets({
    propertyTypes: ["apartment"],
    dealTypes: ["trade", "rent"]
  });
  console.log(result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/server/db");
    await prisma.$disconnect();
  });

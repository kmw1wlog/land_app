import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import { getPublicDataMode } from "../utils/env";
import { seedTransactionsForTargets } from "./realTransactionService";

export async function createPublicDataSeedJob(request: Record<string, unknown>) {
  const job = await prisma.publicDataSeedJob.create({
    data: {
      mode: getPublicDataMode(),
      request: request as Prisma.InputJsonValue,
      status: "running"
    }
  });

  try {
    const result = await seedTransactionsForTargets({
      lawdCodes: asStringArray(request.lawdCodes),
      from: asString(request.from),
      to: asString(request.to),
      propertyTypes: asStringArray(request.propertyTypes),
      dealTypes: asStringArray(request.dealTypes),
      dryRun: Boolean(request.dryRun),
      allowLarge: Boolean(request.allowLarge)
    });
    return prisma.publicDataSeedJob.update({
      where: { id: job.id },
      data: {
        status: result.summary.failed > 0 ? "partial" : "completed",
        summary: result.summary as Prisma.InputJsonValue,
        results: result.results as Prisma.InputJsonValue
      }
    });
  } catch (error) {
    return prisma.publicDataSeedJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;
}

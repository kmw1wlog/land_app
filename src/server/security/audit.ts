import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";

export async function recordConsent(input: {
  userId: string;
  consentType: string;
  consentText: string;
  granted: boolean;
}) {
  return prisma.consentRecord.create({ data: input });
}

export async function logAccess(input: {
  actorId?: string;
  actorType: string;
  action: string;
  targetType: string;
  targetId?: string;
  purpose?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.accessAuditLog.create({
      data: {
        ...input,
        metadata: input.metadata as Prisma.InputJsonValue
      }
    });
  } catch {
    // Audit logging should not break the user path in local MVP mode.
  }
}

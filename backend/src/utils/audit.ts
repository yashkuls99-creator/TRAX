import { AuditAction, ClaimStatus } from "@prisma/client";
import { prisma } from "../config/prisma";

interface LogAuditParams {
  claimId?: string;
  action: AuditAction;
  fromStatus?: ClaimStatus | null;
  toStatus?: ClaimStatus | null;
  remarks?: string | null;
  metadata?: Record<string, unknown>;
  performedById: string;
}

export async function logAudit(params: LogAuditParams) {
  return prisma.auditLog.create({
    data: {
      claimId: params.claimId,
      action: params.action,
      fromStatus: params.fromStatus ?? undefined,
      toStatus: params.toStatus ?? undefined,
      remarks: params.remarks ?? undefined,
      metadata: params.metadata as any,
      performedById: params.performedById,
    },
  });
}

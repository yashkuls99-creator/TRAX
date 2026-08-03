import { Router } from "express";
import { z } from "zod";
import { ClaimStatus, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

const querySchema = z.object({
  projectId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

const PENDING_REVIEW_STATUSES: ClaimStatus[] = [ClaimStatus.SUBMITTED, ClaimStatus.ON_HOLD];
const AWAITING_PAYMENT_STATUSES: ClaimStatus[] = [
  ClaimStatus.APPROVED,
  ClaimStatus.PENDING_PAYMENT,
  ClaimStatus.PARTIALLY_PAID,
];

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const q = querySchema.parse(req.query);
    const isEmployee = req.user!.role === Role.EMPLOYEE;

    const where: any = {
      employeeId: isEmployee ? req.user!.sub : undefined,
      projectId: q.projectId,
      expenseDate: q.dateFrom || q.dateTo ? { gte: q.dateFrom, lte: q.dateTo } : undefined,
    };

    const claims = await prisma.claim.findMany({
      where,
      include: { payments: true, project: true },
    });

    let totalPendingClaims = 0;
    let totalApprovedClaims = 0;
    let totalPaidClaims = 0;
    let totalOnHoldClaims = 0;
    let totalRejectedClaims = 0;
    let pendingReimbursementAmount = 0;
    let totalSubmittedAmount = 0;
    let totalApprovedAmount = 0;
    let totalPaidAmount = 0;

    const statusBreakdown: Record<string, number> = {};
    const projectMap = new Map<
      string,
      { projectId: string; name: string; city: string | null; totalClaims: number; claimedAmount: number; approvedAmount: number; paidAmount: number; pendingAmount: number }
    >();

    for (const c of claims) {
      const totalPaid = c.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
      const approvedAmount = c.approvedAmount != null ? Number(c.approvedAmount) : 0;
      const amount = Number(c.amount);

      statusBreakdown[c.status] = (statusBreakdown[c.status] ?? 0) + 1;
      totalSubmittedAmount += amount;
      totalPaidAmount += totalPaid;

      if (PENDING_REVIEW_STATUSES.includes(c.status)) totalPendingClaims++;
      if (c.status === ClaimStatus.ON_HOLD) totalOnHoldClaims++;
      if (c.status === ClaimStatus.REJECTED) totalRejectedClaims++;
      if (
        c.status === ClaimStatus.APPROVED ||
        c.status === ClaimStatus.PENDING_PAYMENT ||
        c.status === ClaimStatus.PARTIALLY_PAID ||
        c.status === ClaimStatus.PAID
      ) {
        totalApprovedClaims++;
        totalApprovedAmount += approvedAmount;
      }
      if (c.status === ClaimStatus.PAID) totalPaidClaims++;
      if (AWAITING_PAYMENT_STATUSES.includes(c.status)) {
        pendingReimbursementAmount += Math.max(approvedAmount - totalPaid, 0);
      }

      if (!projectMap.has(c.projectId)) {
        projectMap.set(c.projectId, {
          projectId: c.projectId,
          name: c.project.name,
          city: c.project.city,
          totalClaims: 0,
          claimedAmount: 0,
          approvedAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
        });
      }
      const p = projectMap.get(c.projectId)!;
      p.totalClaims++;
      p.claimedAmount += amount;
      p.approvedAmount += approvedAmount;
      p.paidAmount += totalPaid;
      if (AWAITING_PAYMENT_STATUSES.includes(c.status)) {
        p.pendingAmount += Math.max(approvedAmount - totalPaid, 0);
      }
    }

    res.json({
      totalClaims: claims.length,
      totalPendingClaims,
      totalOnHoldClaims,
      totalRejectedClaims,
      totalApprovedClaims,
      totalPaidClaims,
      pendingReimbursementAmount,
      totalSubmittedAmount,
      totalApprovedAmount,
      totalPaidAmount,
      statusBreakdown,
      projectStats: Array.from(projectMap.values()).sort((a, b) => b.claimedAmount - a.claimedAmount),
    });
  })
);

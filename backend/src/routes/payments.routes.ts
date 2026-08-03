import { Router } from "express";
import { z } from "zod";
import { ClaimStatus, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { validateBody } from "../middleware/validate";
import { authenticate, authorize } from "../middleware/auth";
import { logAudit } from "../utils/audit";

export const paymentRouter = Router();

paymentRouter.use(authenticate, authorize(Role.FINANCE_ADMIN));

const PAYABLE_STATUSES: ClaimStatus[] = [ClaimStatus.PENDING_PAYMENT, ClaimStatus.PARTIALLY_PAID];

paymentRouter.post(
  "/:claimId/mark-pending-payment",
  asyncHandler(async (req, res) => {
    const claim = await prisma.claim.findUnique({ where: { id: req.params.claimId } });
    if (!claim) throw ApiError.notFound("Claim not found");
    if (claim.status !== ClaimStatus.APPROVED) {
      throw ApiError.badRequest("Only approved claims can be marked as pending payment");
    }
    const updated = await prisma.claim.update({
      where: { id: claim.id },
      data: { status: ClaimStatus.PENDING_PAYMENT },
    });
    await logAudit({
      claimId: claim.id,
      action: "CLAIM_MARKED_PENDING_PAYMENT",
      fromStatus: ClaimStatus.APPROVED,
      toStatus: ClaimStatus.PENDING_PAYMENT,
      performedById: req.user!.sub,
    });
    res.json(updated);
  })
);

const recordPaymentSchema = z.object({
  paymentDate: z.coerce.date(),
  amountPaid: z.coerce.number().positive(),
  utrReference: z.string().optional(),
  remarks: z.string().optional(),
});

paymentRouter.post(
  "/:claimId",
  validateBody(recordPaymentSchema),
  asyncHandler(async (req, res) => {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.claimId },
      include: { payments: true },
    });
    if (!claim) throw ApiError.notFound("Claim not found");
    if (!PAYABLE_STATUSES.includes(claim.status)) {
      throw ApiError.badRequest("Payments can only be recorded for claims pending payment or partially paid");
    }
    if (claim.approvedAmount == null) throw ApiError.badRequest("Claim has no approved amount");

    const alreadyPaid = claim.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    const approvedAmount = Number(claim.approvedAmount);
    const remaining = approvedAmount - alreadyPaid;
    if (req.body.amountPaid > remaining + 0.01) {
      throw ApiError.badRequest(
        `Amount paid (${req.body.amountPaid}) exceeds the remaining balance (${remaining.toFixed(2)})`
      );
    }

    const fromStatus = claim.status;
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          claimId: claim.id,
          paymentDate: req.body.paymentDate,
          amountPaid: req.body.amountPaid,
          utrReference: req.body.utrReference,
          remarks: req.body.remarks,
          recordedById: req.user!.sub,
        },
      });

      const newTotalPaid = alreadyPaid + req.body.amountPaid;
      const newStatus =
        newTotalPaid >= approvedAmount - 0.01 ? ClaimStatus.PAID : ClaimStatus.PARTIALLY_PAID;

      const updatedClaim = await tx.claim.update({
        where: { id: claim.id },
        data: { status: newStatus },
        include: { payments: true },
      });

      return { payment, updatedClaim, newStatus };
    });

    await logAudit({
      claimId: claim.id,
      action: "PAYMENT_RECORDED",
      fromStatus,
      toStatus: result.newStatus,
      remarks: req.body.remarks,
      performedById: req.user!.sub,
      metadata: {
        amountPaid: req.body.amountPaid,
        utrReference: req.body.utrReference,
        paymentId: result.payment.id,
      },
    });

    if (result.newStatus === ClaimStatus.PAID) {
      await logAudit({
        claimId: claim.id,
        action: "CLAIM_MARKED_PAID",
        fromStatus: ClaimStatus.PARTIALLY_PAID,
        toStatus: ClaimStatus.PAID,
        performedById: req.user!.sub,
      });
    }

    res.status(201).json(result.updatedClaim);
  })
);

paymentRouter.get(
  "/:claimId",
  asyncHandler(async (req, res) => {
    const payments = await prisma.payment.findMany({
      where: { claimId: req.params.claimId },
      orderBy: { paymentDate: "desc" },
      include: { recordedBy: { select: { id: true, name: true } } },
    });
    res.json(payments);
  })
);

import { Router } from "express";
import { z } from "zod";
import { ClaimStatus, PaymentMode, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { authenticate, authorize } from "../middleware/auth";
import { uploadBillFiles, generateObjectKey } from "../middleware/upload";
import { uploadObject, getObjectStream, deleteObject } from "../services/storage.service";
import { generateClaimNumber } from "../utils/claimNumber";
import { logAudit } from "../utils/audit";

export const claimRouter = Router();

claimRouter.use(authenticate);

const EDITABLE_STATUSES: ClaimStatus[] = [ClaimStatus.SUBMITTED, ClaimStatus.ON_HOLD];

const createClaimSchema = z.object({
  projectId: z.string().min(1),
  categoryId: z.string().min(1),
  expenseDate: z.coerce.date(),
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  paymentMode: z.nativeEnum(PaymentMode),
});

async function attachFiles(claimId: string, files: Express.Multer.File[], performedById: string) {
  if (!files.length) return;
  const uploaded = await Promise.all(
    files.map(async (f) => {
      const key = generateObjectKey(f.originalname);
      await uploadObject(key, f.buffer, f.mimetype);
      return {
        claimId,
        fileName: f.originalname,
        filePath: key,
        mimeType: f.mimetype,
        fileSize: f.size,
      };
    })
  );
  await prisma.claimAttachment.createMany({ data: uploaded });
  await logAudit({
    claimId,
    action: "ATTACHMENT_ADDED",
    performedById,
    metadata: { count: files.length, fileNames: files.map((f) => f.originalname) },
  });
}

claimRouter.post(
  "/",
  authorize(Role.EMPLOYEE),
  uploadBillFiles.array("files", 10),
  asyncHandler(async (req, res) => {
    const parsed = createClaimSchema.parse(req.body);
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) {
      throw ApiError.badRequest("At least one bill attachment (JPG/PNG/PDF) is required");
    }

    const project = await prisma.project.findUnique({ where: { id: parsed.projectId } });
    if (!project || !project.isActive) throw ApiError.badRequest("Invalid or inactive project");
    const category = await prisma.expenseCategory.findUnique({ where: { id: parsed.categoryId } });
    if (!category || !category.isActive) throw ApiError.badRequest("Invalid or inactive expense category");

    const claimNumber = await generateClaimNumber();

    const claim = await prisma.claim.create({
      data: {
        claimNumber,
        employeeId: req.user!.sub,
        projectId: parsed.projectId,
        categoryId: parsed.categoryId,
        expenseDate: parsed.expenseDate,
        amount: parsed.amount,
        description: parsed.description,
        paymentMode: parsed.paymentMode,
        status: ClaimStatus.SUBMITTED,
      },
    });

    await attachFiles(claim.id, files, req.user!.sub);
    await logAudit({
      claimId: claim.id,
      action: "CLAIM_SUBMITTED",
      toStatus: ClaimStatus.SUBMITTED,
      performedById: req.user!.sub,
    });

    const full = await prisma.claim.findUnique({
      where: { id: claim.id },
      include: { attachments: true, project: true, category: true },
    });
    res.status(201).json(full);
  })
);

const listQuerySchema = z.object({
  employeeId: z.string().optional(),
  projectId: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.nativeEnum(ClaimStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(25),
});

claimRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    const isEmployee = req.user!.role === Role.EMPLOYEE;

    const where: any = {
      employeeId: isEmployee ? req.user!.sub : q.employeeId,
      projectId: q.projectId,
      categoryId: q.categoryId,
      status: q.status,
      expenseDate:
        q.dateFrom || q.dateTo
          ? { gte: q.dateFrom, lte: q.dateTo }
          : undefined,
      ...(q.search
        ? {
            OR: [
              { claimNumber: { contains: q.search, mode: "insensitive" } },
              { description: { contains: q.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, claims] = await Promise.all([
      prisma.claim.count({ where }),
      prisma.claim.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          employee: { select: { id: true, name: true, email: true, city: true } },
          project: true,
          category: true,
          attachments: true,
          payments: true,
        },
      }),
    ]);

    const withBalance = claims.map((c) => enrichClaim(c));

    res.json({ total, page: q.page, pageSize: q.pageSize, items: withBalance });
  })
);

function enrichClaim(c: any) {
  const totalPaid = c.payments.reduce((sum: number, p: any) => sum + Number(p.amountPaid), 0);
  const approvedAmount = c.approvedAmount != null ? Number(c.approvedAmount) : null;
  const balance = approvedAmount != null ? Math.max(approvedAmount - totalPaid, 0) : null;
  return { ...c, totalPaid, balance };
}

claimRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
      include: {
        employee: { select: { id: true, name: true, email: true, city: true } },
        project: true,
        category: true,
        attachments: true,
        payments: { orderBy: { paymentDate: "desc" }, include: { recordedBy: { select: { id: true, name: true } } } },
        reviewedBy: { select: { id: true, name: true } },
        auditLogs: {
          orderBy: { performedAt: "desc" },
          include: { performedBy: { select: { id: true, name: true, role: true } } },
        },
      },
    });
    if (!claim) throw ApiError.notFound("Claim not found");
    if (req.user!.role === Role.EMPLOYEE && claim.employeeId !== req.user!.sub) {
      throw ApiError.forbidden("You cannot view this claim");
    }
    res.json(enrichClaim(claim));
  })
);

const updateClaimSchema = z.object({
  projectId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  expenseDate: z.coerce.date().optional(),
  amount: z.coerce.number().positive().optional(),
  description: z.string().min(1).optional(),
  paymentMode: z.nativeEnum(PaymentMode).optional(),
  removeAttachmentIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v])),
});

claimRouter.patch(
  "/:id",
  authorize(Role.EMPLOYEE),
  uploadBillFiles.array("files", 10),
  asyncHandler(async (req, res) => {
    const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: { attachments: true } });
    if (!claim) throw ApiError.notFound("Claim not found");
    if (claim.employeeId !== req.user!.sub) throw ApiError.forbidden("You cannot edit this claim");
    if (!EDITABLE_STATUSES.includes(claim.status)) {
      throw ApiError.badRequest("This claim can no longer be edited as it has already been approved or is past review");
    }

    const parsed = updateClaimSchema.parse(req.body);
    const newFiles = (req.files as Express.Multer.File[]) ?? [];

    const remainingCount = claim.attachments.length - parsed.removeAttachmentIds.length + newFiles.length;
    if (remainingCount <= 0) {
      throw ApiError.badRequest("A claim must have at least one bill attachment");
    }

    const uploadedFiles = await Promise.all(
      newFiles.map(async (f) => {
        const key = generateObjectKey(f.originalname);
        await uploadObject(key, f.buffer, f.mimetype);
        return {
          claimId: claim.id,
          fileName: f.originalname,
          filePath: key,
          mimeType: f.mimetype,
          fileSize: f.size,
        };
      })
    );

    const fromStatus = claim.status;
    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.removeAttachmentIds.length) {
        const toRemove = claim.attachments.filter((a) => parsed.removeAttachmentIds.includes(a.id));
        await tx.claimAttachment.deleteMany({ where: { id: { in: parsed.removeAttachmentIds } } });
        for (const att of toRemove) {
          deleteObject(att.filePath).catch(() => undefined);
        }
      }
      if (uploadedFiles.length) {
        await tx.claimAttachment.createMany({ data: uploadedFiles });
      }
      return tx.claim.update({
        where: { id: claim.id },
        data: {
          projectId: parsed.projectId,
          categoryId: parsed.categoryId,
          expenseDate: parsed.expenseDate,
          amount: parsed.amount,
          description: parsed.description,
          paymentMode: parsed.paymentMode,
          status: ClaimStatus.SUBMITTED,
          remarks: null,
        },
        include: { attachments: true, project: true, category: true },
      });
    });

    await logAudit({
      claimId: claim.id,
      action: "CLAIM_EDITED",
      fromStatus,
      toStatus: ClaimStatus.SUBMITTED,
      performedById: req.user!.sub,
    });

    res.json(updated);
  })
);

claimRouter.get(
  "/:id/attachments/:attachmentId/file",
  asyncHandler(async (req, res) => {
    const attachment = await prisma.claimAttachment.findUnique({
      where: { id: req.params.attachmentId },
      include: { claim: true },
    });
    if (!attachment || attachment.claimId !== req.params.id) throw ApiError.notFound("Attachment not found");
    if (req.user!.role === Role.EMPLOYEE && attachment.claim.employeeId !== req.user!.sub) {
      throw ApiError.forbidden("You cannot view this attachment");
    }
    let stream;
    try {
      stream = await getObjectStream(attachment.filePath);
    } catch {
      throw ApiError.notFound("File not found in storage");
    }
    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
    stream.pipe(res);
  })
);

const reviewSchema = z.object({
  decision: z.enum([ClaimStatus.APPROVED, ClaimStatus.REJECTED, ClaimStatus.ON_HOLD]),
  remarks: z.string().optional(),
  approvedAmount: z.coerce.number().positive().optional(),
});

claimRouter.patch(
  "/:id/review",
  authorize(Role.FINANCE_ADMIN),
  asyncHandler(async (req, res) => {
    const parsed = reviewSchema.parse(req.body);
    const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
    if (!claim) throw ApiError.notFound("Claim not found");
    if (!EDITABLE_STATUSES.includes(claim.status)) {
      throw ApiError.badRequest("Only submitted or on-hold claims can be reviewed");
    }
    if (parsed.decision !== ClaimStatus.APPROVED && !parsed.remarks) {
      throw ApiError.badRequest("Remarks are required when rejecting or putting a claim on hold");
    }

    const fromStatus = claim.status;
    const updated = await prisma.claim.update({
      where: { id: claim.id },
      data: {
        status: parsed.decision,
        remarks: parsed.remarks,
        reviewedById: req.user!.sub,
        reviewedAt: new Date(),
        approvedAmount:
          parsed.decision === ClaimStatus.APPROVED
            ? parsed.approvedAmount ?? claim.amount
            : parsed.decision === ClaimStatus.REJECTED
            ? null
            : claim.approvedAmount,
      },
    });

    const actionMap: Record<string, any> = {
      [ClaimStatus.APPROVED]: "CLAIM_APPROVED",
      [ClaimStatus.REJECTED]: "CLAIM_REJECTED",
      [ClaimStatus.ON_HOLD]: "CLAIM_ON_HOLD",
    };

    await logAudit({
      claimId: claim.id,
      action: actionMap[parsed.decision],
      fromStatus,
      toStatus: parsed.decision,
      remarks: parsed.remarks,
      performedById: req.user!.sub,
    });

    res.json(updated);
  })
);

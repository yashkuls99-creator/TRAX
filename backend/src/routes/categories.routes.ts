import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { validateBody } from "../middleware/validate";
import { authenticate, authorize } from "../middleware/auth";
import { logAudit } from "../utils/audit";

export const categoryRouter = Router();

categoryRouter.use(authenticate);

categoryRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { isActive } = req.query as Record<string, string | undefined>;
    const categories = await prisma.expenseCategory.findMany({
      where: { isActive: isActive !== undefined ? isActive === "true" : undefined },
      orderBy: { name: "asc" },
    });
    res.json(categories);
  })
);

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

categoryRouter.post(
  "/",
  authorize(Role.FINANCE_ADMIN),
  validateBody(categorySchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.expenseCategory.findUnique({ where: { name: req.body.name } });
    if (existing) throw ApiError.conflict("A category with this name already exists");
    const category = await prisma.expenseCategory.create({ data: req.body });
    await logAudit({ action: "CATEGORY_CREATED", performedById: req.user!.sub, metadata: { categoryId: category.id } });
    res.status(201).json(category);
  })
);

const updateCategorySchema = categorySchema.partial().extend({ isActive: z.boolean().optional() });

categoryRouter.patch(
  "/:id",
  authorize(Role.FINANCE_ADMIN),
  validateBody(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await prisma.expenseCategory.findUnique({ where: { id: req.params.id } });
    if (!category) throw ApiError.notFound("Category not found");
    const updated = await prisma.expenseCategory.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ action: "CATEGORY_UPDATED", performedById: req.user!.sub, metadata: { categoryId: updated.id, changes: req.body } });
    res.json(updated);
  })
);

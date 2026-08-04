import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { validateBody } from "../middleware/validate";
import { authenticate, authorize } from "../middleware/auth";
import { logAudit } from "../utils/audit";

export const projectRouter = Router();

projectRouter.use(authenticate);

projectRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { isActive } = req.query as Record<string, string | undefined>;
    const projects = await prisma.project.findMany({
      where: { isActive: isActive !== undefined ? isActive === "true" : undefined },
      orderBy: { name: "asc" },
    });
    res.json(projects);
  })
);

const projectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  city: z.string().optional(),
  description: z.string().optional(),
});

projectRouter.post(
  "/",
  authorize(Role.FINANCE_ADMIN),
  validateBody(projectSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.project.findUnique({ where: { code: req.body.code } });
    if (existing) throw ApiError.conflict("A project with this code already exists");
    const project = await prisma.project.create({ data: req.body });
    await logAudit({ action: "PROJECT_CREATED", performedById: req.user!.sub, metadata: { projectId: project.id } });
    res.status(201).json(project);
  })
);

const updateProjectSchema = projectSchema.partial().extend({ isActive: z.boolean().optional() });

projectRouter.patch(
  "/:id",
  authorize(Role.FINANCE_ADMIN),
  validateBody(updateProjectSchema),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) throw ApiError.notFound("Project not found");
    if (req.body.code && req.body.code !== project.code) {
      const existing = await prisma.project.findUnique({ where: { code: req.body.code } });
      if (existing) throw ApiError.conflict("A project with this code already exists");
    }
    const updated = await prisma.project.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ action: "PROJECT_UPDATED", performedById: req.user!.sub, metadata: { projectId: updated.id, changes: req.body } });
    res.json(updated);
  })
);

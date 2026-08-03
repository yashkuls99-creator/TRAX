import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { validateBody } from "../middleware/validate";
import { authenticate, authorize } from "../middleware/auth";
import { logAudit } from "../utils/audit";

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get(
  "/",
  authorize(Role.FINANCE_ADMIN),
  asyncHandler(async (req, res) => {
    const { role, isActive, search } = req.query as Record<string, string | undefined>;
    const users = await prisma.user.findMany({
      where: {
        role: role ? (role as Role) : undefined,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      include: { projectAccess: { include: { project: true } } },
    });
    res.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        city: u.city,
        isActive: u.isActive,
        createdAt: u.createdAt,
        projects: u.projectAccess.map((pa) => ({ id: pa.project.id, name: pa.project.name })),
      }))
    );
  })
);

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role).default(Role.EMPLOYEE),
  phone: z.string().optional(),
  city: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
});

userRouter.post(
  "/",
  authorize(Role.FINANCE_ADMIN),
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role, phone, city, projectIds } = req.body;
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw ApiError.conflict("A user with this email already exists");

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        phone,
        city,
        projectAccess: projectIds?.length
          ? { create: projectIds.map((projectId: string) => ({ projectId })) }
          : undefined,
      },
    });

    await logAudit({
      action: "USER_CREATED",
      performedById: req.user!.sub,
      metadata: { targetUserId: user.id, email: user.email, role: user.role },
    });

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  })
);

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
  projectIds: z.array(z.string()).optional(),
});

userRouter.patch(
  "/:id",
  authorize(Role.FINANCE_ADMIN),
  validateBody(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("User not found");

    const { password, projectIds, ...rest } = req.body;
    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: data as any });
      if (projectIds) {
        await tx.projectAssignment.deleteMany({ where: { userId: id } });
        if (projectIds.length) {
          await tx.projectAssignment.createMany({
            data: projectIds.map((projectId: string) => ({ userId: id, projectId })),
            skipDuplicates: true,
          });
        }
      }
      return updated;
    });

    await logAudit({
      action: existing.isActive && data.isActive === false ? "USER_DEACTIVATED" : "USER_UPDATED",
      performedById: req.user!.sub,
      metadata: { targetUserId: id, changes: data },
    });

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive });
  })
);

userRouter.get(
  "/me/projects",
  asyncHandler(async (req, res) => {
    const assignments = await prisma.projectAssignment.findMany({
      where: { userId: req.user!.sub },
      include: { project: true },
    });
    res.json(assignments.filter((a) => a.project.isActive).map((a) => a.project));
  })
);

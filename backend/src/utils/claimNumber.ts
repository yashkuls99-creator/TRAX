import { prisma } from "../config/prisma";

export async function generateClaimNumber(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `RMB-${yearMonth}-`;

  const count = await prisma.claim.count({
    where: { claimNumber: { startsWith: prefix } },
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `${prefix}${sequence}`;
}

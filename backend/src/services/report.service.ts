import { ClaimStatus } from "@prisma/client";
import { prisma } from "../config/prisma";

export interface MonthlyReportFilters {
  month: number; // 1-12
  year: number;
  projectId?: string;
  employeeId?: string;
}

export interface ReportRow {
  id: string;
  name: string;
  city?: string | null;
  totalClaims: number;
  claimedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  pendingAmount: number;
  outstandingBalance: number;
}

export interface MonthlyReport {
  month: number;
  year: number;
  employeeWise: ReportRow[];
  projectWise: ReportRow[];
  totals: Omit<ReportRow, "id" | "name" | "city">;
}

const APPROVED_ONWARDS: ClaimStatus[] = [
  ClaimStatus.APPROVED,
  ClaimStatus.PENDING_PAYMENT,
  ClaimStatus.PARTIALLY_PAID,
  ClaimStatus.PAID,
];
const AWAITING_APPROVAL: ClaimStatus[] = [ClaimStatus.SUBMITTED, ClaimStatus.ON_HOLD];

export async function buildMonthlyReport(filters: MonthlyReportFilters): Promise<MonthlyReport> {
  const start = new Date(Date.UTC(filters.year, filters.month - 1, 1));
  const end = new Date(Date.UTC(filters.year, filters.month, 1));

  const claims = await prisma.claim.findMany({
    where: {
      expenseDate: { gte: start, lt: end },
      projectId: filters.projectId,
      employeeId: filters.employeeId,
    },
    include: { payments: true, employee: true, project: true },
  });

  const employeeMap = new Map<string, ReportRow>();
  const projectMap = new Map<string, ReportRow>();
  const totals: Omit<ReportRow, "id" | "name" | "city"> = {
    totalClaims: 0,
    claimedAmount: 0,
    approvedAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    outstandingBalance: 0,
  };

  function upsert(map: Map<string, ReportRow>, id: string, name: string, city: string | null | undefined) {
    if (!map.has(id)) {
      map.set(id, {
        id,
        name,
        city,
        totalClaims: 0,
        claimedAmount: 0,
        approvedAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        outstandingBalance: 0,
      });
    }
    return map.get(id)!;
  }

  for (const c of claims) {
    const amount = Number(c.amount);
    const approvedAmount = c.approvedAmount != null ? Number(c.approvedAmount) : 0;
    const paidAmount = c.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    const isApprovedOnwards = APPROVED_ONWARDS.includes(c.status);
    const isAwaitingApproval = AWAITING_APPROVAL.includes(c.status);
    const outstanding = isApprovedOnwards ? Math.max(approvedAmount - paidAmount, 0) : 0;
    const pending = isAwaitingApproval ? amount : 0;

    const emp = upsert(employeeMap, c.employeeId, c.employee.name, c.employee.city);
    emp.totalClaims++;
    emp.claimedAmount += amount;
    emp.approvedAmount += isApprovedOnwards ? approvedAmount : 0;
    emp.paidAmount += paidAmount;
    emp.pendingAmount += pending;
    emp.outstandingBalance += outstanding;

    const proj = upsert(projectMap, c.projectId, c.project.name, c.project.city);
    proj.totalClaims++;
    proj.claimedAmount += amount;
    proj.approvedAmount += isApprovedOnwards ? approvedAmount : 0;
    proj.paidAmount += paidAmount;
    proj.pendingAmount += pending;
    proj.outstandingBalance += outstanding;

    totals.totalClaims++;
    totals.claimedAmount += amount;
    totals.approvedAmount += isApprovedOnwards ? approvedAmount : 0;
    totals.paidAmount += paidAmount;
    totals.pendingAmount += pending;
    totals.outstandingBalance += outstanding;
  }

  return {
    month: filters.month,
    year: filters.year,
    employeeWise: Array.from(employeeMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    projectWise: Array.from(projectMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    totals,
  };
}

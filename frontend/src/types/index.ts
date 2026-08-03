export type Role = "EMPLOYEE" | "FINANCE_ADMIN";

export type ClaimStatus =
  | "SUBMITTED"
  | "ON_HOLD"
  | "APPROVED"
  | "REJECTED"
  | "PENDING_PAYMENT"
  | "PARTIALLY_PAID"
  | "PAID";

export type PaymentMode = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  city?: string | null;
  phone?: string | null;
  isActive?: boolean;
  createdAt?: string;
  projects?: { id: string; name: string }[];
}

export interface Project {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  description?: string | null;
  isActive: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface Attachment {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface Payment {
  id: string;
  claimId: string;
  paymentDate: string;
  amountPaid: number;
  utrReference?: string | null;
  remarks?: string | null;
  recordedBy?: { id: string; name: string };
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  fromStatus?: ClaimStatus | null;
  toStatus?: ClaimStatus | null;
  remarks?: string | null;
  metadata?: Record<string, unknown> | null;
  performedBy: { id: string; name: string; role: Role };
  performedAt: string;
}

export interface Claim {
  id: string;
  claimNumber: string;
  employeeId: string;
  employee: { id: string; name: string; email: string; city?: string | null };
  projectId: string;
  project: Project;
  categoryId: string;
  category: ExpenseCategory;
  expenseDate: string;
  amount: number;
  description: string;
  paymentMode: PaymentMode;
  status: ClaimStatus;
  approvedAmount: number | null;
  remarks?: string | null;
  reviewedBy?: { id: string; name: string } | null;
  reviewedAt?: string | null;
  attachments: Attachment[];
  payments: Payment[];
  auditLogs?: AuditLog[];
  totalPaid: number;
  balance: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalClaims: number;
  totalPendingClaims: number;
  totalOnHoldClaims: number;
  totalRejectedClaims: number;
  totalApprovedClaims: number;
  totalPaidClaims: number;
  pendingReimbursementAmount: number;
  totalSubmittedAmount: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
  statusBreakdown: Record<string, number>;
  projectStats: {
    projectId: string;
    name: string;
    city: string | null;
    totalClaims: number;
    claimedAmount: number;
    approvedAmount: number;
    paidAmount: number;
    pendingAmount: number;
  }[];
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

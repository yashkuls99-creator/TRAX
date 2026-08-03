import { api } from "./client";
import {
  Claim,
  ClaimStatus,
  DashboardSummary,
  ExpenseCategory,
  MonthlyReport,
  PaymentMode,
  Project,
  User,
} from "../types";

// Auth
export const AuthApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: User }>("/auth/login", { email, password }),
  refresh: () => api.post<{ accessToken: string; user: User }>("/auth/refresh"),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<User>("/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
};

// Users
export const UsersApi = {
  list: (params?: { role?: string; isActive?: boolean; search?: string }) =>
    api.get<User[]>("/users", { params }),
  create: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
    city?: string;
    projectIds?: string[];
  }) => api.post<User>("/users", data),
  update: (id: string, data: Partial<User> & { password?: string; projectIds?: string[] }) =>
    api.patch<User>(`/users/${id}`, data),
  myProjects: () => api.get<Project[]>("/users/me/projects"),
};

// Projects
export const ProjectsApi = {
  list: (isActive?: boolean) => api.get<Project[]>("/projects", { params: { isActive } }),
  create: (data: { name: string; code: string; city?: string; description?: string }) =>
    api.post<Project>("/projects", data),
  update: (id: string, data: Partial<Project>) => api.patch<Project>(`/projects/${id}`, data),
};

// Categories
export const CategoriesApi = {
  list: (isActive?: boolean) => api.get<ExpenseCategory[]>("/categories", { params: { isActive } }),
  create: (data: { name: string; description?: string }) => api.post<ExpenseCategory>("/categories", data),
  update: (id: string, data: Partial<ExpenseCategory>) =>
    api.patch<ExpenseCategory>(`/categories/${id}`, data),
};

export interface ClaimListFilters {
  employeeId?: string;
  projectId?: string;
  categoryId?: string;
  status?: ClaimStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ClaimListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: Claim[];
}

export interface ClaimFormInput {
  projectId: string;
  categoryId: string;
  expenseDate: string;
  amount: number;
  description: string;
  paymentMode: PaymentMode;
  files?: File[];
  removeAttachmentIds?: string[];
}

function toClaimFormData(input: ClaimFormInput) {
  const fd = new FormData();
  fd.append("projectId", input.projectId);
  fd.append("categoryId", input.categoryId);
  fd.append("expenseDate", input.expenseDate);
  fd.append("amount", String(input.amount));
  fd.append("description", input.description);
  fd.append("paymentMode", input.paymentMode);
  (input.files ?? []).forEach((f) => fd.append("files", f));
  (input.removeAttachmentIds ?? []).forEach((id) => fd.append("removeAttachmentIds", id));
  return fd;
}

// Claims
export const ClaimsApi = {
  list: (filters: ClaimListFilters) => api.get<ClaimListResponse>("/claims", { params: filters }),
  get: (id: string) => api.get<Claim>(`/claims/${id}`),
  create: (input: ClaimFormInput) =>
    api.post<Claim>("/claims", toClaimFormData(input), {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: string, input: Partial<ClaimFormInput>) =>
    api.patch<Claim>(`/claims/${id}`, toClaimFormData(input as ClaimFormInput), {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  review: (id: string, data: { decision: "APPROVED" | "REJECTED" | "ON_HOLD"; remarks?: string; approvedAmount?: number }) =>
    api.patch<Claim>(`/claims/${id}/review`, data),
  openAttachment: async (claimId: string, attachmentId: string, fileName: string) => {
    const res = await api.get(`/claims/${claimId}/attachments/${attachmentId}/file`, {
      responseType: "blob",
    });
    const blobUrl = URL.createObjectURL(res.data as Blob);
    const isPdf = fileName.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    } else {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  },
};

// Payments
export const PaymentsApi = {
  markPendingPayment: (claimId: string) => api.post<Claim>(`/payments/${claimId}/mark-pending-payment`),
  record: (
    claimId: string,
    data: { paymentDate: string; amountPaid: number; utrReference?: string; remarks?: string }
  ) => api.post<Claim>(`/payments/${claimId}`, data),
};

// Dashboard
export const DashboardApi = {
  summary: (params?: { projectId?: string; dateFrom?: string; dateTo?: string }) =>
    api.get<DashboardSummary>("/dashboard/summary", { params }),
};

// Reports
export const ReportsApi = {
  monthly: (params: { month: number; year: number; projectId?: string; employeeId?: string }) =>
    api.get<MonthlyReport>("/reports/monthly", { params }),
  download: async (
    format: "excel" | "pdf",
    params: { month: number; year: number; projectId?: string; employeeId?: string }
  ) => {
    const res = await api.get(`/reports/monthly/export/${format}`, {
      params,
      responseType: "blob",
    });
    const ext = format === "excel" ? "xlsx" : "pdf";
    const blobUrl = URL.createObjectURL(res.data as Blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `reimbursement-report-${params.month}-${params.year}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  },
};

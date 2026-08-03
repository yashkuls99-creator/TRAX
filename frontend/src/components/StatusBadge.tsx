import { ClaimStatus } from "../types";

const STYLES: Record<ClaimStatus, string> = {
  SUBMITTED: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  ON_HOLD: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  APPROVED: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  REJECTED: "bg-red-50 text-red-700 ring-1 ring-red-200",
  PENDING_PAYMENT: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  PARTIALLY_PAID: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
  PAID: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

const LABELS: Record<ClaimStatus, string> = {
  SUBMITTED: "Submitted",
  ON_HOLD: "On Hold",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PENDING_PAYMENT: "Pending Payment",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
};

export function StatusBadge({ status }: { status: ClaimStatus }) {
  return <span className={`badge ${STYLES[status]}`}>{LABELS[status]}</span>;
}

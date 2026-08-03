export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(date)
  );
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  CLAIM_SUBMITTED: "Claim submitted",
  CLAIM_EDITED: "Claim edited & resubmitted",
  CLAIM_APPROVED: "Claim approved",
  CLAIM_REJECTED: "Claim rejected",
  CLAIM_ON_HOLD: "Claim put on hold",
  CLAIM_MARKED_PENDING_PAYMENT: "Marked as pending payment",
  PAYMENT_RECORDED: "Payment recorded",
  CLAIM_MARKED_PAID: "Claim fully paid",
  ATTACHMENT_ADDED: "Attachment(s) added",
  ATTACHMENT_REMOVED: "Attachment removed",
};

import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CategoriesApi, ClaimsApi, PaymentsApi, UsersApi } from "../api/resources";
import { apiErrorMessage } from "../api/client";
import { Claim, ExpenseCategory, PaymentMode, Project } from "../types";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { Modal } from "../components/Modal";
import { FileDropzone } from "../components/FileDropzone";
import { FullPageSpinner, Spinner } from "../components/Spinner";
import { AUDIT_ACTION_LABELS, formatCurrency, formatDate, formatDateTime, PAYMENT_MODE_LABELS } from "../utils/format";

const EDITABLE_STATUSES = new Set(["SUBMITTED", "ON_HOLD"]);
const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

export function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "FINANCE_ADMIN";
  const backTo = isAdmin ? "/admin/claims" : "/employee/claims";

  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [reviewModal, setReviewModal] = useState<null | "APPROVED" | "REJECTED" | "ON_HOLD">(null);
  const [paymentModal, setPaymentModal] = useState(false);

  async function load() {
    if (!id) return;
    const res = await ClaimsApi.get(id);
    setClaim(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading || !claim) return <FullPageSpinner />;

  const canEdit = !isAdmin && claim.employeeId === user?.id && EDITABLE_STATUSES.has(claim.status);
  const canReview = isAdmin && EDITABLE_STATUSES.has(claim.status);
  const canMarkPendingPayment = isAdmin && claim.status === "APPROVED";
  const canRecordPayment = isAdmin && (claim.status === "PENDING_PAYMENT" || claim.status === "PARTIALLY_PAID");

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to={backTo} className="text-xs text-ink-faint hover:text-ink-light">
            &larr; Back to claims
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl font-semibold text-ink">{claim.claimNumber}</h1>
            <StatusBadge status={claim.status} />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canEdit && !editing && (
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              Edit Claim
            </button>
          )}
          {canReview && (
            <>
              <button className="btn-secondary" onClick={() => setReviewModal("ON_HOLD")}>
                Put on Hold
              </button>
              <button className="btn-danger" onClick={() => setReviewModal("REJECTED")}>
                Reject
              </button>
              <button className="btn-primary" onClick={() => setReviewModal("APPROVED")}>
                Approve
              </button>
            </>
          )}
          {canMarkPendingPayment && (
            <button
              className="btn-primary"
              onClick={async () => {
                try {
                  await PaymentsApi.markPendingPayment(claim.id);
                  toast.success("Claim marked as pending payment");
                  load();
                } catch (err) {
                  toast.error(apiErrorMessage(err));
                }
              }}
            >
              Mark Pending Payment
            </button>
          )}
          {canRecordPayment && (
            <button className="btn-primary" onClick={() => setPaymentModal(true)}>
              Record Payment
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <EditClaimForm
          claim={claim}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setClaim(updated);
            setEditing(false);
            toast.success("Claim updated and resubmitted");
          }}
        />
      ) : (
        <ClaimSummary claim={claim} />
      )}

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">Bill Attachments ({claim.attachments.length})</h2>
        <div className="flex flex-wrap gap-2">
          {claim.attachments.map((a) => (
            <button
              key={a.id}
              onClick={() => ClaimsApi.openAttachment(claim.id, a.id, a.fileName)}
              className="flex items-center gap-2 rounded-lg border border-ink-faint/25 px-3 py-2 text-xs hover:bg-surface-subtle"
            >
              <span>{a.mimeType === "application/pdf" ? "📄" : "🖼️"}</span>
              <span className="truncate max-w-[160px] text-ink">{a.fileName}</span>
            </button>
          ))}
        </div>
      </div>

      {claim.payments.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Payment History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint border-b border-ink-faint/15">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">UTR / Reference</th>
                  <th className="pb-2 font-medium">Remarks</th>
                  <th className="pb-2 font-medium">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {claim.payments.map((p) => (
                  <tr key={p.id} className="border-b border-ink-faint/10 last:border-0">
                    <td className="py-2 text-ink-light">{formatDate(p.paymentDate)}</td>
                    <td className="py-2 text-ink font-medium">{formatCurrency(p.amountPaid)}</td>
                    <td className="py-2 text-ink-light">{p.utrReference || "-"}</td>
                    <td className="py-2 text-ink-light">{p.remarks || "-"}</td>
                    <td className="py-2 text-ink-light">{p.recordedBy?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {claim.approvedAmount != null && (
            <div className="mt-3 flex gap-6 text-sm">
              <span className="text-ink-light">
                Approved: <span className="font-medium text-ink">{formatCurrency(claim.approvedAmount)}</span>
              </span>
              <span className="text-ink-light">
                Paid: <span className="font-medium text-ink">{formatCurrency(claim.totalPaid)}</span>
              </span>
              <span className="text-ink-light">
                Balance: <span className="font-medium text-ink">{formatCurrency(claim.balance)}</span>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-3">Audit Trail</h2>
        <ol className="space-y-3">
          {claim.auditLogs?.map((log) => (
            <li key={log.id} className="flex gap-3 text-sm">
              <div className="mt-1 h-2 w-2 rounded-full bg-brand-500 shrink-0" />
              <div>
                <p className="text-ink">
                  <span className="font-medium">{AUDIT_ACTION_LABELS[log.action] ?? log.action}</span>{" "}
                  <span className="text-ink-faint">by {log.performedBy.name}</span>
                </p>
                {log.remarks && <p className="text-ink-light text-xs mt-0.5">"{log.remarks}"</p>}
                <p className="text-ink-faint text-xs mt-0.5">{formatDateTime(log.performedAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {reviewModal && (
        <ReviewModal
          claim={claim}
          decision={reviewModal}
          onClose={() => setReviewModal(null)}
          onDone={(updated) => {
            setClaim(updated);
            setReviewModal(null);
            load();
          }}
        />
      )}

      {paymentModal && (
        <RecordPaymentModal
          claim={claim}
          onClose={() => setPaymentModal(false)}
          onDone={(updated) => {
            setClaim(updated);
            setPaymentModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function ClaimSummary({ claim }: { claim: Claim }) {
  return (
    <div className="card p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
      <Field label="Employee" value={claim.employee.name} />
      <Field label="Project" value={claim.project.name} />
      <Field label="Category" value={claim.category.name} />
      <Field label="Expense Date" value={formatDate(claim.expenseDate)} />
      <Field label="Amount Claimed" value={formatCurrency(claim.amount)} />
      <Field label="Payment Mode" value={PAYMENT_MODE_LABELS[claim.paymentMode]} />
      {claim.approvedAmount != null && <Field label="Approved Amount" value={formatCurrency(claim.approvedAmount)} />}
      {claim.reviewedBy && <Field label="Reviewed By" value={claim.reviewedBy.name} />}
      <div className="col-span-2 sm:col-span-3">
        <p className="label mb-1">Description</p>
        <p className="text-ink">{claim.description}</p>
      </div>
      {claim.remarks && (
        <div className="col-span-2 sm:col-span-3">
          <p className="label mb-1">Latest Remarks</p>
          <p className="text-ink">{claim.remarks}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label mb-0.5">{label}</p>
      <p className="text-ink font-medium">{value}</p>
    </div>
  );
}

function EditClaimForm({
  claim,
  onCancel,
  onSaved,
}: {
  claim: Claim;
  onCancel: () => void;
  onSaved: (c: Claim) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [removeIds, setRemoveIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    projectId: claim.projectId,
    categoryId: claim.categoryId,
    expenseDate: claim.expenseDate.slice(0, 10),
    amount: String(claim.amount),
    description: claim.description,
    paymentMode: claim.paymentMode,
  });

  useEffect(() => {
    Promise.all([UsersApi.myProjects(), CategoriesApi.list(true)]).then(([p, c]) => {
      setProjects(p.data);
      setCategories(c.data);
    });
  }, []);

  const remainingAttachments = claim.attachments.filter((a) => !removeIds.includes(a.id));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (remainingAttachments.length + newFiles.length === 0) {
      toast.error("A claim must have at least one bill attachment");
      return;
    }
    setSaving(true);
    try {
      const res = await ClaimsApi.update(claim.id, {
        projectId: form.projectId,
        categoryId: form.categoryId,
        expenseDate: form.expenseDate,
        amount: Number(form.amount),
        description: form.description,
        paymentMode: form.paymentMode,
        files: newFiles,
        removeAttachmentIds: removeIds,
      });
      onSaved(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to update claim"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">CSR Project</label>
          <select
            required
            className="input"
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Expense Category</label>
          <select
            required
            className="input"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Expense Date</label>
          <input
            type="date"
            required
            className="input"
            value={form.expenseDate}
            onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Amount (INR)</label>
          <input
            type="number"
            required
            min={1}
            step="0.01"
            className="input"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Payment Mode</label>
          <select
            required
            className="input"
            value={form.paymentMode}
            onChange={(e) => setForm({ ...form, paymentMode: e.target.value as PaymentMode })}
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          required
          rows={3}
          className="input"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div>
        <label className="label">Existing Attachments</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {claim.attachments.map((a) => {
            const marked = removeIds.includes(a.id);
            return (
              <div
                key={a.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                  marked ? "border-red-200 bg-red-50 line-through text-red-500" : "border-ink-faint/25"
                }`}
              >
                <span className="truncate max-w-[140px]">{a.fileName}</span>
                <button
                  type="button"
                  onClick={() =>
                    setRemoveIds((prev) => (marked ? prev.filter((id) => id !== a.id) : [...prev, a.id]))
                  }
                  className="text-ink-faint hover:text-red-600"
                >
                  {marked ? "Undo" : "Remove"}
                </button>
              </div>
            );
          })}
        </div>
        <label className="label">Add New Attachments</label>
        <FileDropzone files={newFiles} onChange={setNewFiles} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving && <Spinner className="h-4 w-4 text-white" />}
          Save & Resubmit
        </button>
      </div>
    </form>
  );
}

function ReviewModal({
  claim,
  decision,
  onClose,
  onDone,
}: {
  claim: Claim;
  decision: "APPROVED" | "REJECTED" | "ON_HOLD";
  onClose: () => void;
  onDone: (c: Claim) => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [approvedAmount, setApprovedAmount] = useState(String(claim.amount));
  const [submitting, setSubmitting] = useState(false);

  const titles: Record<string, string> = {
    APPROVED: "Approve Claim",
    REJECTED: "Reject Claim",
    ON_HOLD: "Put Claim on Hold",
  };

  async function submit() {
    if (decision !== "APPROVED" && !remarks.trim()) {
      toast.error("Remarks are required for this action");
      return;
    }
    setSubmitting(true);
    try {
      const res = await ClaimsApi.review(claim.id, {
        decision,
        remarks: remarks.trim() || undefined,
        approvedAmount: decision === "APPROVED" ? Number(approvedAmount) : undefined,
      });
      toast.success(`Claim ${decision === "APPROVED" ? "approved" : decision === "REJECTED" ? "rejected" : "put on hold"}`);
      onDone(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={titles[decision]}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting && <Spinner className="h-4 w-4 text-white" />}
            Confirm
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {decision === "APPROVED" && (
          <div>
            <label className="label">Approved Amount (INR)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(e.target.value)}
            />
            <p className="text-xs text-ink-faint mt-1">Claimed amount: {formatCurrency(claim.amount)}</p>
          </div>
        )}
        <div>
          <label className="label">
            Remarks {decision !== "APPROVED" && <span className="text-red-500">*</span>}
          </label>
          <textarea
            rows={3}
            className="input"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add remarks for the employee..."
          />
        </div>
      </div>
    </Modal>
  );
}

function RecordPaymentModal({
  claim,
  onClose,
  onDone,
}: {
  claim: Claim;
  onClose: () => void;
  onDone: (c: Claim) => void;
}) {
  const remaining = (claim.approvedAmount ?? 0) - claim.totalPaid;
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    amountPaid: String(remaining.toFixed(2)),
    utrReference: "",
    remarks: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await PaymentsApi.record(claim.id, {
        paymentDate: form.paymentDate,
        amountPaid: Number(form.amountPaid),
        utrReference: form.utrReference || undefined,
        remarks: form.remarks || undefined,
      });
      toast.success("Payment recorded");
      onDone(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Record Payment"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting && <Spinner className="h-4 w-4 text-white" />}
            Save Payment
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-ink-light">
          Approved: <span className="font-medium text-ink">{formatCurrency(claim.approvedAmount)}</span> &middot; Paid so far:{" "}
          <span className="font-medium text-ink">{formatCurrency(claim.totalPaid)}</span> &middot; Remaining:{" "}
          <span className="font-medium text-ink">{formatCurrency(remaining)}</span>
        </p>
        <div>
          <label className="label">Payment Date</label>
          <input
            type="date"
            className="input"
            value={form.paymentDate}
            onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Amount Paid (INR)</label>
          <input
            type="number"
            min={0.01}
            max={remaining}
            step="0.01"
            className="input"
            value={form.amountPaid}
            onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
          />
          <p className="text-xs text-ink-faint mt-1">
            Leave as-is for full payment, or reduce for a partial reimbursement.
          </p>
        </div>
        <div>
          <label className="label">UTR / Reference Number</label>
          <input
            type="text"
            className="input"
            value={form.utrReference}
            onChange={(e) => setForm({ ...form, utrReference: e.target.value })}
            placeholder="e.g. UTR1234567890"
          />
        </div>
        <div>
          <label className="label">Remarks</label>
          <textarea
            rows={2}
            className="input"
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  );
}

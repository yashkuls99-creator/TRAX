import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CategoriesApi, ClaimsApi, UsersApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { ExpenseCategory, PaymentMode, Project } from "../../types";
import { FileDropzone } from "../../components/FileDropzone";
import { Spinner } from "../../components/Spinner";

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

export function NewClaim() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    projectId: "",
    categoryId: "",
    expenseDate: "",
    amount: "",
    description: "",
    paymentMode: "CASH" as PaymentMode,
  });

  useEffect(() => {
    Promise.all([UsersApi.myProjects(), CategoriesApi.list(true)])
      .then(([projectsRes, categoriesRes]) => {
        setProjects(projectsRes.data);
        setCategories(categoriesRes.data);
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Please attach at least one bill (JPG, PNG, or PDF)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await ClaimsApi.create({
        projectId: form.projectId,
        categoryId: form.categoryId,
        expenseDate: form.expenseDate,
        amount: Number(form.amount),
        description: form.description,
        paymentMode: form.paymentMode,
        files,
      });
      toast.success(`Claim ${res.data.claimNumber} submitted successfully`);
      navigate(`/employee/claims/${res.data.id}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to submit claim"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingOptions) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-ink mb-1">New Reimbursement Claim</h1>
      <p className="text-sm text-ink-light mb-6">Fill in the expense details and attach your bill(s).</p>

      {projects.length === 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 text-amber-800 text-sm px-4 py-3 ring-1 ring-amber-200">
          You are not assigned to any CSR project yet. Please contact your Finance/Admin team.
        </div>
      )}

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
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.city ? `(${p.city})` : ""}
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
              <option value="">Select category</option>
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
              max={new Date().toISOString().slice(0, 10)}
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
              placeholder="0.00"
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
            placeholder="Describe the expense..."
          />
        </div>

        <div>
          <label className="label">Bill Attachments</label>
          <FileDropzone files={files} onChange={setFiles} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting && <Spinner className="h-4 w-4 text-white" />}
            Submit Claim
          </button>
        </div>
      </form>
    </div>
  );
}

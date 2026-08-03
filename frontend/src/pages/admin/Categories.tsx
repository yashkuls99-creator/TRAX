import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CategoriesApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { ExpenseCategory } from "../../types";
import { Modal } from "../../components/Modal";
import { FullPageSpinner, Spinner } from "../../components/Spinner";

export function Categories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCategory, setModalCategory] = useState<ExpenseCategory | "new" | null>(null);

  async function load() {
    const res = await CategoriesApi.list();
    setCategories(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Expense Categories</h1>
        <button className="btn-primary" onClick={() => setModalCategory("new")}>
          + Add Category
        </button>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-faint border-b border-ink-faint/15">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-ink-faint/10 last:border-0">
                <td className="py-2.5 text-ink font-medium">{c.name}</td>
                <td className="py-2.5 text-ink-light">{c.description || "-"}</td>
                <td className="py-2.5">
                  <span className={`badge ${c.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <button className="text-brand-600 hover:text-brand-700 font-medium text-xs" onClick={() => setModalCategory(c)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalCategory && (
        <CategoryFormModal
          category={modalCategory === "new" ? null : modalCategory}
          onClose={() => setModalCategory(null)}
          onSaved={() => {
            setModalCategory(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category: ExpenseCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    description: category?.description ?? "",
    isActive: category?.isActive ?? true,
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      if (category) {
        await CategoriesApi.update(category.id, form);
        toast.success("Category updated");
      } else {
        await CategoriesApi.create(form);
        toast.success("Category created");
      }
      onSaved();
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
      title={category ? "Edit Category" : "Add Category"}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting && <Spinner className="h-4 w-4 text-white" />}
            Save
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Category Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            rows={3}
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        {category && (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
        )}
      </div>
    </Modal>
  );
}

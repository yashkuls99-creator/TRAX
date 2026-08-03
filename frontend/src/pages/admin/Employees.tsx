import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ProjectsApi, UsersApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { Project, Role, User } from "../../types";
import { Modal } from "../../components/Modal";
import { FullPageSpinner, Spinner } from "../../components/Spinner";

export function Employees() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState<User | "new" | null>(null);

  async function load() {
    const [u, p] = await Promise.all([UsersApi.list(), ProjectsApi.list(true)]);
    setUsers(u.data);
    setProjects(p.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Employees & Admins</h1>
        <button className="btn-primary" onClick={() => setModalUser("new")}>
          + Add User
        </button>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-faint border-b border-ink-faint/15">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">City</th>
              <th className="pb-2 font-medium">Projects</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ink-faint/10 last:border-0">
                <td className="py-2.5 text-ink font-medium">{u.name}</td>
                <td className="py-2.5 text-ink-light">{u.email}</td>
                <td className="py-2.5 text-ink-light">{u.role === "FINANCE_ADMIN" ? "Finance/Admin" : "Employee"}</td>
                <td className="py-2.5 text-ink-light">{u.city || "-"}</td>
                <td className="py-2.5 text-ink-light">{u.projects?.map((p) => p.name).join(", ") || "-"}</td>
                <td className="py-2.5">
                  <span className={`badge ${u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <button className="text-brand-600 hover:text-brand-700 font-medium text-xs" onClick={() => setModalUser(u)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalUser && (
        <UserFormModal
          user={modalUser === "new" ? null : modalUser}
          projects={projects}
          onClose={() => setModalUser(null)}
          onSaved={() => {
            setModalUser(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function UserFormModal({
  user,
  projects,
  onClose,
  onSaved,
}: {
  user: User | null;
  projects: Project[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: (user?.role ?? "EMPLOYEE") as Role,
    phone: user?.phone ?? "",
    city: user?.city ?? "",
    isActive: user?.isActive ?? true,
    projectIds: user?.projects?.map((p) => p.id) ?? [],
  });
  const [submitting, setSubmitting] = useState(false);

  function toggleProject(id: string) {
    setForm((f) => ({
      ...f,
      projectIds: f.projectIds.includes(id) ? f.projectIds.filter((p) => p !== id) : [...f.projectIds, id],
    }));
  }

  async function submit() {
    setSubmitting(true);
    try {
      if (user) {
        await UsersApi.update(user.id, {
          name: form.name,
          phone: form.phone,
          city: form.city,
          role: form.role,
          isActive: form.isActive,
          password: form.password || undefined,
          projectIds: form.projectIds,
        });
        toast.success("User updated");
      } else {
        if (!form.password) {
          toast.error("Password is required for new users");
          setSubmitting(false);
          return;
        }
        await UsersApi.create({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          phone: form.phone,
          city: form.city,
          projectIds: form.projectIds,
        });
        toast.success("User created");
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
      title={user ? "Edit User" : "Add User"}
      width="max-w-xl"
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              disabled={!!user}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="EMPLOYEE">Employee</option>
              <option value="FINANCE_ADMIN">Finance/Admin</option>
            </select>
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">{user ? "Reset Password (optional)" : "Password"}</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={user ? "Leave blank to keep current" : ""}
            />
          </div>
        </div>

        {user && (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
        )}

        <div>
          <label className="label">Assigned CSR Projects</label>
          <div className="flex flex-wrap gap-2">
            {projects.map((p) => (
              <label
                key={p.id}
                className={`text-xs rounded-full px-3 py-1.5 border cursor-pointer ${
                  form.projectIds.includes(p.id)
                    ? "bg-brand-50 border-brand-300 text-brand-700"
                    : "border-ink-faint/25 text-ink-light"
                }`}
              >
                <input type="checkbox" className="hidden" checked={form.projectIds.includes(p.id)} onChange={() => toggleProject(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

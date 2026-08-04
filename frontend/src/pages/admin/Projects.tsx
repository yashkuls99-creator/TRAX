import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ProjectsApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { Project } from "../../types";
import { Modal } from "../../components/Modal";
import { FullPageSpinner, Spinner } from "../../components/Spinner";

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalProject, setModalProject] = useState<Project | "new" | null>(null);

  async function load() {
    const res = await ProjectsApi.list();
    setProjects(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <FullPageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">CSR Projects</h1>
        <button className="btn-primary" onClick={() => setModalProject("new")}>
          + Add Project
        </button>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-faint border-b border-ink-faint/15">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Code</th>
              <th className="pb-2 font-medium">City</th>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-ink-faint/10 last:border-0">
                <td className="py-2.5 text-ink font-medium">{p.name}</td>
                <td className="py-2.5 text-ink-light">{p.code}</td>
                <td className="py-2.5 text-ink-light">{p.city || "-"}</td>
                <td className="py-2.5 text-ink-light max-w-xs truncate">{p.description || "-"}</td>
                <td className="py-2.5">
                  <span className={`badge ${p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {p.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <button className="text-brand-600 hover:text-brand-700 font-medium text-xs" onClick={() => setModalProject(p)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalProject && (
        <ProjectFormModal
          project={modalProject === "new" ? null : modalProject}
          onClose={() => setModalProject(null)}
          onSaved={() => {
            setModalProject(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProjectFormModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: project?.name ?? "",
    code: project?.code ?? "",
    city: project?.city ?? "",
    description: project?.description ?? "",
    isActive: project?.isActive ?? true,
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      if (project) {
        await ProjectsApi.update(project.id, form);
        toast.success("Project updated");
      } else {
        await ProjectsApi.create(form);
        toast.success("Project created");
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
      title={project ? "Edit Project" : "Add Project"}
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
          <label className="label">Project Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Project Code</label>
          <input
            className="input"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </div>
        <div>
          <label className="label">City</label>
          <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
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
        {project && (
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

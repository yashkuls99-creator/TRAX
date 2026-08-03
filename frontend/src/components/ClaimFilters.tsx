import { ClaimStatus, ExpenseCategory, Project, User } from "../types";

export interface ClaimFilterState {
  employeeId?: string;
  projectId?: string;
  categoryId?: string;
  status?: ClaimStatus | "";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const STATUS_OPTIONS: ClaimStatus[] = [
  "SUBMITTED",
  "ON_HOLD",
  "APPROVED",
  "REJECTED",
  "PENDING_PAYMENT",
  "PARTIALLY_PAID",
  "PAID",
];

export function ClaimFilters({
  value,
  onChange,
  projects,
  categories,
  employees,
}: {
  value: ClaimFilterState;
  onChange: (v: ClaimFilterState) => void;
  projects: Project[];
  categories: ExpenseCategory[];
  employees?: User[];
}) {
  function set<K extends keyof ClaimFilterState>(key: K, val: ClaimFilterState[K]) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="card p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {employees && (
        <div>
          <label className="label">Employee</label>
          <select className="input" value={value.employeeId ?? ""} onChange={(e) => set("employeeId", e.target.value)}>
            <option value="">All</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label">Project</label>
        <select className="input" value={value.projectId ?? ""} onChange={(e) => set("projectId", e.target.value)}>
          <option value="">All</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Category</label>
        <select className="input" value={value.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value)}>
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Status</label>
        <select
          className="input"
          value={value.status ?? ""}
          onChange={(e) => set("status", e.target.value as ClaimStatus | "")}
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">From</label>
        <input type="date" className="input" value={value.dateFrom ?? ""} onChange={(e) => set("dateFrom", e.target.value)} />
      </div>
      <div>
        <label className="label">To</label>
        <input type="date" className="input" value={value.dateTo ?? ""} onChange={(e) => set("dateTo", e.target.value)} />
      </div>
      <div className="col-span-2 sm:col-span-3 lg:col-span-6">
        <label className="label">Search claim number or description</label>
        <input
          type="text"
          className="input"
          value={value.search ?? ""}
          onChange={(e) => set("search", e.target.value)}
          placeholder="e.g. RMB-202508-0001"
        />
      </div>
    </div>
  );
}

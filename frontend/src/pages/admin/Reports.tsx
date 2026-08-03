import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ProjectsApi, ReportsApi, UsersApi } from "../../api/resources";
import { apiErrorMessage } from "../../api/client";
import { MonthlyReport, Project, ReportRow, User } from "../../types";
import { FullPageSpinner, Spinner } from "../../components/Spinner";
import { formatCurrency } from "../../utils/format";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [projectId, setProjectId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  useEffect(() => {
    Promise.all([ProjectsApi.list(), UsersApi.list({ role: "EMPLOYEE" })]).then(([p, e]) => {
      setProjects(p.data);
      setEmployees(e.data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    ReportsApi.monthly({ month, year, projectId: projectId || undefined, employeeId: employeeId || undefined })
      .then((res) => setReport(res.data))
      .finally(() => setLoading(false));
  }, [month, year, projectId, employeeId]);

  async function handleExport(format: "excel" | "pdf") {
    setExporting(format);
    try {
      await ReportsApi.download(format, { month, year, projectId: projectId || undefined, employeeId: employeeId || undefined });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Export failed"));
    } finally {
      setExporting(null);
    }
  }

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-ink">Monthly Reports</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" disabled={!!exporting} onClick={() => handleExport("excel")}>
            {exporting === "excel" && <Spinner className="h-4 w-4" />}
            Export Excel
          </button>
          <button className="btn-secondary" disabled={!!exporting} onClick={() => handleExport("pdf")}>
            {exporting === "pdf" && <Spinner className="h-4 w-4" />}
            Export PDF
          </button>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="label">Month</label>
          <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Project</label>
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">All</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Employee</label>
          <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">All</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading || !report ? (
        <FullPageSpinner />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <SummaryTile label="Claims" value={String(report.totals.totalClaims)} />
            <SummaryTile label="Claimed" value={formatCurrency(report.totals.claimedAmount)} />
            <SummaryTile label="Approved" value={formatCurrency(report.totals.approvedAmount)} />
            <SummaryTile label="Paid" value={formatCurrency(report.totals.paidAmount)} />
            <SummaryTile label="Outstanding" value={formatCurrency(report.totals.outstandingBalance)} />
          </div>

          <ReportTable title="Employee-wise Reimbursements" rows={report.employeeWise} groupLabel="Employee" />
          <ReportTable title="Project-wise Reimbursements" rows={report.projectWise} groupLabel="Project" />
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="text-base font-semibold text-ink mt-0.5">{value}</p>
    </div>
  );
}

function ReportTable({ title, rows, groupLabel }: { title: string; rows: ReportRow[]; groupLabel: string }) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-ink mb-3">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-faint border-b border-ink-faint/15">
              <th className="pb-2 font-medium">{groupLabel}</th>
              <th className="pb-2 font-medium">Claims</th>
              <th className="pb-2 font-medium">Approved Amount</th>
              <th className="pb-2 font-medium">Paid Amount</th>
              <th className="pb-2 font-medium">Pending Amount</th>
              <th className="pb-2 font-medium">Outstanding Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-ink-faint/10 last:border-0">
                <td className="py-2 text-ink font-medium">{r.name}</td>
                <td className="py-2 text-ink-light">{r.totalClaims}</td>
                <td className="py-2 text-ink-light">{formatCurrency(r.approvedAmount)}</td>
                <td className="py-2 text-ink-light">{formatCurrency(r.paidAmount)}</td>
                <td className="py-2 text-ink-light">{formatCurrency(r.pendingAmount)}</td>
                <td className="py-2 text-ink-light">{formatCurrency(r.outstandingBalance)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink-faint">
                  No data for the selected period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

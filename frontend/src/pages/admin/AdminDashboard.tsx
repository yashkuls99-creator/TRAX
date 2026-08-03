import { useEffect, useState } from "react";
import { DashboardApi, ProjectsApi } from "../../api/resources";
import { DashboardSummary, Project } from "../../types";
import { StatCard } from "../../components/StatCard";
import { FullPageSpinner } from "../../components/Spinner";
import { formatCurrency } from "../../utils/format";

export function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ProjectsApi.list().then((res) => setProjects(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    DashboardApi.summary({
      projectId: projectId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((res) => setSummary(res.data))
      .finally(() => setLoading(false));
  }, [projectId, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Finance Dashboard</h1>
          <p className="text-sm text-ink-light mt-0.5">Organization-wide reimbursement overview</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="input !w-auto" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input type="date" className="input !w-auto" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="input !w-auto" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {loading || !summary ? (
        <FullPageSpinner />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Pending Claims" value={summary.totalPendingClaims} accent="amber" />
            <StatCard label="Approved Claims" value={summary.totalApprovedClaims} accent="blue" />
            <StatCard label="Paid Claims" value={summary.totalPaidClaims} accent="emerald" />
            <StatCard
              label="Pending Reimbursement"
              value={formatCurrency(summary.pendingReimbursementAmount)}
              accent="purple"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Claims" value={summary.totalClaims} />
            <StatCard label="Total Claimed Amount" value={formatCurrency(summary.totalSubmittedAmount)} />
            <StatCard label="Total Paid Amount" value={formatCurrency(summary.totalPaidAmount)} accent="emerald" />
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink mb-3">Project-wise Statistics</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-faint border-b border-ink-faint/15">
                    <th className="pb-2 font-medium">Project</th>
                    <th className="pb-2 font-medium">City</th>
                    <th className="pb-2 font-medium">Claims</th>
                    <th className="pb-2 font-medium">Claimed</th>
                    <th className="pb-2 font-medium">Approved</th>
                    <th className="pb-2 font-medium">Paid</th>
                    <th className="pb-2 font-medium">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.projectStats.map((p) => (
                    <tr key={p.projectId} className="border-b border-ink-faint/10 last:border-0">
                      <td className="py-2 text-ink font-medium">{p.name}</td>
                      <td className="py-2 text-ink-light">{p.city || "-"}</td>
                      <td className="py-2 text-ink-light">{p.totalClaims}</td>
                      <td className="py-2 text-ink-light">{formatCurrency(p.claimedAmount)}</td>
                      <td className="py-2 text-ink-light">{formatCurrency(p.approvedAmount)}</td>
                      <td className="py-2 text-ink-light">{formatCurrency(p.paidAmount)}</td>
                      <td className="py-2 text-ink-light">{formatCurrency(p.pendingAmount)}</td>
                    </tr>
                  ))}
                  {summary.projectStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-ink-faint">
                        No claims found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

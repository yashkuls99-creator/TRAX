import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardApi } from "../../api/resources";
import { DashboardSummary } from "../../types";
import { StatCard } from "../../components/StatCard";
import { FullPageSpinner } from "../../components/Spinner";
import { formatCurrency } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";

export function EmployeeDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DashboardApi.summary()
      .then((res) => setSummary(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary) return <FullPageSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Welcome back, {user?.name?.split(" ")[0]}</h1>
          <p className="text-sm text-ink-light mt-0.5">Here's a summary of your reimbursement claims</p>
        </div>
        <Link to="/employee/claims/new" className="btn-primary">
          + New Claim
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Claims" value={summary.totalClaims} accent="brand" />
        <StatCard label="Pending Review" value={summary.totalPendingClaims} accent="amber" />
        <StatCard label="Approved" value={summary.totalApprovedClaims} accent="blue" />
        <StatCard label="Paid" value={summary.totalPaidClaims} accent="emerald" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Claimed" value={formatCurrency(summary.totalSubmittedAmount)} accent="brand" />
        <StatCard label="Total Approved Amount" value={formatCurrency(summary.totalApprovedAmount)} accent="blue" />
        <StatCard
          label="Awaiting Reimbursement"
          value={formatCurrency(summary.pendingReimbursementAmount)}
          accent="purple"
        />
      </div>

      {summary.projectStats.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Project-wise Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint border-b border-ink-faint/15">
                  <th className="pb-2 font-medium">Project</th>
                  <th className="pb-2 font-medium">Claims</th>
                  <th className="pb-2 font-medium">Claimed</th>
                  <th className="pb-2 font-medium">Approved</th>
                  <th className="pb-2 font-medium">Paid</th>
                </tr>
              </thead>
              <tbody>
                {summary.projectStats.map((p) => (
                  <tr key={p.projectId} className="border-b border-ink-faint/10 last:border-0">
                    <td className="py-2 text-ink">{p.name}</td>
                    <td className="py-2 text-ink-light">{p.totalClaims}</td>
                    <td className="py-2 text-ink-light">{formatCurrency(p.claimedAmount)}</td>
                    <td className="py-2 text-ink-light">{formatCurrency(p.approvedAmount)}</td>
                    <td className="py-2 text-ink-light">{formatCurrency(p.paidAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CategoriesApi, ClaimsApi, UsersApi } from "../../api/resources";
import { Claim, ExpenseCategory, Project } from "../../types";
import { ClaimFilters, ClaimFilterState } from "../../components/ClaimFilters";
import { StatusBadge } from "../../components/StatusBadge";
import { Pagination } from "../../components/Pagination";
import { FullPageSpinner } from "../../components/Spinner";
import { formatCurrency, formatDate } from "../../utils/format";

const PAGE_SIZE = 15;

export function MyClaims() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [filters, setFilters] = useState<ClaimFilterState>({});
  const [page, setPage] = useState(1);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    Promise.all([UsersApi.myProjects(), CategoriesApi.list()]).then(([p, c]) => {
      setProjects(p.data);
      setCategories(c.data);
      setInitialLoading(false);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    ClaimsApi.list({
      projectId: filters.projectId || undefined,
      categoryId: filters.categoryId || undefined,
      status: (filters.status as any) || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      search: filters.search || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setClaims(res.data.items);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  }, [filters, page]);

  const canEditStatuses = useMemo(() => new Set(["SUBMITTED", "ON_HOLD"]), []);

  if (initialLoading) return <FullPageSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-ink">My Claims</h1>
        <Link to="/employee/claims/new" className="btn-primary">
          + New Claim
        </Link>
      </div>

      <ClaimFilters
        value={filters}
        onChange={(v) => {
          setFilters(v);
          setPage(1);
        }}
        projects={projects}
        categories={categories}
      />

      <div className="card p-4">
        {loading ? (
          <FullPageSpinner />
        ) : claims.length === 0 ? (
          <p className="text-sm text-ink-light text-center py-10">No claims found for the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-faint border-b border-ink-faint/15">
                  <th className="pb-2 font-medium">Claim #</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Project</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Balance</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id} className="border-b border-ink-faint/10 last:border-0 hover:bg-surface-subtle">
                    <td className="py-2.5 font-medium text-ink">{c.claimNumber}</td>
                    <td className="py-2.5 text-ink-light">{formatDate(c.expenseDate)}</td>
                    <td className="py-2.5 text-ink-light">{c.project.name}</td>
                    <td className="py-2.5 text-ink-light">{c.category.name}</td>
                    <td className="py-2.5 text-ink-light">{formatCurrency(c.amount)}</td>
                    <td className="py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2.5 text-ink-light">{c.balance != null ? formatCurrency(c.balance) : "-"}</td>
                    <td className="py-2.5 text-right">
                      <Link
                        to={`/employee/claims/${c.id}`}
                        className="text-brand-600 hover:text-brand-700 font-medium text-xs"
                      >
                        {canEditStatuses.has(c.status) ? "View / Edit" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

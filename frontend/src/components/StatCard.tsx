import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "brand",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: "brand" | "amber" | "blue" | "emerald" | "purple";
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <div className="card p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-light truncate">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold text-ink truncate">{value}</p>
        {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
      </div>
      {icon && <div className={`rounded-lg p-2 shrink-0 ${accents[accent]}`}>{icon}</div>}
    </div>
  );
}

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const EMPLOYEE_NAV: NavItem[] = [
  { to: "/employee", label: "Dashboard", icon: "🏠" },
  { to: "/employee/claims/new", label: "New Claim", icon: "➕" },
  { to: "/employee/claims", label: "My Claims", icon: "🧾" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: "🏠" },
  { to: "/admin/claims", label: "Review Claims", icon: "🧾" },
  { to: "/admin/employees", label: "Employees", icon: "👥" },
  { to: "/admin/projects", label: "Projects", icon: "📁" },
  { to: "/admin/categories", label: "Categories", icon: "🏷️" },
  { to: "/admin/reports", label: "Reports", icon: "📊" },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = user?.role === "FINANCE_ADMIN" ? ADMIN_NAV : EMPLOYEE_NAV;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-subtle">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white border-r border-ink-faint/15 transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-ink-faint/15 px-5">
          <div className="h-7 w-7 rounded-md bg-brand-600 text-white flex items-center justify-center text-sm font-bold">
            N
          </div>
          <span className="font-semibold text-ink">NGO Expense</span>
        </div>
        <nav className="p-3 space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/employee" || item.to === "/admin"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-ink-light hover:bg-surface-muted hover:text-ink"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-ink-faint/15 bg-white px-4 lg:px-6">
          <button className="lg:hidden text-ink" onClick={() => setMobileOpen(true)}>
            ☰
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-ink leading-tight">{user?.name}</p>
              <p className="text-xs text-ink-faint leading-tight">
                {user?.role === "FINANCE_ADMIN" ? "Finance / Admin" : "Employee"}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <button onClick={handleLogout} className="btn-ghost text-xs">
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

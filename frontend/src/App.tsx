import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { FullPageSpinner } from "./components/Spinner";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/Login";
import { EmployeeDashboard } from "./pages/employee/EmployeeDashboard";
import { NewClaim } from "./pages/employee/NewClaim";
import { MyClaims } from "./pages/employee/MyClaims";
import { ClaimDetail } from "./pages/ClaimDetail";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { ClaimsReview } from "./pages/admin/ClaimsReview";
import { Employees } from "./pages/admin/Employees";
import { Projects } from "./pages/admin/Projects";
import { Categories } from "./pages/admin/Categories";
import { Reports } from "./pages/admin/Reports";

function RequireAuth({ children, role }: { children: JSX.Element; role?: "EMPLOYEE" | "FINANCE_ADMIN" }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "FINANCE_ADMIN" ? "/admin" : "/employee"} replace />;
  }
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "FINANCE_ADMIN" ? "/admin" : "/employee"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route
          path="/employee"
          element={
            <RequireAuth role="EMPLOYEE">
              <EmployeeDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/claims/new"
          element={
            <RequireAuth role="EMPLOYEE">
              <NewClaim />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/claims"
          element={
            <RequireAuth role="EMPLOYEE">
              <MyClaims />
            </RequireAuth>
          }
        />
        <Route
          path="/employee/claims/:id"
          element={
            <RequireAuth role="EMPLOYEE">
              <ClaimDetail />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth role="FINANCE_ADMIN">
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/claims"
          element={
            <RequireAuth role="FINANCE_ADMIN">
              <ClaimsReview />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/claims/:id"
          element={
            <RequireAuth role="FINANCE_ADMIN">
              <ClaimDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/employees"
          element={
            <RequireAuth role="FINANCE_ADMIN">
              <Employees />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/projects"
          element={
            <RequireAuth role="FINANCE_ADMIN">
              <Projects />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <RequireAuth role="FINANCE_ADMIN">
              <Categories />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <RequireAuth role="FINANCE_ADMIN">
              <Reports />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

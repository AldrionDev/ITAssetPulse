import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const NavBar = () => {
  const { logout, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
      isActive
        ? "bg-indigo-600 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    ].join(" ");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">IT Asset Pulse</h1>
          <p className="text-xs text-slate-500">Asset management dashboard</p>
        </div>

        <div className="flex items-center gap-3">
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/assets" className={linkClass}>
            Assets
          </NavLink>

          <NavLink to="/scan" className={linkClass}>
            QR Scan
          </NavLink>

          {isAdmin && (
            <>
              <NavLink to="/admin/assets" className={linkClass}>
                Asset Administration
              </NavLink>

              <NavLink to="/employees" className={linkClass}>
                Employees
              </NavLink>
            </>
          )}

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
};

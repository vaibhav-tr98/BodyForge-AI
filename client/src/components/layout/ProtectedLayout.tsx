import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../ui/Loader";

/**
 * Route guard that redirects unauthenticated users to /login.
 * While the initial token validation is in progress, shows a full-page loader.
 */
export default function ProtectedLayout() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── Top navigation ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a
            href="/dashboard"
            className="text-xl font-bold text-cyan-400"
            id="app-logo"
          >
            BodyForge AI
          </a>

          <nav className="hidden items-center gap-6 sm:flex" id="main-nav">
            <a
              href="/dashboard"
              className="text-sm font-medium text-slate-300 transition hover:text-cyan-400"
            >
              Dashboard
            </a>
            <a
              href="/profile"
              className="text-sm font-medium text-slate-300 transition hover:text-cyan-400"
            >
              Profile
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 sm:inline">
              {user?.name}
            </span>
            <button
              onClick={logout}
              id="logout-button"
              className="rounded-lg border border-slate-700 px-4 py-1.5 text-sm text-slate-300 transition hover:border-red-500 hover:text-red-400"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content area ──────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

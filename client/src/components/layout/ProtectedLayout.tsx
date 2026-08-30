import { Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../ui/Loader";
import { Home, Dumbbell, LineChart, Utensils, User } from "lucide-react";

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

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { name: "Home", path: "/dashboard", icon: Home },
    { name: "Workouts", path: "/workouts", icon: Dumbbell },
    { name: "Tracker", path: "/progress", icon: LineChart },
    { name: "Nutrition", path: "/nutrition", icon: Utensils },
    { name: "Profile", path: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            to="/dashboard"
            className="text-xl font-bold text-cyan-400"
            id="app-logo"
          >
            BodyForge AI
          </Link>

          <nav className="hidden items-center gap-6 sm:flex" id="main-nav">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-slate-300 transition hover:text-cyan-400"
            >
              Dashboard
            </Link>
            <Link
              to="/workouts"
              className="text-sm font-medium text-slate-300 transition hover:text-cyan-400"
            >
              Workouts
            </Link>
            <Link
              to="/workouts/history"
              className="text-sm font-medium text-slate-300 transition hover:text-cyan-400"
            >
              History
            </Link>
            <Link
              to="/nutrition"
              className="text-sm font-medium text-slate-300 transition hover:text-cyan-400"
            >
              Nutrition
            </Link>
            <Link
              to="/progress"
              className="text-sm font-medium text-slate-300 transition hover:text-cyan-400"
            >
              Progress
            </Link>
            <Link
              to="/profile"
              className="text-sm font-medium text-slate-300 transition hover:text-cyan-400"
            >
              Profile
            </Link>
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

      {/* Main content area */}
      <main className="mx-auto max-w-7xl px-6 py-8 pb-28 sm:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="flex items-center justify-around px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 flex-1 ${
                  active ? "text-cyan-400" : "text-slate-400 hover:text-slate-300"
                }`}
                aria-label={item.name}
              >
                <Icon size={24} className={active ? "stroke-cyan-400" : "stroke-current"} />
                <span className="text-[10px] font-medium leading-none">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

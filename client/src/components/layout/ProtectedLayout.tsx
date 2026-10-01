import { Navigate, Outlet, useLocation, Link, useMatch } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import FullScreenLoader from "../ui/FullScreenLoader";
import { Home, Dumbbell, History, LineChart, Utensils, User, LogOut } from "lucide-react";
import SyncIndicator from "../ui/SyncIndicator";

/**
 * Route guard that redirects unauthenticated users to /login.
 * While the initial token validation is in progress, shows a full-page loader.
 */
export default function ProtectedLayout() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    if (path === "/workouts") {
      // Must not match /workouts/history or /workouts/session
      return location.pathname === "/workouts" ||
             location.pathname.startsWith("/workouts/new") ||
             (location.pathname.startsWith("/workouts/") && !location.pathname.includes("/history") && !location.pathname.includes("/session"));
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { name: "Home", path: "/dashboard", icon: Home },
    { name: "Workouts", path: "/workouts", icon: Dumbbell },
    { name: "History", path: "/workouts/history", icon: History },
    { name: "Nutrition", path: "/nutrition", icon: Utensils },
    { name: "Progress", path: "/progress", icon: LineChart },
  ];

  const isWorkoutSession = useMatch("/workouts/session/:id");

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#111827]">
      {/* Top navigation - App Shell Header */}
      {!isWorkoutSession && (
        <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-[#FFFFFF] shadow-sm">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Link
              to="/dashboard"
              className="text-lg font-bold text-cyan-600 sm:text-xl"
              id="app-logo"
            >
              BodyForge AI
            </Link>

            {/* Desktop Navigation (>= 768px) */}
            <nav className="hidden items-center gap-6 md:flex" id="main-nav">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? "page" : undefined}
                    className={`text-sm font-medium transition-colors ${
                      active ? "text-cyan-600" : "text-[#6B7280] hover:text-[#111827]"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 sm:gap-4">
              <SyncIndicator />

              {/* Profile Link (Desktop & Mobile) */}
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-[#F1F3F5] sm:pr-3 sm:pl-1"
                aria-label="Profile"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F3F5] text-cyan-700">
                  <User size={18} />
                </div>
                <span className="hidden text-sm font-medium text-[#111827] sm:block">
                  {user?.name}
                </span>
              </Link>

              {/* Desktop Logout (>= 768px) */}
              <button
                onClick={logout}
                id="logout-button"
                title="Logout"
                className="hidden items-center justify-center rounded-lg p-2 text-[#6B7280] transition hover:bg-[#F1F3F5] hover:text-red-500 md:flex"
                aria-label="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main content area */}
      <main className={`mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:pb-8 ${isWorkoutSession ? 'pb-8 pt-4' : 'pb-24'}`}>
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation (< 768px) */}
      {!isWorkoutSession && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#E5E7EB] bg-[#FFFFFF] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center justify-around px-1 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 min-h-[44px] transition-colors ${
                    active ? "text-cyan-600" : "text-[#6B7280]"
                  }`}
                  aria-label={item.name}
                >
                  <Icon
                    size={24}
                    className={`transition-colors ${active ? "stroke-cyan-600" : "stroke-[#6B7280]"}`}
                  />
                  <span className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

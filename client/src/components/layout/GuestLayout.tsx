import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import FullScreenLoader from "../ui/FullScreenLoader";

/**
 * Route guard for guest-only pages (login, register).
 * Redirects already-authenticated users to /dashboard.
 */
export default function GuestLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

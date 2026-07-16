import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "../atoms/LoadingState";
import { useAuth } from "../../context/AuthContext";

type RequireAuthProps = {
  adminOnly?: boolean;
  userOnly?: boolean;
};

export function RequireAuth({ adminOnly = false, userOnly = false }: RequireAuthProps) {
  const location = useLocation();
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="route-loader">
        <LoadingState className="route-loader__content">Memuat sesi...</LoadingState>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/businesses" replace />;
  }

  if (userOnly && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import type { Role } from '../types';

// ─── Full-screen spinner ────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
    </div>
  );
}

// ─── ProtectedRoute – redirects unauthenticated users to /login ─────────────

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
}

// ─── RoleRoute – redirects users whose role doesn't match ──────────────────

export function RoleRoute({ allowedRoles }: { allowedRoles: Role[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!allowedRoles.includes(user.role))
    return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

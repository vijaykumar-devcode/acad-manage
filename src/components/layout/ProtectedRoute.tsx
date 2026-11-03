import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { Role } from '../../types';

interface ProtectedRouteProps {
  /** Roles allowed to access this route. If omitted, any authenticated user is allowed. */
  allowedRoles?: Role[];
}

/**
 * ProtectedRoute — guards a route by authentication and optionally by role.
 *
 * - Unauthenticated users → redirect to /login
 * - Authenticated users without the required role → redirect to /
 * - Authenticated users with the required role → render the child route
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User is authenticated but lacks the required role — redirect to dashboard
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

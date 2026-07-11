import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import AccessDenied from '../pages/AccessDenied';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  onAccessDenied: () => void;
}

/**
 * ProtectedRoute
 * --------------
 * Guards a component behind authentication and role checks:
 * - If not authenticated → renders <LoginPage />
 * - If authenticated but wrong role → renders <AccessDenied /> with callback to go back
 * - If authenticated and permitted → renders children
 */
export default function ProtectedRoute({
  allowedRoles,
  children,
  onAccessDenied,
}: ProtectedRouteProps) {
  const { isAuthenticated, hasRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-overlay" id="auth-loading-state">
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <span>Restoring session…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!hasRole(allowedRoles)) {
    return <AccessDenied onGoBack={onAccessDenied} />;
  }

  return <>{children}</>;
}

import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface AccessDeniedProps {
  onGoBack: () => void;
}

export default function AccessDenied({ onGoBack }: AccessDeniedProps) {
  const { user } = useAuth();

  const roleLabels: Record<UserRole, string> = {
    MANAGER: 'Manager',
    FLOOR_STAFF: 'Floor Staff',
  };

  return (
    <div className="access-denied-container fade-in" id="access-denied-view">
      <div className="access-denied-icon" style={{ color: 'var(--color-accent-rose)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
      </div>
      <h2 className="access-denied-title">Access Denied</h2>
      <p className="access-denied-message">
        You don&apos;t have permission to view this page.
      </p>
      {user && (
        <div className="access-denied-role-info">
          <span>Your current role:</span>
          <span className={`role-pill ${user.role === 'MANAGER' ? 'role-pill-manager' : 'role-pill-staff'}`}>
            {roleLabels[user.role]}
          </span>
          <span>does not have access to this section.</span>
        </div>
      )}
      <p className="access-denied-sub">
        Please contact your manager if you believe this is an error.
      </p>
      <button
        id="access-denied-back-btn"
        className="btn btn-primary"
        onClick={onGoBack}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Back to Intake Forms
      </button>
    </div>
  );
}

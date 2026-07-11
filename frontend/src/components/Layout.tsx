import { useAuth } from '../context/AuthContext';
import type { TabId, UserRole } from '../types';

interface LayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: string;
  allowedRoles: UserRole[];
}

const navItems: NavItem[] = [
  { id: 'intake',     label: 'Intake Forms',         icon: 'intake', allowedRoles: ['FLOOR_STAFF', 'MANAGER'] },
  { id: 'analytics', label: 'Analytics Dashboard',   icon: 'analytics', allowedRoles: ['MANAGER'] },
  { id: 'mitigation',label: 'Mitigation Center',     icon: 'mitigation', allowedRoles: ['MANAGER'] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  MANAGER: 'Manager',
  FLOOR_STAFF: 'Floor Staff',
};

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  const { user, hasRole, logout } = useAuth();

  const visibleNavItems = navItems.filter((item) =>
    user ? hasRole(item.allowedRoles) : false
  );

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 'var(--space-lg)' }}>
          <img src="/logo.png" alt="StockRadar Logo" style={{ width: '100%', maxWidth: '200px', height: 'auto', objectFit: 'contain', marginBottom: '8px' }} />
          <p style={{ margin: 0 }}>Inventory &amp; Expiry Optimizer</p>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {visibleNavItems.map((item) => (
            <div
              key={item.id}
              id={`nav-${item.id}`}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onTabChange(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <span className="nav-icon">
                {item.icon === 'intake' && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                )}
                {item.icon === 'analytics' && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                )}
                {item.icon === 'mitigation' && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                )}
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer — System status + User info */}
        <div className="sidebar-footer">
          {/* System status */}
          <div className="sidebar-status">
            <div style={{ marginBottom: '4px', fontWeight: 600 }}>System Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-dot status-dot-online" />
              All services operational
            </div>
          </div>

          {/* User info strip */}
          {user && (
            <div className="sidebar-user" id="sidebar-user-panel">
              <div className="sidebar-user-avatar" aria-hidden="true">
                {getInitials(user.full_name)}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.full_name}</div>
                <span className={`role-pill ${user.role === 'MANAGER' ? 'role-pill-manager' : 'role-pill-staff'}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <button
                id="sidebar-logout-btn"
                className="btn btn-ghost btn-sm sidebar-logout-btn"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
              >
                ⏻
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

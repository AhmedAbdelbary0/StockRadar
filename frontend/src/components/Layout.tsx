import type { TabId } from '../types';

interface LayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

const navItems: { id: TabId; label: string; icon: string }[] = [
  { id: 'intake', label: 'Intake Forms', icon: '📦' },
  { id: 'analytics', label: 'Analytics Dashboard', icon: '📊' },
  { id: 'mitigation', label: 'Mitigation Center', icon: '🛡️' },
];

export default function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 'var(--space-lg)' }}>
          <img src="/logo.png" alt="StockRadar Logo" style={{ width: '100%', maxWidth: '200px', height: 'auto', objectFit: 'contain', marginBottom: '8px' }} />
          <p style={{ margin: 0 }}>Inventory &amp; Expiry Optimizer</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.id}
              id={`nav-${item.id}`}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onTabChange(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={{
          padding: 'var(--space-lg)',
          borderTop: '1px solid var(--color-border)',
          fontSize: '0.7rem',
          color: 'var(--color-text-muted)',
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 600 }}>System Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#34d399',
              display: 'inline-block',
            }} />
            All services operational
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

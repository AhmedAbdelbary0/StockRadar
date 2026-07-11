import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import IntakeForm from './components/IntakeForm';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import MitigationCenter from './components/MitigationCenter';
import LoginPage from './pages/LoginPage';
import type { TabId } from './types';

// Inner component has access to auth context
function AppContent() {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Default tab depends on role: FLOOR_STAFF starts at intake, MANAGER at analytics
  const defaultTab: TabId = user?.role === 'FLOOR_STAFF' ? 'intake' : 'analytics';
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  // Show loading screen while restoring session from localStorage
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          flexDirection: 'column',
          gap: '1rem',
          color: 'var(--color-text-muted)',
        }}
        id="app-loading-state"
      >
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <span style={{ fontSize: '0.9rem' }}>Loading StockRadar…</span>
      </div>
    );
  }

  // Not logged in — show login screen (full page, no layout)
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'intake' && (
        <ProtectedRoute
          allowedRoles={['FLOOR_STAFF', 'MANAGER']}
          onAccessDenied={() => setActiveTab('intake')}
        >
          <IntakeForm />
        </ProtectedRoute>
      )}
      {activeTab === 'analytics' && (
        <ProtectedRoute
          allowedRoles={['MANAGER']}
          onAccessDenied={() => setActiveTab('intake')}
        >
          <AnalyticsDashboard />
        </ProtectedRoute>
      )}
      {activeTab === 'mitigation' && (
        <ProtectedRoute
          allowedRoles={['MANAGER']}
          onAccessDenied={() => setActiveTab('intake')}
        >
          <MitigationCenter />
        </ProtectedRoute>
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

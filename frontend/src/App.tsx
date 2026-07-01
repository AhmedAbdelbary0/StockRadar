import { useState } from 'react';
import Layout from './components/Layout';
import IntakeForm from './components/IntakeForm';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import MitigationCenter from './components/MitigationCenter';
import type { TabId } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('analytics');

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'intake' && <IntakeForm />}
      {activeTab === 'analytics' && <AnalyticsDashboard />}
      {activeTab === 'mitigation' && <MitigationCenter />}
    </Layout>
  );
}

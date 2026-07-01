import { useEffect, useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { getExpiryRisk, generateMitigation } from '../api/client';
import RiskBadge from './RiskBadge';
import CopyButton from './CopyButton';
import type { BatchPrediction } from '../types';

export default function MitigationCenter() {
  const { data, loading, error, execute } = useApi(getExpiryRisk);
  const mitigationApi = useApi(generateMitigation);

  const [selectedBatch, setSelectedBatch] = useState<BatchPrediction | null>(null);

  useEffect(() => {
    execute();
  }, [execute]);

  const highRiskBatches = useMemo(() => {
    return data?.data?.filter((b) => b.risk_level === 'High') || [];
  }, [data]);

  const handleGenerate = async (batch: BatchPrediction) => {
    setSelectedBatch(batch);
    await mitigationApi.execute(batch);
  };

  if (loading && !data) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p>Loading high-risk inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-title">Failed to load risk data</div>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => execute()} style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Mitigation Center</h2>
        <p>AI-generated action plans for high-risk inventory batches based on store policies.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column: High Risk List */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">High Risk Batches ({highRiskBatches.length})</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {highRiskBatches.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎉</div>
                <div className="empty-state-title">All Clear</div>
                <p>No high-risk batches detected.</p>
              </div>
            ) : (
              highRiskBatches.map((batch) => (
                <div
                  key={batch.batch_id}
                  style={{
                    padding: '1rem',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>
                        {batch.product_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        SKU: {batch.sku} • Batch: {batch.batch_number}
                      </div>
                    </div>
                    <RiskBadge level={batch.risk_level} />
                  </div>
                  
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    <strong>{batch.days_until_expiry}</strong> days to expiry • <strong>{batch.quantity_remaining}</strong> units remaining
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-accent-rose)' }}>
                    {batch.risk_reason}
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleGenerate(batch)}
                      disabled={mitigationApi.loading && selectedBatch?.batch_id === batch.batch_id}
                    >
                      {mitigationApi.loading && selectedBatch?.batch_id === batch.batch_id ? (
                        <>
                          <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                          Generating...
                        </>
                      ) : (
                        '✨ Generate Mitigation Plan'
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: AI Generation Result */}
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">Generated Strategy</div>
          </div>

          {selectedBatch ? (
            mitigationApi.loading ? (
              <div className="loading-overlay">
                <div className="spinner" />
                <p>Consulting store policies and generating strategy...</p>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                  Using DeepSeek-R1 via Groq
                </div>
              </div>
            ) : mitigationApi.error ? (
              <div className="empty-state">
                <div className="empty-state-icon">⚠️</div>
                <div className="empty-state-title">Generation Failed</div>
                <p>{mitigationApi.error}</p>
              </div>
            ) : mitigationApi.data ? (
              <div className="fade-in">
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-accent-blue)' }}>
                    Target: {selectedBatch.product_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    {mitigationApi.data.strategy_type === 'vendor_return' ? '📦 Vendor Return' : '🏷️ Promotional Bundle'}
                  </div>
                </div>

                <div className="mitigation-content">
                  {mitigationApi.data.markdown_content}
                </div>

                <div className="mitigation-actions">
                  <CopyButton content={mitigationApi.data.markdown_content} />
                </div>
              </div>
            ) : null
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🛡️</div>
              <div className="empty-state-title">No Strategy Selected</div>
              <p>Select a high-risk batch to generate an AI mitigation strategy based on store policies.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

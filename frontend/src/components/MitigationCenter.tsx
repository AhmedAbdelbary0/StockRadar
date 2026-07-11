import { useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useApi } from '../hooks/useApi';
import { getExpiryRisk, generateMitigation } from '../api/client';
import RiskBadge from './RiskBadge';
import CopyButton from './CopyButton';
import type { BatchPrediction } from '../types';

const cleanStrategyOutput = (rawOutput: string) => {
  return rawOutput.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
};

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

  const cleanedMarkdown = useMemo(() => {
    if (!mitigationApi.data?.markdown_content) return '';
    return cleanStrategyOutput(mitigationApi.data.markdown_content);
  }, [mitigationApi.data]);

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
        <div className="empty-state-icon" style={{ color: 'var(--color-accent-rose)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
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
                <div className="empty-state-icon" style={{ color: 'var(--color-accent-emerald)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                          <span>Generate Mitigation Plan</span>
                        </div>
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
                <div className="empty-state-icon" style={{ color: 'var(--color-accent-rose)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div className="empty-state-title">Generation Failed</div>
                <p>{mitigationApi.error}</p>
              </div>
            ) : mitigationApi.data ? (
              <div className="fade-in">
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-accent-blue)' }}>
                    Target: {selectedBatch.product_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                    {mitigationApi.data.strategy_type === 'vendor_return' ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                        <span>Vendor Return</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                        <span>Promotional Bundle</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mitigation-content prose prose-invert max-w-none text-slate-300">
                  <ReactMarkdown>{cleanedMarkdown}</ReactMarkdown>
                </div>

                <div className="mitigation-actions">
                  <CopyButton content={cleanedMarkdown} />
                </div>
              </div>
            ) : null
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <div className="empty-state-title">No Strategy Selected</div>
              <p>Select a high-risk batch to generate an AI mitigation strategy based on store policies.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

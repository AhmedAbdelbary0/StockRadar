import { useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { getExpiryRisk } from '../api/client';
import RiskBadge from './RiskBadge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

export default function AnalyticsDashboard() {
  const { data, loading, error, execute } = useApi(getExpiryRisk);

  useEffect(() => {
    execute();
    // Auto-refresh every 60 seconds
    const interval = setInterval(execute, 60000);
    return () => clearInterval(interval);
  }, [execute]);

  const stats = useMemo(() => {
    if (!data?.data) return null;
    const batches = data.data;

    let high = 0;
    let medium = 0;
    let low = 0;
    let totalValue = 0;

    batches.forEach((b) => {
      if (b.risk_level === 'High') high++;
      else if (b.risk_level === 'Medium') medium++;
      else if (b.risk_level === 'Low') low++;

      totalValue += b.quantity_remaining * b.cost_price;
    });

    return {
      total: batches.length,
      high,
      medium,
      low,
      totalValue,
    };
  }, [data]);

  const categoryData = useMemo(() => {
    if (!data?.data) return [];
    const map = new Map<string, number>();
    data.data.forEach((b) => {
      map.set(b.category, (map.get(b.category) || 0) + b.quantity_remaining);
    });
    return Array.from(map.entries()).map(([name, quantity]) => ({ name, quantity }));
  }, [data]);

  const decayData = useMemo(() => {
    if (!data?.data) return [];
    // Group by days until expiry brackets
    const brackets = [
      { name: '0-5 Days', max: 5, count: 0 },
      { name: '6-14 Days', max: 14, count: 0 },
      { name: '15-30 Days', max: 30, count: 0 },
      { name: '31-60 Days', max: 60, count: 0 },
      { name: '60+ Days', max: Infinity, count: 0 },
    ];

    data.data.forEach((b) => {
      for (const bracket of brackets) {
        if (b.days_until_expiry <= bracket.max) {
          bracket.count += b.quantity_remaining;
          break;
        }
      }
    });

    return brackets.map(b => ({ name: b.name, units: b.count }));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p>Analyzing inventory risk profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⚠️</div>
        <div className="empty-state-title">Failed to load analytics</div>
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
        <h2>Analytics Dashboard</h2>
        <p>Real-time expiry risk and inventory health metrics.</p>
        {data?.ai_status === 'unavailable' && (
          <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '4px', fontSize: '0.85rem' }}>
            ⚠️ AI Worker is currently offline. Displaying raw inventory data without risk prediction.
          </div>
        )}
      </div>

      {stats && (
        <div className="stats-grid stagger-children">
          <div className="stat-card blue">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Active Batches</div>
          </div>
          <div className="stat-card rose">
            <div className="stat-value">{stats.high}</div>
            <div className="stat-label">High Risk Batches</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-value">${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stat-label">Total Inventory Value</div>
          </div>
        </div>
      )}

      <div className="charts-grid stagger-children">
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">Inventory by Category (Units)</div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">Expiry Decay Trend</div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={decayData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="units" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorUnits)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="glass-card-header">
          <div className="glass-card-title">Active Batches Overview</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Product</th>
                <th>Category</th>
                <th>Remaining</th>
                <th>Expiry</th>
                <th>Velocity</th>
                <th>Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((batch) => (
                <tr key={batch.batch_id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{batch.batch_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{batch.sku}</div>
                  </td>
                  <td>{batch.product_name}</td>
                  <td>{batch.category}</td>
                  <td>{batch.quantity_remaining}</td>
                  <td>
                    <div>{batch.expiry_date}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {batch.days_until_expiry} days
                    </div>
                  </td>
                  <td>
                    {batch.daily_velocity !== undefined ? (
                      <div>
                        <div>{batch.daily_velocity.toFixed(2)}/day</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {batch.days_until_stockout ? `${batch.days_until_stockout.toFixed(1)} days to out` : 'No sales'}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)' }}>N/A</span>
                    )}
                  </td>
                  <td>
                    <RiskBadge level={batch.risk_level || 'Low'} />
                  </td>
                </tr>
              ))}
              {(!data?.data || data.data.length === 0) && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    No active inventory batches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

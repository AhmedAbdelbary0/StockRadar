import { useState } from 'react';
import { createBatch, logSale } from '../api/client';
import type { BatchIntakePayload, SalePayload } from '../types';

export default function IntakeForm() {
  const [activeSubTab, setActiveSubTab] = useState<'intake' | 'sales'>('intake');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Intake form state
  const [intakeForm, setIntakeForm] = useState<BatchIntakePayload>({
    sku: '',
    name: '',
    category: 'Dairy & Fresh',
    batch_number: '',
    quantity_received: 1,
    cost_price: 0,
    expiry_date: '',
  });

  // Sales form state
  const [salesForm, setSalesForm] = useState<SalePayload>({
    sku: '',
    quantity_sold: 1,
    sale_price: 0,
  });

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await createBatch(intakeForm);
      if (res.success) {
        setSuccess(`Batch ${intakeForm.batch_number} for SKU ${intakeForm.sku} added successfully.`);
        setIntakeForm({
          sku: '',
          name: '',
          category: 'Dairy & Fresh',
          batch_number: '',
          quantity_received: 1,
          cost_price: 0,
          expiry_date: '',
        });
      } else {
        setError(res.errors?.join(', ') || res.error || 'Failed to add batch.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await logSale(salesForm);
      if (res.success) {
        setSuccess(`Sale logged successfully for SKU ${salesForm.sku}.`);
        setSalesForm({
          sku: '',
          quantity_sold: 1,
          sale_price: 0,
        });
      } else {
        setError(res.errors?.join(', ') || res.error || 'Failed to log sale.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>Operations Desk</h2>
        <p>Log incoming inventory batches and track outgoing sales.</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          className={`btn ${activeSubTab === 'intake' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('intake')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          Intake Inventory
        </button>
        <button
          className={`btn ${activeSubTab === 'sales' ? 'btn-success' : 'btn-ghost'}`}
          onClick={() => setActiveSubTab('sales')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          Log Sale
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--color-accent-rose)', marginBottom: '1rem', padding: '0.5rem', border: '1px solid var(--color-accent-rose)', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.1)' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: 'var(--color-accent-emerald)', marginBottom: '1rem', padding: '0.5rem', border: '1px solid var(--color-accent-emerald)', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)' }}>
          {success}
        </div>
      )}

      {activeSubTab === 'intake' ? (
        <form onSubmit={handleIntakeSubmit} className="glass-card stagger-children">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">SKU / Barcode</label>
              <input
                type="text"
                className="form-input"
                required
                value={intakeForm.sku}
                onChange={(e) => setIntakeForm({ ...intakeForm, sku: e.target.value })}
                placeholder="e.g. MILK-1GAL-01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Product Name</label>
              <input
                type="text"
                className="form-input"
                required
                value={intakeForm.name}
                onChange={(e) => setIntakeForm({ ...intakeForm, name: e.target.value })}
                placeholder="e.g. Whole Milk 1 Gallon"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={intakeForm.category}
                onChange={(e) => setIntakeForm({ ...intakeForm, category: e.target.value })}
              >
                <option>Dairy & Fresh</option>
                <option>Bakery</option>
                <option>Deli</option>
                <option>OTC Medications</option>
                <option>Prescription Medications</option>
                <option>General Grocery</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Batch Number</label>
              <input
                type="text"
                className="form-input"
                required
                value={intakeForm.batch_number}
                onChange={(e) => setIntakeForm({ ...intakeForm, batch_number: e.target.value })}
                placeholder="e.g. BATCH-2024-X1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Quantity Received</label>
              <input
                type="number"
                className="form-input"
                min="1"
                required
                value={intakeForm.quantity_received || ''}
                onChange={(e) => setIntakeForm({ ...intakeForm, quantity_received: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                min="0"
                required
                value={intakeForm.cost_price || ''}
                onChange={(e) => setIntakeForm({ ...intakeForm, cost_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input
                type="date"
                className="form-input"
                required
                value={intakeForm.expiry_date}
                onChange={(e) => setIntakeForm({ ...intakeForm, expiry_date: e.target.value })}
              />
            </div>
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Submit Batch Intake'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSalesSubmit} className="glass-card stagger-children">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">SKU / Barcode</label>
              <input
                type="text"
                className="form-input"
                required
                value={salesForm.sku}
                onChange={(e) => setSalesForm({ ...salesForm, sku: e.target.value })}
                placeholder="e.g. MILK-1GAL-01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Quantity Sold</label>
              <input
                type="number"
                className="form-input"
                min="1"
                required
                value={salesForm.quantity_sold || ''}
                onChange={(e) => setSalesForm({ ...salesForm, quantity_sold: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sale Price ($)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                min="0"
                required
                value={salesForm.sale_price || ''}
                onChange={(e) => setSalesForm({ ...salesForm, sale_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'Processing...' : 'Log Sale Event'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

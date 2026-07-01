import axios from 'axios';
import type {
  ApiResponse,
  BatchIntakePayload,
  SalePayload,
  InventoryBatch,
  ExpiryRiskResponse,
  MitigateResponse,
  BatchPrediction,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// ---- Inventory ----

export async function createBatch(payload: BatchIntakePayload): Promise<ApiResponse<{ product: unknown; batch: InventoryBatch }>> {
  const { data } = await api.post('/api/inventory/batch', payload);
  return data;
}

export async function getAllBatches(): Promise<ApiResponse<InventoryBatch[]>> {
  const { data } = await api.get('/api/inventory/batches');
  return data;
}

// ---- Sales ----

export async function logSale(payload: SalePayload): Promise<ApiResponse<unknown>> {
  const { data } = await api.post('/api/sales', payload);
  return data;
}

// ---- Analytics ----

export async function getExpiryRisk(): Promise<ExpiryRiskResponse> {
  const { data } = await api.get('/api/analytics/expiry-risk');
  return data;
}

// ---- Mitigation ----

export async function generateMitigation(batch: BatchPrediction): Promise<MitigateResponse> {
  const aiWorkerUrl = import.meta.env.VITE_AI_WORKER_URL || 'http://localhost:8000';
  const { data } = await axios.post(`${aiWorkerUrl}/mitigate-risk`, {
    batch_id: batch.batch_id,
    sku: batch.sku,
    product_name: batch.product_name,
    category: batch.category,
    batch_number: batch.batch_number,
    quantity_remaining: batch.quantity_remaining,
    cost_price: batch.cost_price,
    expiry_date: batch.expiry_date,
    days_until_expiry: batch.days_until_expiry,
    daily_velocity: batch.daily_velocity,
    risk_level: batch.risk_level,
  });
  return data;
}

export default api;

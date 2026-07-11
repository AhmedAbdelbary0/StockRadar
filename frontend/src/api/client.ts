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
import { TOKEN_KEY } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach JWT to every outgoing request
// ---------------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — handle 401 (expired/invalid token) globally
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is expired or invalid — clear session and force re-login
      localStorage.removeItem(TOKEN_KEY);
      // Trigger a page reload so App re-renders to the LoginPage
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// ---- Inventory ----

export async function createBatch(
  payload: BatchIntakePayload
): Promise<ApiResponse<{ product: unknown; batch: InventoryBatch }>> {
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
// Routed through Express backend proxy (MANAGER only) so the AI worker is
// never called directly from the browser. The backend injects X-Internal-Secret.

export async function generateMitigation(batch: BatchPrediction): Promise<MitigateResponse> {
  const { data } = await api.post('/api/mitigation/generate', {
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

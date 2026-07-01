/* ---- TypeScript interfaces for Smart Warehouse ---- */

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  created_at: string;
}

export interface InventoryBatch {
  id: number;
  product_id: number;
  batch_number: string;
  quantity_received: number;
  quantity_remaining: number;
  cost_price: number;
  expiry_date: string;
  risk_level: 'Low' | 'Medium' | 'High';
  received_at: string;
  sku: string;
  product_name: string;
  category: string;
}

export interface SaleRecord {
  id: number;
  product_id: number;
  quantity_sold: number;
  sale_price: number;
  sold_at: string;
}

export interface BatchPrediction {
  batch_id: number;
  product_id: number;
  sku: string;
  product_name: string;
  category: string;
  batch_number: string;
  quantity_remaining: number;
  cost_price: number;
  expiry_date: string;
  days_until_expiry: number;
  daily_velocity: number;
  days_until_stockout: number | null;
  risk_level: 'Low' | 'Medium' | 'High';
  risk_reason: string;
}

export interface ExpiryRiskResponse {
  success: boolean;
  data: BatchPrediction[];
  sales_summary?: {
    total_records: number;
    period: string;
  };
  ai_status: 'active' | 'unavailable';
  message?: string;
}

export interface MitigateResponse {
  batch_id: number;
  sku: string;
  product_name: string;
  strategy_type: 'promotional_bundle' | 'vendor_return';
  markdown_content: string;
  policy_references: string[];
}

export interface BatchIntakePayload {
  sku: string;
  name: string;
  category: string;
  batch_number: string;
  quantity_received: number;
  cost_price: number;
  expiry_date: string;
}

export interface SalePayload {
  sku: string;
  quantity_sold: number;
  sale_price: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
  count?: number;
  message?: string;
}

export type TabId = 'intake' | 'analytics' | 'mitigation';

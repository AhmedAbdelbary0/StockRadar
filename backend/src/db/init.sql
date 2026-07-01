-- ============================================================
-- Smart Warehouse Inventory & Expiry Optimizer
-- Database Initialization Script
-- ============================================================

-- Enable UUID extension for potential future use
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------
-- 1. Products Table
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    sku         VARCHAR(50) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    category    VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- -----------------------------------------------------------
-- 2. Inventory Batches Table
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_batches (
    id                  SERIAL PRIMARY KEY,
    product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number        VARCHAR(100) NOT NULL,
    quantity_received   INTEGER NOT NULL CHECK (quantity_received > 0),
    quantity_remaining  INTEGER NOT NULL CHECK (quantity_remaining >= 0),
    cost_price          NUMERIC(10, 2) NOT NULL CHECK (cost_price >= 0),
    expiry_date         DATE NOT NULL,
    risk_level          VARCHAR(20) DEFAULT 'Low' CHECK (risk_level IN ('Low', 'Medium', 'High')),
    received_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_product_id ON inventory_batches (product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON inventory_batches (expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_risk_level ON inventory_batches (risk_level);

-- -----------------------------------------------------------
-- 3. Sales Log Table
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_log (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_sold   INTEGER NOT NULL CHECK (quantity_sold > 0),
    sale_price      NUMERIC(10, 2) NOT NULL CHECK (sale_price >= 0),
    sold_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales_log (product_id);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales_log (sold_at);

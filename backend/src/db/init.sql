-- ============================================================
-- Smart Warehouse Inventory & Expiry Optimizer
-- Database Initialization Script
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------
-- 0. Users & Authentication
-- -----------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('FLOOR_STAFF', 'MANAGER');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          user_role    NOT NULL DEFAULT 'FLOOR_STAFF',
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

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

-- ============================================================
-- StockRadar — Seed Migration
-- Test accounts for immediate verification of RBAC
-- Run once after init.sql has been applied.
--
-- Passwords are bcrypt hashes (cost factor 10):
--   manager@stockradar.com  → manager123
--   staff@stockradar.com    → staff123
-- ============================================================

INSERT INTO users (email, password_hash, full_name, role)
VALUES
  (
    'manager@stockradar.com',
    '$2b$10$NZWJzTzMOZ7oFB6q9NBS6uq1zuvbOVzBmU352qeSmdaamMdZMiGX2',
    'Sarah Manager',
    'MANAGER'
  ),
  (
    'staff@stockradar.com',
    '$2b$10$V35PhtWEiEJPs8bbhDCSVutQDwascI/G80P1.8J2Nw6hnopW5QRNW',
    'John Staff',
    'FLOOR_STAFF'
  )
ON CONFLICT (email) DO NOTHING;

-- POS F&B System — Database Schema
-- Run: psql -U postgres -d pos_db -f init.sql

-- Create database (run separately if needed)
-- CREATE DATABASE pos_db;

-- ============================================================
-- Schema: public — Shared (Users, Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) CHECK (role IN ('admin','manager','cashier','kitchen','accountant')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    refresh_token TEXT UNIQUE NOT NULL,
    device_info TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed users (passwords: admin123, mgr123, cs123, acc123, ktch123)
INSERT INTO public.users (username, password_hash, full_name, role) VALUES
    ('admin', '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5yY5y5y5y5y5y5y5y5y5y5y', 'Admin', 'admin'),
    ('manager1', '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5yY5y5y5y5y5y5y5y5y5y5y', 'Quản Lý', 'manager'),
    ('cashier1', '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5yY5y5y5y5y5y5y5y5y5y5y', 'Thu Ngân 1', 'cashier'),
    ('accountant1', '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5yY5y5y5y5y5y5y5y5y5y5y', 'Kế Toán', 'accountant'),
    ('kitchen1', '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5yY5y5y5y5y5y5y5y5y5y5y', 'Bếp Trưởng', 'kitchen')
ON CONFLICT (username) DO NOTHING;

-- Audit log
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name VARCHAR(50),
    action VARCHAR(20),
    resource VARCHAR(50),
    resource_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Schema: ban_hang — POS / Sales
-- ============================================================
CREATE SCHEMA IF NOT EXISTS ban_hang;

CREATE TABLE IF NOT EXISTS ban_hang.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(10) NOT NULL,
    area VARCHAR(20),
    capacity INT DEFAULT 4,
    status VARCHAR(20) DEFAULT 'trong'
);

CREATE TABLE IF NOT EXISTS ban_hang.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'phần',
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    options JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ban_hang.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES ban_hang.tables(id),
    cashier_id UUID REFERENCES public.users(id),
    status VARCHAR(20) DEFAULT 'moi',
    note TEXT,
    total_amount DECIMAL(14,2) DEFAULT 0,
    discount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now(),
    paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ban_hang.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES ban_hang.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES ban_hang.products(id),
    product_name VARCHAR(200),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    options JSONB DEFAULT '[]',
    note TEXT,
    status VARCHAR(20) DEFAULT 'moi',
    service_type VARCHAR(20) DEFAULT 'dine_in',
    order_round INT DEFAULT 1
);

-- Seed products
INSERT INTO ban_hang.products (code, name, category, price) VALUES
    ('SC01', 'Sữa chua đánh đá', 'SỮA CHUA', 20000),
    ('TC01', 'Trà chanh truyền thống', 'TRÀ CHANH', 10000),
    ('CHE01', 'Chè bưởi', 'CHÈ', 15000),
    ('TS01', 'Trà sữa truyền thống', 'TRÀ SỮA', 20000),
    ('DV01', 'Xúc xích', 'ĐỒ ĂN VẶT', 10000)
ON CONFLICT (code) DO NOTHING;

-- Seed tables (10 bàn)
INSERT INTO ban_hang.tables (name, area, capacity) VALUES
    ('Bàn 1', 'Trong nhà', 4),
    ('Bàn 2', 'Trong nhà', 4),
    ('Bàn 3', 'Trong nhà', 4),
    ('Bàn 4', 'Trong nhà', 4),
    ('Bàn 5', 'Trong nhà', 4),
    ('Bàn 6', 'Ngoài trời', 4),
    ('Bàn 7', 'Ngoài trời', 4),
    ('Bàn 8', 'Ngoài trời', 4),
    ('Bàn 9', 'VIP', 6),
    ('Bàn 10', 'VIP', 6)
ON CONFLICT DO NOTHING;

-- Default stations for KDS routing
CREATE TABLE IF NOT EXISTS ban_hang.stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    categories TEXT[],
    printer_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO ban_hang.stations (name, code, categories) VALUES
    ('Bếp Chính', 'main', ARRAY['Món chính']),
    ('Bếp Khai Vị', 'starter', ARRAY['Khai vị']),
    ('Bếp Nướng/Lẩu', 'grill', ARRAY['Nướng', 'Lẩu']),
    ('Bar', 'bar', ARRAY['Đồ uống']),
    ('Bếp Tráng Miệng', 'dessert', ARRAY['Tráng miệng'])
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Schema: quan_ly — Management
-- ============================================================
CREATE SCHEMA IF NOT EXISTS quan_ly;

CREATE TABLE IF NOT EXISTS quan_ly.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES ban_hang.products(id),
    quantity DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'kg',
    min_alert DECIMAL(12,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quan_ly.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES ban_hang.products(id),
    type VARCHAR(10) CHECK (type IN ('nhap','xuat','dieu_chinh')),
    quantity DECIMAL(12,2) NOT NULL,
    note TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quan_ly.shift_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    shift_code VARCHAR(20),
    start_at TIMESTAMPTZ DEFAULT now(),
    end_at TIMESTAMPTZ,
    opening_balance DECIMAL(14,2) DEFAULT 0,
    closing_balance DECIMAL(14,2),
    cash_end DECIMAL(14,2) DEFAULT 0,
    card_total DECIMAL(14,2) DEFAULT 0,
    transfer_total DECIMAL(14,2) DEFAULT 0,
    total_revenue DECIMAL(14,2) DEFAULT 0,
    expense_total DECIMAL(14,2) DEFAULT 0,
    difference DECIMAL(14,2),
    status VARCHAR(20) DEFAULT 'dang_lam',
    note TEXT
);

CREATE TABLE IF NOT EXISTS quan_ly.raw_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    unit VARCHAR(20) DEFAULT 'kg',
    default_cost DECIMAL(14,2) DEFAULT 0,
    current_stock DECIMAL(12,2) DEFAULT 0,
    min_stock DECIMAL(12,2) DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quan_ly.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    yield_qty DECIMAL(12,2) DEFAULT 1,
    yield_unit VARCHAR(20) DEFAULT 'phần',
    cost_price DECIMAL(14,2) DEFAULT 0,
    instructions TEXT,
    wastage_percent DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quan_ly.recipe_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES quan_ly.recipes(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    cost DECIMAL(14,2) DEFAULT 0,
    note TEXT
);

-- ============================================================
-- Schema: ke_toan — Accounting
-- ============================================================
CREATE SCHEMA IF NOT EXISTS ke_toan;

CREATE TABLE IF NOT EXISTS ke_toan.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(10) CHECK (type IN ('thu','chi')),
    category VARCHAR(50),
    amount DECIMAL(14,2) NOT NULL,
    ref_id UUID,
    note TEXT,
    exported_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Schema: quan_ly — Suppliers + Purchase Orders
-- ============================================================
CREATE TABLE IF NOT EXISTS quan_ly.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    tax_code VARCHAR(20),
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quan_ly.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(30) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES quan_ly.suppliers(id),
    status VARCHAR(20) DEFAULT 'draft',
    total_amount DECIMAL(14,2) DEFAULT 0,
    note TEXT,
    expected_date DATE,
    received_date DATE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quan_ly.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID REFERENCES quan_ly.purchase_orders(id) ON DELETE CASCADE,
    raw_material_id UUID,
    raw_material_name VARCHAR(200),
    quantity DECIMAL(12,2) DEFAULT 0,
    unit_price DECIMAL(14,2) DEFAULT 0,
    received_quantity DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(14,2) DEFAULT 0
);

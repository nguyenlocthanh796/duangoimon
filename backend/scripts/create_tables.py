"""Create missing multi-schema tables using sync psycopg2 (same as alembic.ini)."""
import psycopg2

DATABASE_URL = "host=aws-0-ap-northeast-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.nyormgswqejwbwbuhkiy password=Posa@2026Secure!"

SQL = """
CREATE SCHEMA IF NOT EXISTS ban_hang;
CREATE SCHEMA IF NOT EXISTS ke_toan;
CREATE SCHEMA IF NOT EXISTS quan_ly;
CREATE SCHEMA IF NOT EXISTS thue;

-- ban_hang
CREATE TABLE IF NOT EXISTS ban_hang.tables (
    id UUID PRIMARY KEY, branch_id UUID, name VARCHAR(10),
    area VARCHAR(20), capacity INTEGER DEFAULT 4, status VARCHAR(20) DEFAULT 'trong'
);
CREATE TABLE IF NOT EXISTS ban_hang.products (
    id UUID PRIMARY KEY, branch_id UUID, code VARCHAR(20) UNIQUE,
    name VARCHAR(200) NOT NULL, category VARCHAR(100),
    price NUMERIC(14,2) DEFAULT 0, cost_price NUMERIC(14,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'phan', image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE, options JSONB DEFAULT '[]',
    vat_rate NUMERIC(5,4) DEFAULT 0, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS ban_hang.orders (
    id UUID PRIMARY KEY, table_id UUID, branch_id UUID, cashier_id UUID,
    status VARCHAR(20) DEFAULT 'moi', note TEXT,
    total_amount NUMERIC(14,2) DEFAULT 0, discount NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0, payment_method VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL, paid_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS ban_hang.order_items (
    id UUID PRIMARY KEY, branch_id UUID,
    order_id UUID REFERENCES ban_hang.orders(id) ON DELETE CASCADE,
    product_id UUID, product_name VARCHAR(200), quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(12,2), total NUMERIC(14,2) DEFAULT 0,
    options JSONB DEFAULT '[]', vat_rate NUMERIC(4,2) DEFAULT 8,
    note TEXT, status VARCHAR(20) DEFAULT 'moi',
    service_type VARCHAR(20) DEFAULT 'dine_in', order_round INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS ban_hang.stations (
    id UUID PRIMARY KEY, branch_id UUID, name VARCHAR(50),
    code VARCHAR(20) UNIQUE, categories TEXT[], printer_name VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL
);

-- ke_toan
CREATE TABLE IF NOT EXISTS ke_toan.transactions (
    id UUID PRIMARY KEY, branch_id UUID, type VARCHAR(10),
    category VARCHAR(50), amount NUMERIC(14,2), ref_id UUID,
    note TEXT, created_by UUID, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS ke_toan.invoices (
    id UUID PRIMARY KEY, order_id UUID, branch_id UUID,
    invoice_number VARCHAR(20) UNIQUE, token VARCHAR(24) UNIQUE,
    buyer_name VARCHAR(200), buyer_tax_code VARCHAR(20),
    total_amount NUMERIC(14,2), vat_rate NUMERIC(4,2) DEFAULT 10,
    vat_amount NUMERIC(14,2), status VARCHAR(20) DEFAULT 'moi',
    exported_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS ke_toan.so_s1a (
    id UUID PRIMARY KEY, branch_id UUID, period_month VARCHAR(7),
    revenue_total NUMERIC(16,2) DEFAULT 0, locked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS ke_toan.so_s2a (
    id UUID PRIMARY KEY, branch_id UUID, period_month VARCHAR(7),
    product_category VARCHAR(20) DEFAULT 'phan_phoi', revenue NUMERIC(16,2) DEFAULT 0,
    vat_rate NUMERIC(4,2) DEFAULT 1, tncn_rate NUMERIC(4,2) DEFAULT 0.5, locked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS ke_toan.so_s2b (
    id UUID PRIMARY KEY, branch_id UUID, period_month VARCHAR(7),
    revenue NUMERIC(16,2) DEFAULT 0, locked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS ke_toan.so_s2c (
    id UUID PRIMARY KEY, branch_id UUID, period_month VARCHAR(7),
    revenue NUMERIC(16,2) DEFAULT 0, cost_of_goods NUMERIC(16,2) DEFAULT 0,
    other_expense NUMERIC(16,2) DEFAULT 0, taxable_income NUMERIC(16,2) DEFAULT 0, locked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS ke_toan.so_s2d (
    id UUID PRIMARY KEY, branch_id UUID, period_month VARCHAR(7),
    product_id UUID, opening_qty NUMERIC(12,2) DEFAULT 0,
    inbound_qty NUMERIC(12,2) DEFAULT 0, outbound_qty NUMERIC(12,2) DEFAULT 0,
    closing_qty NUMERIC(12,2) DEFAULT 0, avg_cost NUMERIC(14,2) DEFAULT 0,
    closing_value NUMERIC(16,2) DEFAULT 0, locked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS ke_toan.so_s2e (
    id UUID PRIMARY KEY, branch_id UUID, period_month VARCHAR(7),
    bank_account VARCHAR(50) DEFAULT '', opening_balance NUMERIC(16,2) DEFAULT 0,
    inflow NUMERIC(16,2) DEFAULT 0, outflow NUMERIC(16,2) DEFAULT 0,
    closing_balance NUMERIC(16,2) DEFAULT 0, locked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS ke_toan.so_s3a (
    id UUID PRIMARY KEY, branch_id UUID, period_month VARCHAR(7),
    tax_type VARCHAR(20) DEFAULT 'xnk', payable NUMERIC(16,2) DEFAULT 0,
    paid NUMERIC(16,2) DEFAULT 0, signed_by VARCHAR(100) DEFAULT '', locked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS ke_toan.cash_register_invoices (
    id UUID PRIMARY KEY, branch_id UUID, order_id UUID,
    invoice_code VARCHAR(23) UNIQUE, issued_at TIMESTAMPTZ NOT NULL,
    buyer_name VARCHAR(200), buyer_tax_code VARCHAR(20), buyer_personal_id VARCHAR(20),
    total NUMERIC(16,2) DEFAULT 0, status VARCHAR(20) DEFAULT 'moi',
    adjustment_of UUID, adjustment_type VARCHAR(10), tax_auth_status VARCHAR(20),
    qr_data TEXT, delivery_channels JSONB, created_at TIMESTAMPTZ NOT NULL
);

-- quan_ly
CREATE TABLE IF NOT EXISTS quan_ly.inventory (
    id UUID PRIMARY KEY, branch_id UUID, product_id UUID,
    quantity NUMERIC(12,2) DEFAULT 0, unit VARCHAR(20) DEFAULT 'kg',
    min_alert NUMERIC(12,2) DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS quan_ly.inventory_transactions (
    id UUID PRIMARY KEY, branch_id UUID, product_id UUID, type VARCHAR(10),
    quantity NUMERIC(12,2), amount NUMERIC(14,2) DEFAULT 0, note TEXT,
    created_by UUID, created_at TIMESTAMPTZ NOT NULL,
    unit_cost NUMERIC(14,2), avg_cost_backfilled BOOLEAN DEFAULT FALSE,
    accounting_period VARCHAR(7), locked_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS quan_ly.shift_logs (
    id UUID PRIMARY KEY, user_id UUID, branch_id UUID, shift_code VARCHAR(20),
    start_at TIMESTAMPTZ NOT NULL, end_at TIMESTAMPTZ,
    opening_balance NUMERIC(14,2) DEFAULT 0, closing_balance NUMERIC(14,2),
    cash_end NUMERIC(14,2), card_total NUMERIC(14,2), transfer_total NUMERIC(14,2),
    total_revenue NUMERIC(14,2), expense_total NUMERIC(14,2), difference NUMERIC(14,2),
    status VARCHAR(20) DEFAULT 'dang_lam', note TEXT
);
CREATE TABLE IF NOT EXISTS quan_ly.raw_materials (
    id UUID PRIMARY KEY, branch_id UUID, code VARCHAR(20) UNIQUE,
    name VARCHAR(200), category VARCHAR(50), unit VARCHAR(20) DEFAULT 'kg',
    default_cost NUMERIC(14,2) DEFAULT 0, current_stock NUMERIC(12,2) DEFAULT 0,
    min_stock NUMERIC(12,2) DEFAULT 0, image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS quan_ly.recipes (
    id UUID PRIMARY KEY, branch_id UUID, product_id UUID,
    name VARCHAR(200), yield_qty NUMERIC(12,2) DEFAULT 1,
    yield_unit VARCHAR(20) DEFAULT 'phan', cost_price NUMERIC(14,2) DEFAULT 0,
    instructions TEXT, wastage_percent NUMERIC(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS quan_ly.recipe_items (
    id UUID PRIMARY KEY, branch_id UUID,
    recipe_id UUID REFERENCES quan_ly.recipes(id) ON DELETE CASCADE,
    raw_material_id UUID, quantity NUMERIC(12,3) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'kg', cost NUMERIC(14,2) DEFAULT 0, note TEXT
);
CREATE TABLE IF NOT EXISTS quan_ly.recipe_versions (
    id UUID PRIMARY KEY, recipe_id UUID REFERENCES quan_ly.recipes(id) ON DELETE CASCADE,
    version_number INTEGER, name VARCHAR(200), cost_price NUMERIC(14,2) DEFAULT 0,
    items_json JSONB DEFAULT '[]', changed_by UUID, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS quan_ly.suppliers (
    id UUID PRIMARY KEY, branch_id UUID, code VARCHAR(20) UNIQUE,
    name VARCHAR(200), contact_person VARCHAR(100), phone VARCHAR(20),
    email VARCHAR(100), address TEXT, tax_code VARCHAR(20),
    payment_terms VARCHAR(100), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS quan_ly.purchase_orders (
    id UUID PRIMARY KEY, branch_id UUID, po_number VARCHAR(30) UNIQUE,
    supplier_id UUID REFERENCES quan_ly.suppliers(id),
    status VARCHAR(20) DEFAULT 'draft', total_amount NUMERIC(14,2) DEFAULT 0,
    note TEXT, expected_date DATE, received_date DATE,
    created_by UUID, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS quan_ly.purchase_order_items (
    id UUID PRIMARY KEY, branch_id UUID,
    po_id UUID REFERENCES quan_ly.purchase_orders(id) ON DELETE CASCADE,
    raw_material_id UUID, raw_material_name VARCHAR(200),
    quantity NUMERIC(12,2) DEFAULT 0, unit_price NUMERIC(14,2) DEFAULT 0,
    received_quantity NUMERIC(12,2) DEFAULT 0, total NUMERIC(14,2) DEFAULT 0
);

-- thue
CREATE TABLE IF NOT EXISTS thue.hkd_profiles (
    id UUID PRIMARY KEY, branch_id UUID, tax_code VARCHAR(14),
    legal_name VARCHAR(200), registration_status VARCHAR(20) DEFAULT 'chua_dang_ky',
    tax_method VARCHAR(20) DEFAULT 'mien_thue', revenue_ytd NUMERIC(18,2) DEFAULT 0,
    fiscal_year INTEGER, opened_in_first_half BOOLEAN DEFAULT TRUE,
    threshold_alert_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS thue.notification_logs (
    id UUID PRIMARY KEY, branch_id UUID, category VARCHAR(30),
    channel VARCHAR(20) DEFAULT 'in_app', recipient VARCHAR(120),
    subject VARCHAR(200), message TEXT, ref_type VARCHAR(40), ref_id UUID,
    delivered BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS thue.notified_bank_accounts (
    id UUID PRIMARY KEY, branch_id UUID, tax_code VARCHAR(14),
    bank_name VARCHAR(50), account_number VARCHAR(30),
    wallet_type VARCHAR(20) DEFAULT 'bank', notified_at TIMESTAMPTZ,
    form_status VARCHAR(20) DEFAULT 'chua_thong_bao'
);
CREATE TABLE IF NOT EXISTS thue.declaration_deadlines (
    id UUID PRIMARY KEY, branch_id UUID, form VARCHAR(20),
    period_type VARCHAR(10) DEFAULT 'thang', due_date DATE,
    reminded_14 BOOLEAN DEFAULT FALSE, reminded_7 BOOLEAN DEFAULT FALSE,
    reminded_3 BOOLEAN DEFAULT FALSE, reminded_1 BOOLEAN DEFAULT FALSE,
    notified BOOLEAN DEFAULT FALSE, submitted BOOLEAN DEFAULT FALSE, submitted_at TIMESTAMPTZ
);
"""


def main():
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
    conn.autocommit = True
    cur = conn.cursor()
    statements = [s.strip() for s in SQL.split(";") if s.strip()]
    for i, stmt in enumerate(statements):
        try:
            cur.execute(stmt)
            print(f"  OK [{i+1}/{len(statements)}] {stmt[:60]}...")
        except Exception as e:
            print(f"  SKIP [{i+1}/{len(statements)}] {e}")
    cur.close()
    conn.close()
    print("DONE!")


if __name__ == "__main__":
    main()

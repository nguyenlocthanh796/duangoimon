-- ==============================================================================
-- ONGCHU POS DATABASE SCHEMA (MERCHANT-FIRST F&B PLATFORM)
-- Dành riêng cho Chủ Quán: Sổ Quỹ Tiền Mặt Thực, Giao Ca Két, Định Mức Món, Chống Gian Lận
-- ==============================================================================

-- 1. Tenants & Branches
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (Chủ Quán, Thu Ngân, Bếp)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) REFERENCES branches(id) ON DELETE SET NULL,
    username VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'cashier',
    pin_code VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Categories & Products
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100) DEFAULT 'food-outline',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id VARCHAR(36) REFERENCES categories(id) ON DELETE SET NULL,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) DEFAULT 'Phần',
    cost_price NUMERIC(15, 2) DEFAULT 0,
    selling_price NUMERIC(15, 2) NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Nguyên Vật Liệu Thực Tế & Định Mức Món (Ingredients & Recipe BOM)
CREATE TABLE IF NOT EXISTS ingredients (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    current_stock NUMERIC(15, 2) DEFAULT 0,
    min_stock NUMERIC(15, 2) DEFAULT 0,
    avg_cost_price NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipe_items (
    id VARCHAR(36) PRIMARY KEY,
    product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id VARCHAR(36) NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_used NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bàn Ăn & Khu Vực
CREATE TABLE IF NOT EXISTS dining_tables (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    area_name VARCHAR(100) DEFAULT 'Tầng 1',
    name VARCHAR(100) NOT NULL,
    capacity INT DEFAULT 4,
    status VARCHAR(50) DEFAULT 'trong',
    active_order_id VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Quản Lý Ca Làm Việc & Đếm Két (Shift Audit & Reconciliation)
CREATE TABLE IF NOT EXISTS cash_shifts (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    cashier_id VARCHAR(36) NOT NULL,
    cashier_name VARCHAR(255) NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    starting_cash NUMERIC(15, 2) NOT NULL,
    total_cash_sales NUMERIC(15, 2) DEFAULT 0,
    total_vietqr_sales NUMERIC(15, 2) DEFAULT 0,
    total_cash_in NUMERIC(15, 2) DEFAULT 0,
    total_cash_out NUMERIC(15, 2) DEFAULT 0,
    expected_ending_cash NUMERIC(15, 2) DEFAULT 0,
    actual_ending_cash NUMERIC(15, 2) DEFAULT 0,
    difference_amount NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'dang_mo',
    note TEXT,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 7. Đơn Hàng & Món Bán
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    order_code VARCHAR(50) NOT NULL,
    table_id VARCHAR(36) REFERENCES dining_tables(id) ON DELETE SET NULL,
    cashier_name VARCHAR(255),
    customer_name VARCHAR(255),
    order_type VARCHAR(50) DEFAULT 'dine_in',
    status VARCHAR(50) DEFAULT 'dang_xu_ly',
    subtotal NUMERIC(15, 2) DEFAULT 0,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL,
    total_cost_price NUMERIC(15, 2) DEFAULT 0,
    payment_method VARCHAR(50),
    paid_amount NUMERIC(15, 2) DEFAULT 0,
    change_amount NUMERIC(15, 2) DEFAULT 0,
    shift_id VARCHAR(36) REFERENCES cash_shifts(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(36) REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    cost_price NUMERIC(15, 2) DEFAULT 0,
    quantity NUMERIC(10, 2) NOT NULL,
    modifier_names TEXT,
    total_price NUMERIC(15, 2) NOT NULL,
    kitchen_status VARCHAR(50) DEFAULT 'cho_che_bien',
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Sổ Quỹ Tiền Mặt Thực Tế (Chi Mua Đá, Rau Chợ, Ứng Lương...)
CREATE TABLE IF NOT EXISTS cash_transactions (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    shift_id VARCHAR(36) REFERENCES cash_shifts(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL, -- thu, chi
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Nhật Ký Chống Gian Lận (Anti-Fraud Activity Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    order_id VARCHAR(36),
    details TEXT,
    severity VARCHAR(20) DEFAULT 'info',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Cấu hình Quán, Mẫu Bill & Tài khoản nhận tiền VietQR
CREATE TABLE IF NOT EXISTS pos_settings (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    store_name VARCHAR(255) DEFAULT 'OngChu POS F&B',
    store_address TEXT,
    store_phone VARCHAR(50),
    slogan TEXT,
    opening_hours VARCHAR(100) DEFAULT '07:00 - 22:30',
    wifi_name VARCHAR(100),
    wifi_password VARCHAR(100),
    website TEXT,
    facebook_page TEXT,
    bank_code VARCHAR(50) DEFAULT 'MB',
    bank_name VARCHAR(100) DEFAULT 'MBBank Quân Đội',
    bank_account_no VARCHAR(100) DEFAULT '0987654321',
    bank_account_name VARCHAR(255) DEFAULT 'NGUYEN LOC THANH',
    bank_branch TEXT,
    transfer_syntax VARCHAR(100) DEFAULT '[MA_DON]',
    qr_payment_template VARCHAR(50) DEFAULT 'compact2',
    receipt_title VARCHAR(255) DEFAULT 'HÓA ĐƠN THANH TOÁN',
    receipt_footer TEXT DEFAULT 'Cảm ơn Quý khách & Hẹn gặp lại!',
    printer_ip VARCHAR(50) DEFAULT '192.168.1.200',
    printer_port INT DEFAULT 9100,
    paper_size VARCHAR(20) DEFAULT 'K80',
    print_copies INT DEFAULT 1,
    print_qr_on_bill BOOLEAN DEFAULT TRUE,
    print_wifi_on_bill BOOLEAN DEFAULT TRUE,
    print_cashier_on_bill BOOLEAN DEFAULT TRUE,
    print_item_note_on_bill BOOLEAN DEFAULT TRUE,
    print_barcode_on_bill BOOLEAN DEFAULT TRUE,
    auto_cut BOOLEAN DEFAULT TRUE,
    kick_drawer BOOLEAN DEFAULT TRUE,
    kitchen_printer_ip VARCHAR(50) DEFAULT '192.168.1.201',
    kitchen_printer_port INT DEFAULT 9100,
    enable_kitchen_printer BOOLEAN DEFAULT FALSE,
    vat_rate NUMERIC(5, 2) DEFAULT 0,
    service_fee_rate NUMERIC(5, 2) DEFAULT 0,
    default_order_channel VARCHAR(50) DEFAULT 'dine_in',
    auto_print_on_payment BOOLEAN DEFAULT TRUE,
    require_table_selection BOOLEAN DEFAULT TRUE,
    allow_negative_stock BOOLEAN DEFAULT TRUE,
    require_pin_for_void BOOLEAN DEFAULT TRUE,
    high_discount_threshold NUMERIC(5, 2) DEFAULT 20,
    kds_auto_cleanup_minutes INT DEFAULT 30,
    telegram_bot_token TEXT,
    telegram_chat_id VARCHAR(100),
    enable_telegram_alerts BOOLEAN DEFAULT FALSE,
    cfd_welcome_message TEXT DEFAULT 'Kính Chào Quý Khách!',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_branch_settings UNIQUE (tenant_id, branch_id)
);

-- 11. Khu Vực Bàn & Topping Món Ăn
CREATE TABLE IF NOT EXISTS areas (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS toppings (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price_delta NUMERIC(15, 2) DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Nhân Sự, Chấm Công & Bảng Lương (Staff & Payroll)
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role VARCHAR(50) DEFAULT 'phuc_vu',
    wage_type VARCHAR(50) DEFAULT 'hourly', -- hourly, monthly, per_shift
    wage_rate NUMERIC(15, 2) NOT NULL,
    allowance NUMERIC(15, 2) DEFAULT 0,
    overtime_rate_multiplier NUMERIC(5, 2) DEFAULT 1.5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_shifts (
    id VARCHAR(36) PRIMARY KEY,
    staff_id VARCHAR(36) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    shift_type VARCHAR(50) NOT NULL, -- ca_sang, ca_chieu, ca_toi, ca_gay
    work_date VARCHAR(20) NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    regular_hours NUMERIC(6, 2) DEFAULT 0,
    overtime_hours NUMERIC(6, 2) DEFAULT 0,
    note TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_advances (
    id VARCHAR(36) PRIMARY KEY,
    staff_id VARCHAR(36) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    reason TEXT,
    cash_transaction_id VARCHAR(36) REFERENCES cash_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_payrolls (
    id VARCHAR(36) PRIMARY KEY,
    staff_id VARCHAR(36) NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    period_month INT NOT NULL,
    period_year INT NOT NULL,
    base_salary NUMERIC(15, 2) DEFAULT 0,
    allowance NUMERIC(15, 2) DEFAULT 0,
    overtime_pay NUMERIC(15, 2) DEFAULT 0,
    bonus NUMERIC(15, 2) DEFAULT 0,
    deductions NUMERIC(15, 2) DEFAULT 0,
    advances NUMERIC(15, 2) DEFAULT 0,
    net_salary NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid
    paid_at TIMESTAMP WITH TIME ZONE,
    cash_transaction_id VARCHAR(36) REFERENCES cash_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Chi Phí Cố Định & Vận Hành Định Kỳ
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id VARCHAR(36) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    frequency VARCHAR(50) DEFAULT 'monthly',
    due_day INT DEFAULT 1,
    auto_record BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_shift ON orders(tenant_id, shift_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_tx_tenant_date ON cash_transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shifts_tenant_status ON cash_shifts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_staff_tenant_role ON staff(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_date ON staff_shifts(staff_id, work_date);

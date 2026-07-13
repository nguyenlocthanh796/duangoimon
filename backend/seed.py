# -*- coding: utf-8 -*-
"""
POS F&B - Database Seed Script
Runs synchronously via psycopg.
- Creates schemas + tables
- Seeds 3 users, 12 restaurant tables, 25 products
"""

import io
import json
import os
import sys

# Force UTF-8 stdout on Windows to support Vietnamese text in print()
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(__file__))

import uuid

import psycopg
from passlib.context import CryptContext

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DATABASE_URL_ENV = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/pos_db",
)
SYNC_DSN = DATABASE_URL_ENV.replace("postgresql+psycopg://", "postgresql://")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


# ---------------------------------------------------------------------------
# DDL - ensure schemas and tables exist
# ---------------------------------------------------------------------------
DDL = """
CREATE SCHEMA IF NOT EXISTS ban_hang;
CREATE SCHEMA IF NOT EXISTS quan_ly;
CREATE SCHEMA IF NOT EXISTS ke_toan;

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
    unit VARCHAR(20) DEFAULT 'phan',
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
    product_id UUID,
    product_name VARCHAR(200),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    options JSONB DEFAULT '[]',
    note TEXT,
    status VARCHAR(20) DEFAULT 'moi'
);

CREATE TABLE IF NOT EXISTS quan_ly.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES ban_hang.products(id),
    quantity DECIMAL(12,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'kg',
    min_alert DECIMAL(12,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
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

CREATE TABLE IF NOT EXISTS ban_hang.stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    categories TEXT[],
    printer_name VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS ke_toan.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(10) CHECK (type IN ('thu','chi')),
    category VARCHAR(50),
    amount DECIMAL(14,2) NOT NULL,
    ref_id UUID,
    note TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ke_toan.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    invoice_number VARCHAR(30) UNIQUE NOT NULL,
    total_amount DECIMAL(14,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    exported_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

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
"""

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------
USERS = [
    {
        "username": "admin",
        "plain_password": os.getenv("ADMIN_PASS", os.getenv("HARDCODED_PASS", "admin123")),
        "full_name": "Quan Tri Vien",
        "role": "admin",
    },
    {
        "username": "manager1",
        "plain_password": os.getenv("MANAGER_PASS", "mgr123"),
        "full_name": "Quan Ly",
        "role": "manager",
    },
    {
        "username": "cashier1",
        "plain_password": os.getenv("CASHIER_PASS", "cs123"),
        "full_name": "Thu Ngan 1",
        "role": "cashier",
    },
    {
        "username": "accountant1",
        "plain_password": os.getenv("ACCOUNTANT_PASS", "acc123"),
        "full_name": "Ke Toan",
        "role": "accountant",
    },
    {
        "username": "kitchen1",
        "plain_password": os.getenv("KITCHEN_PASS", "ktch123"),
        "full_name": "Bep Truong",
        "role": "kitchen",
    },
]

TABLES = [
    # Tang 1: T01-T04
    {"name": "T01", "area": "Tang 1", "capacity": 4, "status": "trong"},
    {"name": "T02", "area": "Tang 1", "capacity": 4, "status": "trong"},
    {"name": "T03", "area": "Tang 1", "capacity": 4, "status": "trong"},
    {"name": "T04", "area": "Tang 1", "capacity": 4, "status": "trong"},
    # Tang 2: T05-T08
    {"name": "T05", "area": "Tang 2", "capacity": 4, "status": "trong"},
    {"name": "T06", "area": "Tang 2", "capacity": 4, "status": "trong"},
    {"name": "T07", "area": "Tang 2", "capacity": 4, "status": "trong"},
    {"name": "T08", "area": "Tang 2", "capacity": 4, "status": "trong"},
    # Ngoai Troi: N01-N04
    {"name": "N01", "area": "Ngoai Troi", "capacity": 4, "status": "trong"},
    {"name": "N02", "area": "Ngoai Troi", "capacity": 4, "status": "trong"},
    {"name": "N03", "area": "Ngoai Troi", "capacity": 4, "status": "trong"},
    {"name": "N04", "area": "Ngoai Troi", "capacity": 4, "status": "trong"},
]

PRODUCTS = [
    # ── SỮA CHUA ──
    {
        "code": "SC01",
        "name": "Sữa chua đánh đá",
        "category": "SỮA CHUA",
        "price": 20000,
        "cost_price": 8000,
        "unit": "ly",
        "options": [],
    },
    {
        "code": "SC02",
        "name": "Sữa chua mít",
        "category": "SỮA CHUA",
        "price": 25000,
        "cost_price": 10000,
        "unit": "ly",
        "options": [],
    },
    {
        "code": "SC03",
        "name": "Sữa chua trân châu",
        "category": "SỮA CHUA",
        "price": 25000,
        "cost_price": 10000,
        "unit": "ly",
        "options": [],
    },
    {
        "code": "SC04",
        "name": "Sữa chua thạch",
        "category": "SỮA CHUA",
        "price": 25000,
        "cost_price": 10000,
        "unit": "ly",
        "options": [],
    },
    {
        "code": "SC05",
        "name": "Sữa chua việt quất",
        "category": "SỮA CHUA",
        "price": 25000,
        "cost_price": 10000,
        "unit": "ly",
        "options": [],
    },
    {
        "code": "SC06",
        "name": "Sữa chua dâu",
        "category": "SỮA CHUA",
        "price": 25000,
        "cost_price": 10000,
        "unit": "ly",
        "options": [],
    },
    {
        "code": "SC07",
        "name": "Sữa chua hoa quả",
        "category": "SỮA CHUA",
        "price": 30000,
        "cost_price": 12000,
        "unit": "ly",
        "options": [],
    },
    # ── TRÀ CHANH ──
    {
        "code": "TC01",
        "name": "Trà chanh truyền thống",
        "category": "TRÀ CHANH",
        "price": 10000,
        "cost_price": 3000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 15000}],
    },
    {
        "code": "TC02",
        "name": "Trà chanh dưa lưới",
        "category": "TRÀ CHANH",
        "price": 15000,
        "cost_price": 5000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 20000}],
    },
    {
        "code": "TC03",
        "name": "Trà ổi hồng chanh leo",
        "category": "TRÀ CHANH",
        "price": 20000,
        "cost_price": 7000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 25000}],
    },
    {
        "code": "TC04",
        "name": "Trà chanh leo đào",
        "category": "TRÀ CHANH",
        "price": 20000,
        "cost_price": 7000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 25000}],
    },
    {
        "code": "TC05",
        "name": "Trà chanh dâu",
        "category": "TRÀ CHANH",
        "price": 15000,
        "cost_price": 5000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 20000}],
    },
    {
        "code": "TC06",
        "name": "Trà chanh đào",
        "category": "TRÀ CHANH",
        "price": 15000,
        "cost_price": 5000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 20000}],
    },
    # ── ĐỒ ĂN VẶT ──
    {
        "code": "DV01",
        "name": "Xúc xích",
        "category": "ĐỒ ĂN VẶT",
        "price": 10000,
        "cost_price": 5000,
        "unit": "cái",
        "options": [],
    },
    {
        "code": "DV02",
        "name": "Viên chiên củ quả",
        "category": "ĐỒ ĂN VẶT",
        "price": 30000,
        "cost_price": 12000,
        "unit": "phần",
        "options": [],
    },
    {
        "code": "DV03",
        "name": "Nem chua rán",
        "category": "ĐỒ ĂN VẶT",
        "price": 30000,
        "cost_price": 12000,
        "unit": "phần",
        "options": [],
    },
    {
        "code": "DV04",
        "name": "Khoai tây chiên",
        "category": "ĐỒ ĂN VẶT",
        "price": 30000,
        "cost_price": 10000,
        "unit": "phần",
        "options": [],
    },
    {
        "code": "DV05",
        "name": "Khoai tây chiên lắc phô mai",
        "category": "ĐỒ ĂN VẶT",
        "price": 30000,
        "cost_price": 12000,
        "unit": "phần",
        "options": [],
    },
    {
        "code": "DV06",
        "name": "Khoai lang kén",
        "category": "ĐỒ ĂN VẶT",
        "price": 30000,
        "cost_price": 12000,
        "unit": "phần",
        "options": [],
    },
    {
        "code": "DV07",
        "name": "Phô mai que",
        "category": "ĐỒ ĂN VẶT",
        "price": 30000,
        "cost_price": 12000,
        "unit": "phần",
        "options": [],
    },
    {
        "code": "DV08",
        "name": "Khoai môn lệ phố",
        "category": "ĐỒ ĂN VẶT",
        "price": 30000,
        "cost_price": 12000,
        "unit": "phần",
        "options": [],
    },
    {
        "code": "DV09",
        "name": "Mẹt thập cẩm",
        "category": "ĐỒ ĂN VẶT",
        "price": 50000,
        "cost_price": 20000,
        "unit": "mẹt",
        "options": [{"type": "size", "name": "L", "price": 100000}],
    },
    {
        "code": "DV10",
        "name": "Chân gà sốt thái",
        "category": "ĐỒ ĂN VẶT",
        "price": 50000,
        "cost_price": 25000,
        "unit": "phần",
        "options": [{"type": "size", "name": "L", "price": 100000}],
    },
    {
        "code": "DV11",
        "name": "Nem nướng",
        "category": "ĐỒ ĂN VẶT",
        "price": 40000,
        "cost_price": 18000,
        "unit": "phần",
        "options": [],
    },
    # ── CHÈ ──
    {
        "code": "CHE01",
        "name": "Chè bưởi",
        "category": "CHÈ",
        "price": 15000,
        "cost_price": 5000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 20000}],
    },
    {
        "code": "CHE02",
        "name": "Chè thập cẩm",
        "category": "CHÈ",
        "price": 15000,
        "cost_price": 5000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 20000}],
    },
    {
        "code": "CHE03",
        "name": "Chè ba màu",
        "category": "CHÈ",
        "price": 15000,
        "cost_price": 5000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 20000}],
    },
    {
        "code": "CHE04",
        "name": "Chè Huế",
        "category": "CHÈ",
        "price": 15000,
        "cost_price": 5000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 20000}],
    },
    {
        "code": "CHE05",
        "name": "Chè đậu đỏ",
        "category": "CHÈ",
        "price": 15000,
        "cost_price": 5000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 20000}],
    },
    {
        "code": "CHE06",
        "name": "Chè thạch dừa",
        "category": "CHÈ",
        "price": 25000,
        "cost_price": 10000,
        "unit": "ly",
        "options": [],
    },
    {
        "code": "CHE07",
        "name": "Chè Thái",
        "category": "CHÈ",
        "price": 25000,
        "cost_price": 10000,
        "unit": "ly",
        "options": [],
    },
    {
        "code": "CHE08",
        "name": "Chè Thái sầu riêng",
        "category": "CHÈ",
        "price": 30000,
        "cost_price": 14000,
        "unit": "ly",
        "options": [],
    },
    {
        "code": "CHE09",
        "name": "Chè mít hạt đác",
        "category": "CHÈ",
        "price": 30000,
        "cost_price": 14000,
        "unit": "ly",
        "options": [],
    },
    # ── TRÀ SỮA ──
    {
        "code": "TS01",
        "name": "Trà sữa truyền thống",
        "category": "TRÀ SỮA",
        "price": 20000,
        "cost_price": 7000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 25000}],
    },
    {
        "code": "TS02",
        "name": "Trà sữa dâu",
        "category": "TRÀ SỮA",
        "price": 20000,
        "cost_price": 7000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 25000}],
    },
    {
        "code": "TS03",
        "name": "Trà sữa việt quất",
        "category": "TRÀ SỮA",
        "price": 20000,
        "cost_price": 7000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 25000}],
    },
    {
        "code": "TS04",
        "name": "Trà sữa socola",
        "category": "TRÀ SỮA",
        "price": 20000,
        "cost_price": 7000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 25000}],
    },
    {
        "code": "TS05",
        "name": "Trà sữa khoai môn",
        "category": "TRÀ SỮA",
        "price": 20000,
        "cost_price": 7000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 25000}],
    },
    {
        "code": "TS06",
        "name": "Trà sữa matcha",
        "category": "TRÀ SỮA",
        "price": 20000,
        "cost_price": 7000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 25000}],
    },
    {
        "code": "TS07",
        "name": "Trà sữa dưa lưới",
        "category": "TRÀ SỮA",
        "price": 20000,
        "cost_price": 7000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 25000}],
    },
    {
        "code": "TS08",
        "name": "Trà sữa kem trứng",
        "category": "TRÀ SỮA",
        "price": 25000,
        "cost_price": 10000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 30000}],
    },
    {
        "code": "TS09",
        "name": "Trà sữa đường đen",
        "category": "TRÀ SỮA",
        "price": 25000,
        "cost_price": 10000,
        "unit": "ly",
        "options": [{"type": "size", "name": "L", "price": 30000}],
    },
    # ── SODA ──
    {
        "code": "SD01",
        "name": "Soda",
        "category": "SODA",
        "price": 15000,
        "cost_price": 5000,
        "unit": "ly",
        "options": [
            {"type": "size", "name": "L", "price": 20000},
            {"type": "topping", "name": "dâu", "price": 0},
            {"type": "topping", "name": "bạc hà", "price": 0},
            {"type": "topping", "name": "chanh", "price": 0},
            {"type": "topping", "name": "đào", "price": 0},
            {"type": "topping", "name": "blue", "price": 0},
        ],
    },
    # ── KEM ──
    {
        "code": "KM01",
        "name": "Kem ly",
        "category": "KEM",
        "price": 15000,
        "cost_price": 5000,
        "unit": "ly",
        "options": [],
    },
    {
        "code": "KM02",
        "name": "Kem xôi",
        "category": "KEM",
        "price": 15000,
        "cost_price": 5000,
        "unit": "phần",
        "options": [],
    },
    {
        "code": "KM03",
        "name": "Kem vị",
        "category": "KEM",
        "price": 15000,
        "cost_price": 5000,
        "unit": "phần",
        "options": [
            {"type": "topping", "name": "dâu", "price": 0},
            {"type": "topping", "name": "bạc hà", "price": 0},
            {"type": "topping", "name": "socola", "price": 0},
            {"type": "topping", "name": "việt quất", "price": 0},
        ],
    },
]


def run_seed():
    print("=" * 60)
    print("POS F&B - Database Seed Script")
    print("=" * 60)
    print(f"Connecting to: {SYNC_DSN}")

    with psycopg.connect(SYNC_DSN) as conn:
        with conn.cursor() as cur:

            # 1. DDL
            print("\n[1/4] Creating schemas and tables...")
            cur.execute(DDL)
            conn.commit()
            print("      [OK] Schemas and tables ready")

            # 2. Users
            print("\n[2/4] Seeding users...")
            for u in USERS:
                hashed = hash_password(u["plain_password"])
                cur.execute(
                    """
                    INSERT INTO public.users (id, username, password_hash, full_name, role, is_active, created_at)
                    VALUES (%s, %s, %s, %s, %s, true, now())
                    ON CONFLICT (username) DO UPDATE
                        SET password_hash = EXCLUDED.password_hash,
                            full_name     = EXCLUDED.full_name,
                            role          = EXCLUDED.role
                    RETURNING username, role
                    """,
                    (str(uuid.uuid4()), u["username"], hashed, u["full_name"], u["role"]),
                )
                row = cur.fetchone()
                print(f"      [OK] user '{row[0]}' role={row[1]}")
            conn.commit()

            # 3. Restaurant tables
            print("\n[3/4] Seeding restaurant tables...")
            cur.execute(
                "DELETE FROM ban_hang.tables WHERE name = ANY(%s)",
                ([t["name"] for t in TABLES],),
            )
            for t in TABLES:
                cur.execute(
                    """
                    INSERT INTO ban_hang.tables (id, name, area, capacity, status)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (str(uuid.uuid4()), t["name"], t["area"], t["capacity"], t["status"]),
                )
            conn.commit()
            print(
                f"      [OK] {len(TABLES)} tables seeded (Tang 1: T01-T04, Tang 2: T05-T08, Ngoai Troi: N01-N04)"
            )

            # 4. Products
            print("\n[4/4] Seeding products...")
            for p in PRODUCTS:
                options_json = json.dumps(p.get("options", []))
                cur.execute(
                    """
                    INSERT INTO ban_hang.products
                        (id, code, name, category, price, cost_price, unit, is_active, options, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, true, %s::jsonb, now())
                    ON CONFLICT (code) DO UPDATE
                        SET name       = EXCLUDED.name,
                            category   = EXCLUDED.category,
                            price      = EXCLUDED.price,
                            cost_price = EXCLUDED.cost_price,
                            options    = EXCLUDED.options
                    RETURNING code, name, category, price
                    """,
                    (
                        str(uuid.uuid4()),
                        p["code"],
                        p["name"],
                        p["category"],
                        p["price"],
                        p["cost_price"],
                        p["unit"],
                        options_json,
                    ),
                )
                row = cur.fetchone()
                print(f"      [OK] [{row[2]:12s}] {row[1]:35s}  {row[3]:>10,.0f} VND")
            conn.commit()

    print("\n" + "=" * 60)
    print("[SUCCESS] Seed completed!")
    print("=" * 60)
    print("\nCredentials:")
    for u in USERS:
        print(f"  {u['username']:12s} / {u['plain_password']:16s}  (role: {u['role']})")
    print(f"\nDatabase : {SYNC_DSN}")
    print("Tables   : 12 (Tang 1: T01-T04, Tang 2: T05-T08, Ngoai Troi: N01-N04)")
    print(
        f"Products : {len(PRODUCTS)} (SỮA CHUA:7, TRÀ CHANH:6, ĐỒ ĂN VẶT:11, CHÈ:9, TRÀ SỮA:9, SODA:1, KEM:3)"
    )


if __name__ == "__main__":
    run_seed()

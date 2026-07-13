# -*- coding: utf-8 -*-
"""Seed accounting data (ke-toan) — transactions, invoices, HKD profiles, deadlines.

Usage:
    python scripts\\seed_ke_toan.py

After running, reload http://localhost:8081/ke-toan to see real data.
"""

import io
import os
import sys
from datetime import datetime, timedelta, timezone

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import random
import uuid

import psycopg

DATABASE_URL_ENV = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/pos_db",
)
SYNC_DSN = DATABASE_URL_ENV.replace("postgresql+psycopg://", "postgresql://")

random.seed(2026)
NOW = datetime(2026, 7, 13, 12, 0, 0, tzinfo=timezone.utc)

# ─── Vietnamese realistic data ────────────────────────────────────────────────
BUYER_NAMES = [
    "Công ty TNHH ABC", "Công ty CP Minh Đức", "Hộ KD XYZ",
    "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Nam",
    "Công ty TNHH Thương Mại Sài Gòn", "DNTN Hoàng Phát",
    "Công ty CP Đầu Tư Xây Dựng Bách Khoa", "Hộ KD Ẩm Thực Hà Nội",
    "Phạm Thị Hoa", "Võ Văn Tuấn", "Đỗ Thị Hương",
    "Công ty TNHH Dịch Vụ Nhà Hàng Phố Xưa",
]

EXPENSE_CATEGORIES = [
    ("Nguyên liệu", "Mua nguyên liệu thực phẩm", 3_000_000, 15_000_000),
    ("Nguyên liệu", "Nhập hàng đồ uống", 2_000_000, 8_000_000),
    ("Nguyên liệu", "Mua rau củ quả", 500_000, 3_000_000),
    ("Điện nước", "Hóa đơn tiền điện", 1_200_000, 2_500_000),
    ("Điện nước", "Hóa đơn tiền nước", 300_000, 800_000),
    ("Điện nước", "Internet & điện thoại", 400_000, 1_000_000),
    ("Thuê mặt bằng", "Tiền thuê mặt bằng", 9_000_000, 11_000_000),
    ("Lương", "Lương nhân viên", 25_000_000, 45_000_000),
    ("Lương", "Thưởng nhân viên", 2_000_000, 5_000_000),
    ("Lương", "Bảo hiểm xã hội", 3_000_000, 5_000_000),
    ("Tiếp thị", "Chạy quảng cáo Facebook", 1_000_000, 3_000_000),
    ("Tiếp thị", "Thiết kế ấn phẩm quảng cáo", 500_000, 2_000_000),
    ("Tiếp thị", "Chi phí livestream bán hàng", 1_000_000, 2_500_000),
    ("Vật tư", "Mua bao bì, hộp đựng", 500_000, 2_000_000),
    ("Vật tư", "Mua đồ vệ sinh, hóa chất", 300_000, 1_000_000),
    ("Bảo trì", "Sửa chữa thiết bị bếp", 500_000, 3_000_000),
    ("Bảo trì", "Bảo dưỡng máy lạnh", 300_000, 1_500_000),
    ("Khác", "Phí ngân hàng & chuyển tiền", 50_000, 200_000),
    ("Khác", "Phí đăng ký kinh doanh", 200_000, 500_000),
    ("Khác", "Chi phí tiếp khách", 500_000, 2_000_000),
]

REVENUE_NOTES = [
    "Thu tiền bán hàng trong ngày",
    "Thu tiền bán hàng cuối tuần",
    "Công ty TNHH ABC thanh toán hóa đơn",
    "Khách lẻ thanh toán",
    "Tiền bán hàng online",
    "Thu tiền đặt bàn",
    "Tiền bán hàng sự kiện",
    "Doanh thu tiệc công ty",
    "Khách hàng thân thiết thanh toán",
    "Thu tiền giao hàng tận nơi",
]


def gen_tx_date(month: int, day: int) -> datetime:
    """Generate a datetime within 08:00-22:00 for the given month/day 2026."""
    hour = random.randint(8, 21)
    minute = random.randint(0, 59)
    return datetime(2026, month, day, hour, minute, tzinfo=timezone.utc)


def gen_inv_date(month: int, day: int) -> datetime:
    return datetime(2026, month, day, 9, random.randint(0, 59), tzinfo=timezone.utc)


def run_seed():
    print("=" * 60)
    print("Kế Toán — Seed Accounting Data")
    print("=" * 60)
    print(f"Connecting to: {SYNC_DSN}\n")

    conn = psycopg.connect(SYNC_DSN)
    try:
        with conn.cursor() as cur:
            # ── 1. Fetch branches ──────────────────────────────────────────
            cur.execute("SELECT id, name FROM public.branches LIMIT 5")
            branches = cur.fetchall()
            if not branches:
                print("❌ No branches found. Run seed.py first!")
                return
            print(f"✓ Found {len(branches)} branch(es)")

            # ── 2. Fetch users ─────────────────────────────────────────────
            cur.execute("SELECT id, username, role FROM public.users ORDER BY created_at LIMIT 10")
            users = cur.fetchall()
            if not users:
                print("❌ No users found. Run seed.py first!")
                return

            # Find admin/accountant for created_by
            admin_id = None
            for u in users:
                if u[2] in ("admin", "accountant"):
                    admin_id = u[0]
                    break
            if not admin_id:
                admin_id = users[0][0]

            print(f"✓ Admin/accountant user: {admin_id}")

            total_tx = 0
            total_inv = 0

            for branch_id, branch_name in branches:
                print(f"\n─── Branch: {branch_name} ({branch_id}) ───")

                # ── 3. Seed Transactions ────────────────────────────────────
                # For each month 1-7/2026, seed daily revenue + periodic expenses
                for month in range(1, 8):  # Jan → Jul 2026
                    # Days in month (simplified)
                    days_in_month = 31 if month in (1, 3, 5, 7) else (30 if month in (4, 6) else 28)

                    # Revenue trend: starts low Jan, peaks Jun, slight dip Jul
                    base_monthly_revenue = 60000000 + month * 10000000  # 70M → 130M

                    for day in range(1, days_in_month + 1, 2):  # Every 2 days
                        # Skip some days for realism
                        if random.random() < 0.15:
                            continue

                        created_at = gen_tx_date(month, day)

                        # 1-2 revenue transactions per day
                        rev_count = random.randint(1, 2)
                        for _ in range(rev_count):
                            amount = random.randint(5000000, 45000000)
                            note = random.choice(REVENUE_NOTES)
                            cur.execute(
                                """INSERT INTO ke_toan.transactions
                                (id, branch_id, type, category, amount, note, created_by, created_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                                (str(uuid.uuid4()), str(branch_id), "thu", "Bán hàng",
                                 amount, note, str(admin_id), created_at),
                            )
                            total_tx += 1

                        # 1-3 expense transactions per day
                        exp_count = random.randint(1, 3)
                        for _ in range(exp_count):
                            cat, note_prefix, min_amt, max_amt = random.choice(EXPENSE_CATEGORIES)
                            amount = random.randint(min_amt, max_amt)
                            note = f"{note_prefix}"
                            cur.execute(
                                """INSERT INTO ke_toan.transactions
                                (id, branch_id, type, category, amount, note, created_by, created_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                                (str(uuid.uuid4()), str(branch_id), "chi", cat,
                                 amount, note, str(admin_id), created_at),
                            )
                            total_tx += 1

                    # Monthly rent (1st of month)
                    rent_date = gen_tx_date(month, 1)
                    cur.execute(
                        """INSERT INTO ke_toan.transactions
                        (id, branch_id, type, category, amount, note, created_by, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                        (str(uuid.uuid4()), str(branch_id), "chi", "Thuê mặt bằng",
                         10000000, "Tiền thuê mặt bằng tháng", str(admin_id), rent_date),
                    )
                    total_tx += 1

                    # Monthly salary (25th)
                    salary_date = gen_tx_date(month, 25)
                    cur.execute(
                        """INSERT INTO ke_toan.transactions
                        (id, branch_id, type, category, amount, note, created_by, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                        (str(uuid.uuid4()), str(branch_id), "chi", "Lương",
                         35000000, "Lương nhân viên tháng", str(admin_id), salary_date),
                    )
                    total_tx += 1

                    # Electricity + Water (10th)
                    utility_date = gen_tx_date(month, 10)
                    cur.execute(
                        """INSERT INTO ke_toan.transactions
                        (id, branch_id, type, category, amount, note, created_by, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                        (str(uuid.uuid4()), str(branch_id), "chi", "Điện nước",
                         2000000, "Hóa đơn điện nước tháng", str(admin_id), utility_date),
                    )
                    total_tx += 1

                # ── 4. Seed Invoices ────────────────────────────────────────
                statuses = ["moi", "da_xuat"]
                for i in range(20):
                    month = random.randint(1, 7)
                    day = random.randint(1, 28)
                    buyer = random.choice(BUYER_NAMES)
                    amount = random.randint(500000, 15000000)
                    status = random.choices(statuses, weights=[0.4, 0.6])[0]
                    inv_num = f"HD{2026:04d}{month:02d}{day:02d}{i+1:04d}"
                    inv_date = gen_inv_date(month, day)

                    exported_at = inv_date + timedelta(days=random.randint(0, 3)) if status == "da_xuat" else None

                    cur.execute(
                        """INSERT INTO ke_toan.invoices
                        (id, branch_id, order_id, invoice_number, token, buyer_name, buyer_tax_code, total_amount, vat_rate, vat_amount, status, exported_at, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (str(uuid.uuid4()), str(branch_id),
                         str(uuid.uuid4()),  # order_id — fake
                         inv_num,
                         f"INV_{uuid.uuid4().hex[:12]}",
                         buyer,
                         f"{random.randint(100000000,999999999)}-{random.randint(1,9)}" if random.random() < 0.5 else None,
                         amount,
                         10, round(amount * 0.1, 2),
                         status,
                         exported_at,
                         inv_date),
                    )
                    total_inv += 1

                # ── 5. Seed HKDProfile ──────────────────────────────────────
                # Check if profile exists
                cur.execute("SELECT id FROM thue.hkd_profiles WHERE branch_id = %s", (str(branch_id),))
                existing = cur.fetchone()
                if not existing:
                    # Random revenue YTD based on branch size
                    revenue_ytd = random.randint(300000000, 800000000)
                    tier = "N3" if revenue_ytd > 500000000 else "N2"
                    cur.execute(
                        """INSERT INTO thue.hkd_profiles
                        (id, branch_id, tax_code, legal_name, registration_status, tax_method, revenue_ytd, fiscal_year, opened_in_first_half)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (str(uuid.uuid4()), str(branch_id),
                         f"{random.randint(100000000,999999999)}-{random.randint(1,9)}",
                         branch_name,
                         "da_dang_ky", "khau_tru",
                         revenue_ytd, 2026, True),
                    )
                    print(f"  ✓ Seeded HKDProfile")
                else:
                    print(f"  → HKDProfile already exists")

            conn.commit()
            print(f"\n{'=' * 60}")
            print(f"✅ Seed complete!")
            print(f"   • Transactions: {total_tx}")
            print(f"   • Invoices: {total_inv}")
            print(f"   • Branches: {len(branches)}")
            print(f"{'=' * 60}")
            print(f"Reload http://localhost:8081/ke-toan to see data.")

    finally:
        conn.close()


if __name__ == "__main__":
    run_seed()

"""Seed demo users for POSA on Supabase."""
import psycopg2
import uuid

DATABASE_URL = "host=aws-0-ap-northeast-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.nyormgswqejwbwbuhkiy password=Posa@2026Secure!"

# Use passlib bcrypt like backend does
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

PASSWORD_HASH = pwd_context.hash("admin123")

DEMO_USERS = [
    {"username": "admin",    "full_name": "Admin",    "role": "admin"},
    {"username": "quanly",   "full_name": "Quản Lý",  "role": "manager"},
    {"username": "cashier1", "full_name": "Thu Ngân 1", "role": "cashier"},
    {"username": "cashier2", "full_name": "Thu Ngân 2", "role": "cashier"},
    {"username": "bep",      "full_name": "Bếp",      "role": "kitchen"},
    {"username": "ketoan",   "full_name": "Kế Toán",  "role": "accountant"},
]


def main():
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
    conn.autocommit = True
    cur = conn.cursor()

    # Create users table matching model
    cur.execute("""
        CREATE TABLE IF NOT EXISTS public.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            branch_id UUID,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name VARCHAR(100),
            role VARCHAR(20),
            avatar_url TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT ck_user_role CHECK (role IN ('admin','manager','cashier','kitchen','accountant'))
        )
    """)
    print("Table users created/verified.")

    # Insert demo users
    for user in DEMO_USERS:
        try:
            cur.execute(
                """INSERT INTO public.users (username, password_hash, full_name, role, is_active)
                   VALUES (%s, %s, %s, %s, TRUE)
                   ON CONFLICT (username) DO NOTHING""",
                (user["username"], PASSWORD_HASH, user["full_name"], user["role"]),
            )
            print(f"  OK user '{user['username']}' ({user['role']})")
        except Exception as e:
            print(f"  ERR {user['username']}: {e}")

    # Verify
    cur.execute("SELECT username, role, full_name FROM public.users ORDER BY username")
    rows = cur.fetchall()
    print(f"\n✅ {len(rows)} users in database:")
    for r in rows:
        print(f"   • {r[0]} ({r[1]}) — {r[2]}")

    cur.close()
    conn.close()
    print("\n🎉 DONE! All passwords = admin123")


if __name__ == "__main__":
    main()

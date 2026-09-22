import sqlite3
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

db_path = r'D:\duanpos-ongchu\backend\ongchu_pos.db'
if not os.path.exists(db_path):
    print(f"File not found: {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = [r[0] for r in cursor.fetchall() if not r[0].startswith('sqlite_')]

print(f"=== DATABASE: {db_path} ===")
print(f"Total tables: {len(tables)}\n")

import sys

if len(sys.argv) > 1:
    table = sys.argv[1]
    cursor.execute(f"PRAGMA table_info([{table}]);")
    cols = [r[1] for r in cursor.fetchall()]
    print(f"\n--- Columns in {table}: {', '.join(cols)}")
    cursor.execute(f"SELECT * FROM [{table}] LIMIT 5;")
    rows = cursor.fetchall()
    print(f"--- First 5 rows in {table}:")
    for r in rows:
        print(" ", dict(zip(cols, r)))
else:
    for table in tables:
        cursor.execute(f"SELECT count(*) FROM [{table}];")
        count = cursor.fetchone()[0]
        print(f"  - {table:<25} : {count:>5} rows")

conn.close()

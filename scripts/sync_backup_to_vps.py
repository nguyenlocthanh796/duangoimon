import os
import json
import sqlite3
import datetime
import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

backup_path = r'c:\Users\locthanhit\Downloads\mau\ongchu_backup_quanchebuoi_2026-09-19.json'
with open(backup_path, 'r', encoding='utf-8') as f:
    backup = json.load(f)

tenant_id = backup.get('tenantId', 'tenant_quanchebuoiangiang')
branch_id = 'branch-default'
now_iso = datetime.datetime.now().isoformat()

print(f"Loaded backup for tenant: {tenant_id}")
print(f"Categories: {len(backup.get('categories', []))}")
print(f"Areas: {len(backup.get('areas', []))}")
print(f"Tables: {len(backup.get('tables', []))}")
print(f"Products: {len(backup.get('menuItems', []))}")

# 1. Prepare SQL Statements
statements = []
statements.append(f"DELETE FROM categories WHERE tenant_id = '{tenant_id}';")
statements.append(f"DELETE FROM areas WHERE tenant_id = '{tenant_id}';")
statements.append(f"DELETE FROM dining_tables WHERE tenant_id = '{tenant_id}';")
statements.append(f"DELETE FROM products WHERE tenant_id = '{tenant_id}';")

cat_name_to_id = {}
for idx, c in enumerate(backup.get('categories', [])):
    cid = c.get('id', f'cat_{idx+1}')
    cname = c.get('name', '')
    cat_name_to_id[cname.strip().lower()] = cid
    cicon = c.get('icon', 'food-outline')
    csort = c.get('displayOrder', idx + 1)
    statements.append(
        f"INSERT INTO categories (id, tenant_id, name, icon, sort_order, is_active, created_at) "
        f"VALUES ('{cid}', '{tenant_id}', '{cname}', '{cicon}', {csort}, 1, '{now_iso}');"
    )

area_name_to_id = {}
for idx, a in enumerate(backup.get('areas', [])):
    aid = a.get('id', f'area_{idx+1}')
    aname = a.get('name', '')
    area_name_to_id[aname.strip().lower()] = aid
    asort = a.get('displayOrder', idx + 1)
    statements.append(
        f"INSERT INTO areas (id, tenant_id, branch_id, name, sort_order, created_at) "
        f"VALUES ('{aid}', '{tenant_id}', '{branch_id}', '{aname}', {asort}, '{now_iso}');"
    )

for idx, t in enumerate(backup.get('tables', [])):
    tid = t.get('id', f'tbl_{idx+1}')
    tname = t.get('name', '')
    area_name = t.get('area', 'Trong Nhà')
    area_id = area_name_to_id.get(area_name.strip().lower(), 'NULL')
    area_id_sql = f"'{area_id}'" if area_id != 'NULL' else "NULL"
    cap = t.get('capacity', 4)
    statements.append(
        f"INSERT INTO dining_tables (id, tenant_id, branch_id, area_id, area_name, name, capacity, sort_order, status, created_at) "
        f"VALUES ('{tid}', '{tenant_id}', '{branch_id}', {area_id_sql}, '{area_name}', '{tname}', {cap}, {idx+1}, 'trong', '{now_iso}');"
    )

for idx, p in enumerate(backup.get('menuItems', [])):
    pid = p.get('id', f'prod_{idx+1}')
    pcode = p.get('code', '')
    pname = p.get('name', '').replace("'", "''")
    punit = p.get('unit', 'Cốc')
    pcost = p.get('costPrice', 0)
    pprice = p.get('price', 0)
    pimg = p.get('image', '')
    pstation = p.get('station', 'bar')
    pcat_name = p.get('category', '').strip().lower()
    cat_id = cat_name_to_id.get(pcat_name, 'NULL')
    cat_id_sql = f"'{cat_id}'" if cat_id != 'NULL' else "NULL"
    statements.append(
        f"INSERT INTO products (id, tenant_id, category_id, code, name, unit, cost_price, selling_price, image_url, station, is_out_of_stock, is_combo, combo_details, sort_order, is_pinned, is_active, created_at, updated_at) "
        f"VALUES ('{pid}', '{tenant_id}', {cat_id_sql}, '{pcode}', '{pname}', '{punit}', {pcost}, {pprice}, '{pimg}', '{pstation}', 0, 0, '', {idx+1}, 0, 1, '{now_iso}', '{now_iso}');"
    )

store = backup.get('storeSettings', {})
store_name = store.get('storeName', 'Quán Chè Bưởi An Giang').replace("'", "''")
store_addr = store.get('address', 'Phúc Lâm Phúc Sơn Hà Nội').replace("'", "''")
store_phone = store.get('phone', '0392387165')
slogan = store.get('slogan', "Không chỉ là chè. Đó là 'chill'.").replace("'", "''")
wifi_name = store.get('wifiName', 'Quan Che An Giang').replace("'", "''")
wifi_pass = store.get('wifiPassword', '999999999@').replace("'", "''")
bank_code = store.get('bankCode', 'MB')
bank_name = store.get('bankName', 'MBBank Quân Đội').replace("'", "''")
bank_acc_no = store.get('accountNumber', '0392387165')
bank_acc_name = store.get('accountHolder', 'NGUYEN LOC THANH').replace("'", "''")

statements.append(f"""
INSERT INTO pos_settings (id, tenant_id, branch_id, store_name, store_address, store_phone, slogan, opening_hours, wifi_name, wifi_password, bank_code, bank_name, bank_account_no, bank_account_name, transfer_syntax, qr_payment_template, receipt_title, receipt_footer, paper_size, print_copies, auto_cut, kick_drawer, created_at, updated_at)
VALUES ('cfg_{tenant_id}', '{tenant_id}', '{branch_id}', '{store_name}', '{store_addr}', '{store_phone}', '{slogan}', '07:00 - 22:30', '{wifi_name}', '{wifi_pass}', '{bank_code}', '{bank_name}', '{bank_acc_no}', '{bank_acc_name}', '[MA_DON]', 'compact2', 'HÓA ĐƠN THANH TOÁN', 'Cảm ơn Quý khách và hẹn gặp lại!', 'K80', 1, 1, 1, '{now_iso}', '{now_iso}')
ON CONFLICT(id) DO UPDATE SET
  store_name = excluded.store_name,
  store_address = excluded.store_address,
  store_phone = excluded.store_phone,
  slogan = excluded.slogan,
  wifi_name = excluded.wifi_name,
  wifi_password = excluded.wifi_password,
  bank_code = excluded.bank_code,
  bank_name = excluded.bank_name,
  bank_account_no = excluded.bank_account_no,
  bank_account_name = excluded.bank_account_name,
  updated_at = excluded.updated_at;
""")

full_sql = "BEGIN TRANSACTION;\n" + "\n".join(statements) + "\nCOMMIT;\n"

# 2. Apply to Local SQLite if exists
local_db = 'backend/ongchu_pos.db'
try:
    con = sqlite3.connect(local_db)
    cur = con.cursor()
    cur.executescript(full_sql)
    con.close()
    print(f"Applied successfully to local DB: {local_db}")
except Exception as e:
    print(f"Local DB note: {e}")

# 3. Apply to VPS SQLite via SSH
print("Connecting to VPS 116.118.3.48...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=15)

# Write sql script to temporary file on VPS
sftp = ssh.open_sftp()
with sftp.file("/tmp/restore_catalog.sql", "w") as remote_file:
    remote_file.write(full_sql)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('sqlite3 /var/www/ongchu-backend/ongchu_pos.db < /tmp/restore_catalog.sql')
out = stdout.read().decode('utf-8', errors='replace').strip()
err = stderr.read().decode('utf-8', errors='replace').strip()
if err:
    print(f"VPS SQLite Error: {err}")
else:
    print("VPS SQLite Transaction Committed Successfully!")

# 4. Verification on VPS
verify_commands = [
    f"sqlite3 /var/www/ongchu-backend/ongchu_pos.db \"SELECT count(*) as cat_count FROM categories WHERE tenant_id = '{tenant_id}';\"",
    f"sqlite3 /var/www/ongchu-backend/ongchu_pos.db \"SELECT count(*) as area_count FROM areas WHERE tenant_id = '{tenant_id}';\"",
    f"sqlite3 /var/www/ongchu-backend/ongchu_pos.db \"SELECT count(*) as table_count FROM dining_tables WHERE tenant_id = '{tenant_id}';\"",
    f"sqlite3 /var/www/ongchu-backend/ongchu_pos.db \"SELECT count(*) as prod_count FROM products WHERE tenant_id = '{tenant_id}';\"",
    f"sqlite3 /var/www/ongchu-backend/ongchu_pos.db \"SELECT store_name, store_phone FROM pos_settings WHERE tenant_id = '{tenant_id}';\"",
]

print("\n--- VPS Database Verification ---")
for cmd in verify_commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    res = stdout.read().decode('utf-8', errors='replace').strip()
    print(f"CMD: {cmd}\nRESULT: {res}\n")

ssh.close()
print("All done!")

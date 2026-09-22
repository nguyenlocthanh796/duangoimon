import os
# -*- coding: utf-8 -*-
import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=15)

commands = [
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT id, name, code, is_active FROM tenants;"',
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT id, tenant_id, username, full_name, pin_code, role FROM users;"',
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT tenant_id, count(*) FROM products GROUP BY tenant_id;"',
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT tenant_id, count(*) FROM dining_tables GROUP BY tenant_id;"',
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT tenant_id, count(*) FROM categories GROUP BY tenant_id;"',
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT tenant_id, count(*) FROM toppings GROUP BY tenant_id;"',
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT count(*) FROM orders;"',
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT count(*) FROM cash_transactions;"',
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT id, tenant_id, type, amount, description FROM cash_transactions;"',
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT count(*) FROM cash_shifts;"',
]

for cmd in commands:
    print(f"=== CMD: {cmd} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        print(out)
    if err:
        print("ERR:", err)

ssh.close()

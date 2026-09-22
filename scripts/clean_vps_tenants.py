import os
# -*- coding: utf-8 -*-
import paramiko

HOST = os.getenv("VPS_HOST", "116.118.3.48")
PORT = 22
USER = "root"
PASS = os.getenv("VPS_PASSWORD", "")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, PORT, USER, PASS, timeout=15)

# 1. Tìm các file db sqlite trên VPS
stdin, stdout, stderr = ssh.exec_command("find /var/www/ongchu-backend -name '*.db*'")
print("DB files on VPS:")
print(stdout.read().decode('utf-8'))

# 2. Xóa tenant_quanquan hoặc các tenant ảo khỏi mọi DB SQLite trên VPS
clean_sql = """
sqlite3 /var/www/ongchu-backend/ongchu_pos.db "DELETE FROM tenants WHERE id NOT IN ('saas_master');" || true
sqlite3 /var/www/ongchu-backend/data/ongchu_master.db "DELETE FROM tenants WHERE id NOT IN ('saas_master');" || true
echo "=== ongchu_pos.db tenants ==="
sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT id, name, subdomain FROM tenants;" || true
echo "=== ongchu_master.db tenants ==="
sqlite3 /var/www/ongchu-backend/data/ongchu_master.db "SELECT id, name, subdomain FROM tenants;" || true
"""
stdin, stdout, stderr = ssh.exec_command(clean_sql)
print("Result of tenant table:")
print(stdout.read().decode('utf-8'))

# 3. Xóa các database tenant riêng lẻ nếu có
ssh.exec_command("rm -rf /var/www/ongchu-backend/tenants/tenant_quanquan* /var/www/ongchu-backend/data/tenant_quanquan*")

ssh.close()
print("Cleaned up VPS databases successfully.")

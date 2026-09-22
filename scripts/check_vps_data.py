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

# Kiểm tra các bảng tenants và users trong ongchu_pos.db
check_sql = """
echo "=== TENANTS ==="
sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT id, name, subdomain, phone, subscription_plan FROM tenants;"
echo "=== USERS ==="
sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT id, tenant_id, username, password_hash, pin_code, role FROM users;"
"""
stdin, stdout, stderr = ssh.exec_command(check_sql)
import sys
sys.stdout.buffer.write(stdout.read())
ssh.close()

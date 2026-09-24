import os
import sys
import paramiko

HOST = os.getenv("VPS_HOST", "116.118.3.48")
PORT = int(os.getenv("VPS_PORT", "22"))
USER = os.getenv("VPS_USER", "root")
PASS = os.getenv("VPS_PASSWORD")

if not PASS:
    sys.exit("ABORT: Biến môi trường VPS_PASSWORD chưa được thiết lập!")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore').strip()
    err = stderr.read().decode('utf-8', errors='ignore').strip()
    print(out)
    if err:
        print('ERR:', err)

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print('=== PRODUCTS BY TENANT ===')
run('sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT id, name, tenant_id FROM products;"')

print('=== TABLES BY TENANT ===')
run('sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT id, name, tenant_id FROM dining_tables;"')

ssh.close()

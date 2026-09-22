import os
import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=15)

tables = ["categories", "products", "dining_tables", "areas", "pos_settings"]
for t in tables:
    stdin, stdout, stderr = ssh.exec_command(f'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "PRAGMA table_info({t});"')
    print(f"=== {t} ===")
    print(stdout.read().decode('utf-8', errors='replace').strip())

ssh.close()

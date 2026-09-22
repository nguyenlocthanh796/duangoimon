import os
import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=15)

commands = [
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT id, name, tenant_id FROM categories;"',
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT id, name, tenant_id FROM areas;"',
    'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "SELECT id, name, area_name, tenant_id FROM dining_tables;"',
]

for cmd in commands:
    print(f"=== {cmd} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode('utf-8', errors='replace').strip())

ssh.close()

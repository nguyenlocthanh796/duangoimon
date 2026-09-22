import os
import paramiko
import sqlite3

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=15)

cleanup_sql = """
DELETE FROM pos_settings WHERE tenant_id = 'tenant_quanchebuoiangiang' AND id != 'cfg_tenant_quanchebuoiangiang';
SELECT id, tenant_id, store_name, store_phone FROM pos_settings WHERE tenant_id = 'tenant_quanchebuoiangiang';
"""

stdin, stdout, stderr = ssh.exec_command(f'sqlite3 /var/www/ongchu-backend/ongchu_pos.db "{cleanup_sql}"')
print("VPS Settings Result:")
print(stdout.read().decode('utf-8', errors='replace').strip())
ssh.close()

try:
    con = sqlite3.connect('backend/ongchu_pos.db')
    cur = con.cursor()
    cur.executescript(cleanup_sql)
    con.close()
    print("Local settings cleaned up.")
except Exception as e:
    print(f"Local settings note: {e}")

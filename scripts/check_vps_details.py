import os
import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=10)

def run(cmd):
    print(f"\n=== {cmd} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out: print(out)
    if err: print("ERR:", err)

run("sqlite3 /var/www/ongchu-backend/ongchu_pos.db 'SELECT tenant_id, code, name FROM products LIMIT 10;'")
run("sqlite3 /var/www/ongchu-backend/ongchu_pos.db 'SELECT tenant_id, name, area_id FROM dining_tables LIMIT 10;'")
ssh.close()

import os
import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=15)

backup_path = r'c:\Users\locthanhit\Downloads\mau\ongchu_backup_quanchebuoi_2026-09-19.json'
with open(backup_path, 'r', encoding='utf-8') as f:
    backup = json.load(f)

sftp = ssh.open_sftp()
with sftp.file("/tmp/backup_quanchebuoi.json", "w") as f:
    f.write(json.dumps(backup))
sftp.close()

cmd = "curl -s -X POST -H 'Content-Type: application/json' -H 'X-Tenant-ID: tenant_quanchebuoiangiang' -d @/tmp/backup_quanchebuoi.json http://localhost:8080/api/v1/backup/restore"
stdin, stdout, stderr = ssh.exec_command(cmd)
print("Restore endpoint response:", stdout.read().decode('utf-8', errors='replace').strip())

ssh.close()

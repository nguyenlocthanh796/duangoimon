import os
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""))

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    return out

print("=== NGINX CONFIGS ===")
print(run("cat /etc/nginx/sites-enabled/*"))

print("=== BACKEND SERVICE STATUS ===")
print(run("systemctl status ongchu-backend --no-pager"))

client.close()

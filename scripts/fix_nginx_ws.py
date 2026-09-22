import os
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""))

def run(cmd):
    print(f">>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out: print(out)
    if err: print("STDERR:", err)

# Liệt kê và xóa các file cũ trong sites-enabled
run("ls -la /etc/nginx/sites-enabled/")
run("rm -f /etc/nginx/sites-enabled/*")
run("ln -s /etc/nginx/sites-available/ongchu-app /etc/nginx/sites-enabled/ongchu-app")
run("nginx -t")
run("systemctl restart nginx")
run("systemctl status nginx --no-pager")

client.close()

import os
import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=15)

endpoints = [
    "/api/v1/categories",
    "/api/v1/products",
    "/api/v1/tables",
    "/api/v1/areas",
    "/api/v1/settings"
]

for ep in endpoints:
    cmd = f"curl -s -H 'X-Tenant-ID: tenant_quanchebuoiangiang' http://localhost:8080{ep}"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    raw = stdout.read().decode('utf-8', errors='replace').strip()
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            print(f"Endpoint {ep}: List with {len(data)} items")
            if len(data) > 0:
                print(f"  First: {data[0].get('id')} - {data[0].get('name')}")
                print(f"  Last:  {data[-1].get('id')} - {data[-1].get('name')}")
        elif isinstance(data, dict):
            inner = data.get('data')
            if isinstance(inner, list):
                print(f"Endpoint {ep}: Dict with {len(inner)} items")
                if len(inner) > 0:
                    print(f"  First: {inner[0].get('id')} - {inner[0].get('name')}")
            elif isinstance(inner, dict):
                print(f"Endpoint {ep}: Settings store_name: {inner.get('store_name')}")
            else:
                print(f"Endpoint {ep}: {data}")
    except Exception as e:
        print(f"Endpoint {ep} parse error: {e} | Raw: {raw[:100]}")

ssh.close()

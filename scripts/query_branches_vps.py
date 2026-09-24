import os, paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv('VPS_HOST', '116.118.3.48'), 22, 'root', os.getenv('VPS_PASSWORD', ''))

print("=== BRANCHES IN POSTGRES ===")
_, out, _ = ssh.exec_command("docker exec -i ongchu-postgres psql -U ongchu -d ongchu_db -c 'SELECT id, tenant_id, name, code, is_active FROM branches;'")
print(out.read().decode('utf-8'))

print("=== TENANTS IN POSTGRES ===")
_, out, _ = ssh.exec_command("docker exec -i ongchu-postgres psql -U ongchu -d ongchu_db -c 'SELECT id, name, code, phone FROM tenants;'")
print(out.read().decode('utf-8'))

ssh.close()

# -*- coding: utf-8 -*-
import sys
import paramiko
import bcrypt

raw_pass = b"Danh@!26062002"
new_hash = bcrypt.hashpw(raw_pass, bcrypt.gensalt(12)).decode('utf-8')
print("Generated Bcrypt Hash:", new_hash)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('116.118.3.48', port=22, username='root', password='Danh26062002')

# Use parameter escaping or bash script
cmd = """sqlite3 /var/www/ongchu-backend/ongchu_pos.db "UPDATE users SET password_hash = '"'""" + new_hash + """'"' WHERE tenant_id = 'tenant_87fb90f7';" """
stdin, stdout, stderr = ssh.exec_command(cmd)
print("Update output:", stdout.read().decode('utf-8'), stderr.read().decode('utf-8'))

_, out_check, _ = ssh.exec_command("sqlite3 /var/www/ongchu-backend/ongchu_pos.db \"SELECT id, username, password_hash FROM users WHERE tenant_id='tenant_87fb90f7';\"")
print("Verified user row:", out_check.read().decode('utf-8'))

ssh.close()

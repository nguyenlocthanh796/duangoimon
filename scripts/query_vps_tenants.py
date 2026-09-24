# -*- coding: utf-8 -*-
import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('116.118.3.48', port=22, username='root', password='Danh26062002')

_, out1, _ = ssh.exec_command("sqlite3 /var/www/ongchu-backend/ongchu_pos.db 'SELECT id, username, password_hash FROM users WHERE tenant_id=\"tenant_87fb90f7\";'")
print("=== USER HASH ===")
print(out1.read().decode('utf-8', errors='replace'))

ssh.close()

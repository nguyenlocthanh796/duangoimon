import os
import sys
import paramiko
import json
import time

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""))

_, stdout, stderr = ssh.exec_command('ps -eo pid,user,comm,args | grep -E "uvicorn|postgres|ongchu" | grep -v grep')
print("Running processes:\n", stdout.read().decode('utf-8'))

ssh.close()


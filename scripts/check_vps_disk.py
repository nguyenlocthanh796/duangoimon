import os
﻿import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=10)

def run(cmd):
    print(f"\n=== {cmd} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode("utf-8", errors="replace"))

run("lsblk")
run("du -h --max-depth=1 / 2>/dev/null | sort -hr")
run("du -h --max-depth=1 /var 2>/dev/null | sort -hr")
run("du -h --max-depth=1 /var/log 2>/dev/null | sort -hr")
run("journalctl --disk-usage")
run("docker system df 2>/dev/null || true")
ssh.close()

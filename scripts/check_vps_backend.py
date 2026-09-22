import os
import sys, io, time, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=15)
sftp = ssh.open_sftp()

def run(title, cmd):
    print(f"\n==================== {title} ====================")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out: print(out)
    if err: print("STDERR:", err)

# 1. Upload fixed files
sftp.put(r"d:\duanpos-ongchu\backend\cmd\server\main.go", "/var/www/ongchu-backend-src/cmd/server/main.go")
sftp.put(r"d:\duanpos-ongchu\backend\internal\handler\auth.go", "/var/www/ongchu-backend-src/internal/handler/auth.go")
sftp.put(r"d:\duanpos-ongchu\backend\internal\handler\sync.go", "/var/www/ongchu-backend-src/internal/handler/sync.go")
sftp.put(r"d:\duanpos-ongchu\backend\internal\websocket\hub.go", "/var/www/ongchu-backend-src/internal/websocket/hub.go")
print("Uploaded main.go, auth.go, sync.go, hub.go")

# 2. Recompile on VPS
run("2. BIÊN DỊCH GO BINARY", "cd /var/www/ongchu-backend-src && /usr/local/go/bin/go build -p 1 -ldflags='-s -w' -o /var/www/ongchu-backend/ongchu-server cmd/server/main.go && chmod +x /var/www/ongchu-backend/ongchu-server")

# 3. Restart
run("3. KHỞI ĐỘNG LẠI SERVICE", "systemctl restart ongchu-backend && systemctl restart nginx")
time.sleep(2)

# 4. Check status & logs
run("4. TRẠNG THÁI & HEALTH CHECK", "systemctl is-active ongchu-backend; systemctl is-active nginx; curl -s http://localhost:8080/health")
run("5. LOGS SYSTEMD MỚI NHẤT", "journalctl -u ongchu-backend -n 8 --no-pager")
run("6. GO BINARY & TIÊU THỤ RAM", "ls -lh /var/www/ongchu-backend/ongchu-server; ps aux | grep ongchu-server | grep -v grep")
run("7. TÀI NGUYÊN HỆ THỐNG", "free -h; df -h /; uptime")

sftp.close()
ssh.close()










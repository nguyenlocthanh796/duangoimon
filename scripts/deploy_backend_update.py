# -*- coding: utf-8 -*-
import os
import sys
import time
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

HOST = os.getenv("VPS_HOST", "116.118.3.48")
PORT = 22
USER = "root"
PASS = os.getenv("VPS_PASSWORD", "")

LOCAL_BACKEND = r"d:\duanpos-ongchu\backend"
REMOTE_SRC = "/var/www/ongchu-backend-src"
REMOTE_BIN = "/var/www/ongchu-backend"

BLOCKED_EXTS = ('.db', '.sqlite', '.sqlite3', '.db-wal', '.db-shm', '.db-journal', '.sql', '.bak', '.exe')
BLOCKED_DIRS = {'data', 'tenants', 'bin', '.git', 'tests'}

def assert_safe_path(local_path, rel_path):
    parts = rel_path.replace("\\", "/").split("/")
    for p in parts:
        if p in BLOCKED_DIRS:
            raise RuntimeError(f"🚨 CRITICAL SECURITY GUARD: Blocked directory upload attempted: '{rel_path}'")
    lower = os.path.basename(local_path).lower()
    for ext in BLOCKED_EXTS:
        if lower.endswith(ext):
            raise RuntimeError(f"🚨 CRITICAL SECURITY GUARD: Blocked database/binary file upload attempted: '{local_path}'")

def upload_backend_sources(ssh, sftp, local_dir, remote_dir):
    print("1. Đồng bộ mã nguồn Go Backend (LOẠI BỎ 100% CSDL & DATA LOCAL)...")
    uploaded_count = 0
    for root, dirs, files in os.walk(local_dir):
        # Filter directories
        dirs[:] = [d for d in dirs if d not in BLOCKED_DIRS and not d.startswith('.')]
        rel_path = os.path.relpath(root, local_dir).replace("\\", "/")
        target_remote = remote_dir if rel_path == "." else f"{remote_dir}/{rel_path}"

        _, out, _ = ssh.exec_command(f'mkdir -p "{target_remote}"')
        out.channel.recv_exit_status()

        for f in files:
            # 1. Skip all non-source and database files immediately
            lower = f.lower()
            if any(lower.endswith(ext) for ext in BLOCKED_EXTS):
                continue
            if not (f.endswith('.go') or f in ('go.mod', 'go.sum')):
                continue

            local_file = os.path.join(root, f)
            rel_file = f if rel_path == "." else f"{rel_path}/{f}"

            # 2. Hard security guard assertion
            assert_safe_path(local_file, rel_file)

            remote_file = f"{target_remote}/{f}"
            sftp.put(local_file, remote_file)
            uploaded_count += 1
            print(f"  [+] Synced: {rel_file}")

    print(f"   ✓ Đã đồng bộ an toàn {uploaded_count} file Go sources.")

def main():
    print("=" * 60)
    print("🚀 ONGCHU LEAN POS - AN TOÀN DEPLOY BACKEND LÊN VPS")
    print("🔒 QUY TẮC BẤT BIẾN: ZERO-DB DEPLOYMENT (BẢO TOÀN DỮ LIỆU VPS)")
    print("=" * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, PORT, USER, PASS, timeout=15)
    sftp = ssh.open_sftp()

    def run_cmd(title, cmd, must_succeed=True):
        print(f"\n--- {title} ---")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_code = stdout.channel.recv_exit_status()
        out = stdout.read().decode("utf-8", errors="replace").strip()
        err = stderr.read().decode("utf-8", errors="replace").strip()
        if out: print(out)
        if err: print("STDERR:", err)
        if must_succeed and exit_code != 0:
            raise RuntimeError(f"Command failed with exit code {exit_code}: {cmd}")

    # 1. Sync Go sources safely
    upload_backend_sources(ssh, sftp, LOCAL_BACKEND, REMOTE_SRC)

    # 1.5 Update Nginx config if needed
    nginx_conf = """upstream go_backend {
    server 127.0.0.1:8080;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name ongchu.cloud www.ongchu.cloud app.ongchu.cloud;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ongchu.cloud www.ongchu.cloud;

    ssl_certificate /etc/letsencrypt/live/ongchu.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ongchu.cloud/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL_LANDING:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets on;

    root /var/www/ongchu-landing;
    index index.html;

    charset utf-8;
    charset_types text/plain text/css text/xml application/json application/javascript application/xml+rss;

    # Public e-Receipt & Tra Cuu Bill Portal -> Go Backend
    location ~ ^/(b|bill|tra-cuu|check-bill|api)(/|$) {
        proxy_pass http://go_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering on;
    }

    location / {
        try_files $uri $uri/ $uri.html /index.html;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.ongchu.cloud;

    ssl_certificate /etc/letsencrypt/live/ongchu.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ongchu.cloud/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL_APP:20m;
    ssl_session_timeout 1d;
    ssl_session_tickets on;

    root /var/www/ongchu-app;
    gzip_static on;
    index index.html;

    tcp_nodelay on;
    charset utf-8;
    charset_types text/plain text/css text/xml application/json application/javascript application/xml+rss;

    location /health {
        proxy_pass http://go_backend/health;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://go_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Public e-Receipt & Tra Cuu Bill Portal routes on app.ongchu.cloud too
    location ~ ^/(b|bill|tra-cuu|check-bill)(/|$) {
        proxy_pass http://go_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8080/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Strict No-Cache for HTML/SPA fallback
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
        expires -1;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" always;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|svg|ttf|otf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
"""
    with sftp.file('/etc/nginx/sites-available/ongchu', 'w') as f:
        f.write(nginx_conf)
    run_cmd("1.6 CẬP NHẬT VÀ RELOAD NGINX", "nginx -t && systemctl reload nginx")

    # 2. Recompile Go binary on VPS
    run_cmd("2. BIÊN DỊCH GO BINARY TRÊN VPS", f"cd {REMOTE_SRC} && /usr/local/go/bin/go build -p 1 -ldflags='-s -w' -o {REMOTE_BIN}/ongchu-server cmd/server/main.go && chmod +x {REMOTE_BIN}/ongchu-server")

    # 3. Restart backend service
    run_cmd("3. KHỞI ĐỘNG LẠI BACKEND SERVICE (GORM AUTOMIGRATE KÍCH HOẠT)", "systemctl restart ongchu-backend")
    time.sleep(2)

    # 4. Check status & health & public bill endpoints
    run_cmd("4. HEALTH CHECK MÁY CHỦ & PUBLIC BILL", "systemctl is-active ongchu-backend && curl -s http://localhost:8080/health && echo '' && curl -s -o /dev/null -w 'Status /tra-cuu: %{http_code}\\n' http://localhost:8080/tra-cuu && curl -s -o /dev/null -w 'Status /b/HD-9999: %{http_code}\\n' http://localhost:8080/b/HD-9999")

    sftp.close()
    ssh.close()
    print("\n" + "=" * 60)
    print("🎉 DEPLOY BACKEND HOÀN TẤT THÀNH CÔNG VỚI BẢO VỆ DỮ LIỆU 100%!")
    print("=" * 60)

if __name__ == "__main__":
    main()


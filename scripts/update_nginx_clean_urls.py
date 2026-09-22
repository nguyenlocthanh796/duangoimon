import os
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(os.getenv("VPS_HOST", "116.118.3.48"), int(os.getenv("VPS_PORT", "22")), os.getenv("VPS_USER", "root"), os.getenv("VPS_PASSWORD", ""), timeout=10)

nginx_conf = """server {
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

    root /var/www/ongchu-landing;
    index index.html;

    charset utf-8;
    charset_types text/plain text/css text/xml application/json application/javascript application/xml+rss;

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

    root /var/www/ongchu-app;
    gzip_static on;
    index index.html;

    charset utf-8;
    charset_types text/plain text/css text/xml application/json application/javascript application/xml+rss;

    location /health {
        proxy_pass http://127.0.0.1:8080/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
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

sftp = ssh.open_sftp()
with sftp.file('/etc/nginx/sites-available/ongchu', 'w') as f:
    f.write(nginx_conf)
sftp.close()

stdin, stdout, stderr = ssh.exec_command('nginx -t && systemctl reload nginx')
print('NGINX RELOAD:', stdout.read().decode(), stderr.read().decode())
ssh.close()

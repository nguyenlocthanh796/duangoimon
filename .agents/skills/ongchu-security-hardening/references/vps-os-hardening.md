# 🏰 VÀNH ĐAI 3: ĐÓNG BĂNG HẠ TẦNG VPS & CƠ SỞ DỮ LIỆU (OS & NETWORK HARDENING)

Runbook chuẩn hóa bảo mật máy chủ VPS Linux (Ubuntu 22.04/24.04 LTS / Debian 12), đảm bảo triệt tiêu các vector tấn công dò quét cổng, Brute-Force SSH, khai thác lỗ hổng mạng và xâm nhập CSDL.

---

## 🔑 1. KHÓA CHẶT CỬA NGÕ SSH (BASTION SSH CONFIG)

Chỉnh sửa file cấu hình `/etc/ssh/sshd_config`:

```ini
# 1. Đổi cổng mặc định 22 sang dải cổng cao
Port 2222

# 2. Vô hiệu hóa hoàn toàn đăng nhập bằng Mật Khẩu (Password)
PasswordAuthentication no
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no

# 3. Cấm tài khoản root đăng nhập trực tiếp qua SSH
PermitRootLogin no

# 4. Chỉ chấp nhận thuật toán khóa mã hóa an toàn Ed25519
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys

# 5. Giới hạn số lần thử và thời gian chờ
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
```

Khởi động lại dịch vụ SSH:
```bash
sudo sshd -t && sudo systemctl restart ssh
```

---

## 🧱 2. TƯỜNG LỬA UFW: CHIẾN LƯỢC DROP-ALL MẶC ĐỊNH

Áp dụng nguyên tắc **Zero-Trust**: Chặn toàn bộ kết nối đến (Inbound), chỉ mở các cổng dịch vụ công khai tối thiểu.

```bash
# 1. Reset và thiết lập chính sách mặc định
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 2. Cho phép cổng SSH tùy chỉnh
sudo ufw allow 2222/tcp comment 'Custom SSH'

# 3. Cho phép Web Traffic (HTTPS & HTTP Redirect)
sudo ufw allow 80/tcp comment 'HTTP Web'
sudo ufw allow 443/tcp comment 'HTTPS Web & API'

# 4. Kích hoạt tường lửa
sudo ufw enable
sudo ufw status verbose
```

---

## 🐘 3. CÁCH LY CƠ SỞ DỮ LIỆU POSTGRESQL & REDIS (DOCKER NETWORK)

Tuyệt đối **KHÔNG BAO GIỜ** ánh xạ (expose) cổng PostgreSQL `5432` hoặc Redis `6379` ra ngoài Internet public `0.0.0.0:5432`.

### 3.1. Cấu hình `docker-compose.prod.yml` Cô Lập
```yaml
version: '3.8'

networks:
  pos_internal:
    driver: bridge
    internal: true # Mạng nội bộ hoàn toàn, cấm truy cập từ ngoài vào
  pos_public:
    driver: bridge

services:
  postgres:
    image: postgres:16-alpine
    container_name: pos_postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - pos_internal # Chỉ giao tiếp với backend trong mạng nội bộ
    # CẤM KHAI BÁO ports: - "5432:5432"

  redis:
    image: redis:7-alpine
    container_name: pos_redis
    restart: always
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]
    volumes:
      - redisdata:/data
    networks:
      - pos_internal
    # CẤM KHAI BÁO ports: - "6379:6379"

  backend:
    image: pos-backend:latest
    container_name: pos_backend
    restart: always
    depends_on:
      - postgres
      - redis
    networks:
      - pos_internal
      - pos_public
    ports:
      - "127.0.0.1:8080:8080" # Chỉ bind localhost cho Nginx/Caddy proxy

volumes:
  pgdata:
  redisdata:
```

---

## 🚫 4. CHỐNG BRUTE-FORCE VỚI FAIL2BAN

Cài đặt `fail2ban` để tự động phát hiện và khóa IP tấn công vào SSH hoặc Nginx:

```bash
sudo apt update && sudo apt install fail2ban -y
```

Tạo file `/etc/fail2ban/jail.local`:
```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 3
banaction = ufw

[sshd]
enabled = true
port = 2222
logpath = %(sshd_log)s
maxretry = 3
bantime = 24h

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
```

Khởi chạy và kích hoạt:
```bash
sudo systemctl enable fail2ban && sudo systemctl restart fail2ban
```

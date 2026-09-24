# 14 — DOCKER & CONTAINER SECURITY

## 1. Docker Compose Analysis

- **File**: `docker-compose.yml`.
- **Services Defined**:
  1. `db` (PostgreSQL 16 Alpine):
     - Image: `postgres:16-alpine`.
     - Environment: `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=postgres`, `POSTGRES_DB=ongchu_pos`.
     - Ports: `"5432:5432"` (Đang bind vào `0.0.0.0:5432` trên máy chủ).
     - Volumes: `pgdata:/var/lib/postgresql/data`.
     - Restart policy: `always`.
  2. `redis` (Redis 7 Alpine):
     - Image: `redis:7-alpine`.
     - Ports: `"6379:6379"` (Đang bind vào `0.0.0.0:6379` trên máy chủ).
     - Command: `redis-server --appendonly yes` (Không có mật khẩu `requirepass`).
     - Volumes: `redisdata:/data`.
     - Restart policy: `always`.

---

## 2. Container Security Assessment & Misconfigurations

| Điểm Kiểm Tra | Trạng Thái Hiện Tại | Đánh Giá Rủi Ro | Khuyến Nghị Hardening |
|---|---|---|---|
| **Port Binding** | `5432:5432`, `6379:6379` | **CRITICAL** (Mở trực tiếp CSDL ra Internet) | Đổi thành `127.0.0.1:5432:5432` hoặc bỏ hoàn toàn port binding và dùng internal docker network |
| **Default Database Password** | `postgres / postgres` | **CRITICAL** (Mật khẩu mặc định dễ đoán) | Đổi mật khẩu phức tạp qua `.env.production` |
| **Redis Authentication** | Không có mật khẩu (`requirepass` trống) | **CRITICAL** (Truy cập Redis không cần mật khẩu) | Bật `requirepass` hoặc bỏ publish port |
| **Root User trong Container** | Chạy mặc định | **MEDIUM** | Thêm directive `user: "1000:1000"` nếu cần |
| **Resource Limits** | Không giới hạn CPU / RAM | **MEDIUM** (Nguy cơ DoS kiệt tài nguyên host) | Cấu hình `deploy.resources.limits` |
| **Read-Only Root Filesystem** | False | **LOW** | Chuyển sang read-only root với tmpfs |

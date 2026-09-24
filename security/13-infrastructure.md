# 13 — INFRASTRUCTURE & NETWORK SECURITY

## 1. Nginx Reverse Proxy Configuration

- **Config File**: `nginx_ongchu.conf` & `nginx_conf.txt`.
- **Domain Mappings**:
  - `ongchu.cloud`, `www.ongchu.cloud`: Landing page & Tra cứu hóa đơn (`/b/`, `/bill/`).
  - `app.ongchu.cloud`: SPA POS Dashboard & REST API backend.
- **SSL / TLS Termination**:
  - Chứng chỉ: Let's Encrypt (`/etc/letsencrypt/live/ongchu.cloud/fullchain.pem`).
  - Protocols: TLSv1.2, TLSv1.3.
  - Ciphers: `HIGH:!aNULL:!MD5`.
  - HTTP Strict Transport Security (HSTS): `max-age=31536000; includeSubDomains`.
- **Proxy Passes**:
  - `/api/` -> `http://127.0.0.1:8080` (hoặc container upstream `go_backend:8080`).
  - `/ws/` -> `http://127.0.0.1:8080` với WebSocket Upgrade headers (`Upgrade $http_upgrade`, `Connection "Upgrade"`).
  - `/health` -> `http://127.0.0.1:8080/health`.
  - `/downloads/` -> `/var/www/ongchu-downloads` (chứa file APK/EXE cài đặt).

---

## 2. Server OS, Firewall & Port Exposure

- **OS Target**: Ubuntu Linux 22.04 LTS trên VPS Cloud.
- **Tường Lửa UFW**:
  - Cổng mở công khai bắt buộc: `80/tcp` (HTTP), `443/tcp` (HTTPS), `SSH port`.
  - Cổng nội bộ cần chặn triệt để ra ngoài: `5432` (PostgreSQL), `6379` (Redis), `8080` (Go Backend direct).
- **Quy Tắc Đóng Băng VPS**:
  - Tuân thủ quy chuẩn Zero-Source Deployment trong `.agents/rules/security-hardening.md`: Không lưu trữ mã nguồn `.go`, `.ts`, `.git` trên VPS Production. Chỉ chạy Stripped Binary Go và Static Dist Web.
  - CẤM upload ghi đè database `.db` từ máy cá nhân lên VPS.

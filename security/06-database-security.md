# 06 — DATABASE SECURITY & ORM AUDIT

## 1. Database Connections & Drivers

- **PostgreSQL**:
  - Driver: `gorm.io/driver/postgres` (`jackc/pgx/v5`).
  - DSN format: `host=... port=... user=... password=... dbname=... sslmode=prefer`.
  - Mặc định `sslmode=prefer` (chưa ép `sslmode=require` hoặc `verify-full`).
- **SQLite Fallback**:
  - Driver: `github.com/glebarez/sqlite` (Pure Go, không CGO).
  - PRAGMAs:
    - `PRAGMA journal_mode = WAL;` (Write-Ahead Logging).
    - `PRAGMA busy_timeout = 5000;` (Chống locked database).
    - `PRAGMA synchronous = NORMAL;`.
    - `PRAGMA foreign_keys = ON;`.
- **Dual-Engine Auto-Fallback**:
  - `backend/internal/database/database.go:37-88`: Nếu kết nối PostgreSQL thất bại, backend tự động chuyển sang SQLite file cục bộ `ongchu_pos.db` mà không làm crash ứng dụng.

---

## 2. GORM Injection & Query Security Audit

- **GORM Parameterized Queries**:
  - 100% các câu lệnh SELECT/UPDATE/DELETE trong handler dùng query tham số hóa (`Where("tenant_id = ?", tenantID)`).
  - Không tìm thấy câu lệnh SQL ghép chuỗi thô (`fmt.Sprintf`) trong các mệnh đề `Where` hoặc `Raw` của handler chính.
- **Auto-Migrate Security**:
  - `database.go:89-117`: AutoMigrate thực thi tự động trên 28 models khi server khởi động.
  - Cột `tenant_id` được đánh index trên tất cả các bảng.
  - Bảng `saas_license_keys`, `saas_plan_configs` nằm chung trong CSDL với dữ liệu tenant.

---

## 3. Database Permissions, Docker & State Invariants

- **Docker Compose Port Binding**:
  - `docker-compose.yml:8`: `ports: - "5432:5432"`.
  - Mặc định bind vào `0.0.0.0:5432` trên host. Nếu VPS không có tường lửa UFW, cổng PostgreSQL mở công khai ra Internet.
- **Rule Bất Biến**: CẤM upload/deploy file CSDL (`*.db`, `*.sqlite`, `data/`) từ máy dev local lên VPS. CSDL trên VPS là dữ liệu thật (stateful).

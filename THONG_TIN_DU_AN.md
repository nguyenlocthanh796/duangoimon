# 📋 POS QUÁN ĂN — Tổng hợp thông tin dự án

> **Dự án:** Hệ thống quản lý nhà hàng POS F&B  
> **Repo:** [github.com/nguyenlocthanh796/duangoimon](https://github.com/nguyenlocthanh796/duangoimon)

---

## 🌐 URL TRUY CẬP

| Thành phần | URL |
|------------|-----|
| **Frontend (Cloudflare Pages)** | [https://pos-quanan-frontend.pages.dev](https://pos-quanan-frontend.pages.dev) |
| **POS Bán hàng** | [https://pos-quanan-frontend.pages.dev/ban-hang](https://pos-quanan-frontend.pages.dev/ban-hang) |
| **Đăng nhập** | [https://pos-quanan-frontend.pages.dev/login](https://pos-quanan-frontend.pages.dev/login) |
| **Backend API** | [https://pos-quanan-backend.onrender.com/api/v1](https://pos-quanan-backend.onrender.com/api/v1) |
| **Backend Swagger Docs** | [https://pos-quanan-backend.onrender.com/docs](https://pos-quanan-backend.onrender.com/docs) |
| **Health Check** | [https://pos-quanan-backend.onrender.com/healthz](https://pos-quanan-backend.onrender.com/healthz) |

---

## 🔐 TÀI KHOẢN

### POS App
- **Username:** `admin`
- **Mật khẩu:** `admin123`

### Render Dashboard
- **URL:** [https://dashboard.render.com](https://dashboard.render.com)
- **Backend Service:** [https://dashboard.render.com/web/srv-d9h0ltv41pts73dkug50](https://dashboard.render.com/web/srv-d9h0ltv41pts73dkug50)
- **Logs:** [https://dashboard.render.com/web/srv-d9h0ltv41pts73dkug50/logs](https://dashboard.render.com/web/srv-d9h0ltv41pts73dkug50/logs)
- **API Key:** `rnd_atRNWTFDlsW9aZpHZW1oFhFpSSdY`

### UptimeRobot (Giữ Backend không ngủ)
- **Dashboard:** [https://dashboard.uptimerobot.com/monitors](https://dashboard.uptimerobot.com/monitors)

---

## 🗄️ DATABASE

| Thông tin | Giá trị |
|-----------|---------|
| **Loại** | PostgreSQL 16 |
| **Host** | `dpg-d9h0n1j7uimc739854p0-a.oregon-postgres.render.com` |
| **Database** | `pos_quanan_db` |
| **User** | `pos_quanan_db_user` |
| **Password** | `fCIYBhOPAcI5g8PHzygbVsELpBNQjxb8` |
| **Port** | `5432` |

---

## 📁 MÃ NGUỒN (Local)
- **Đường dẫn:** `e:\posgit\`
- **Backend:** `e:\posgit\backend\` (Python FastAPI)
- **Frontend:** `e:\posgit\frontend\` (React Native / Expo Web)

---

## 🛠️ CÁC LỖI ĐÃ SỬA
1. **CSRF Middleware** → Thêm regex hỗ trợ `*.pages.dev`, `*.onrender.com`
2. **Database Migrations** → Thêm `safe_create_table()`, kiểm tra bảng/cột trước khi tạo
3. **Thiếu cột `user_name`** trong `audit_logs` → Đã thêm
4. **Thiếu schema `thue`** → Đã tạo

---

## 🔄 DEPLOY
- **Backend:** Render Auto-Deploy (khi push GitHub)
- **Frontend:** Cloudflare Pages

---

*Cập nhật: 24/07/2026*

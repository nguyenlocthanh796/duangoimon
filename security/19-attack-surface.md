# 19 — ATTACK SURFACE ANALYSIS

## 1. External / Internet Attack Surface

- **Public Endpoints**:
  - `POST /api/v1/public/login` (Brute force tenant credentials).
  - `POST /api/v1/public/staff-pin` (Brute force PIN qua multiple IP proxy).
  - `POST /api/v1/public/register` (Spam tenant registration).
  - `GET /api/v1/public/bills/:code` & `GET /b/:code` (IDOR / Scrape thông tin chi tiêu khách hàng).
  - `GET /ws/pos` (Unauthenticated WebSocket connection & data sniffing).
- **Network Ports Exposure**:
  - PostgreSQL port `5432` và Redis port `6379` nếu không bị UFW drop.

---

## 2. Authenticated / Internal Attack Surface (Malicious Staff / Multi-Tenant Neighbor)

- **Malicious Cashier / Staff Attack Surface**:
  - Sử dụng mã PIN mặc định `8888`/`9999` để duyệt hủy món, hủy đơn sau khi đã nhận tiền mặt từ khách.
  - Gọi trực tiếp API `POST /api/v1/printer/open-drawer` để mở két tiền không cần tạo đơn.
  - Sửa giá món ăn qua `PATCH /api/v1/products/:id/price` để bán giá rẻ cho người quen.
  - Tự tạo phiếu chi lương qua `POST /api/v1/staff/:id/pay-salary`.
- **Malicious Tenant Neighbor (Cross-Tenant)**:
  - Thay đổi header `X-Tenant-ID` sang mã tenant của quán đối thủ để đọc toàn bộ báo cáo doanh thu (`/api/v1/owner/pnl-summary`), danh sách nhân viên, thông tin khách hàng CRM.
  - Gửi `POST /api/v1/backup/restore` với header `X-Tenant-ID` đối thủ kèm mảng rỗng để xóa sạch menu và bàn ăn của đối thủ.
  - Mở kết nối WebSocket tới tenant đối thủ để theo dõi số lượng khách và doanh thu trực tiếp.

---

## 3. Hardware & Network Attack Surface

- **Thermal Printer Socket Exploitation**:
  - Gửi request `POST /api/v1/printer/print-receipt` với IP máy in là các dịch vụ nội bộ (Redis, internal HTTP API) để gửi lệnh tùy ý (SSRF).

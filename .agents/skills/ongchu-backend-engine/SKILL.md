---
name: ongchu-backend-engine
description: Hướng dẫn kỹ thuật chuyên sâu về Backend Golang Gin/Fiber siêu nhẹ (15MB RAM, 0.05s khởi động), GORM PostgreSQL/SQLite, WebSocket Hub realtime, Bot Telegram chống gian lận và Bộ sinh mã in nhiệt ESC/POS TCP Socket 9100.
---

# ⚡ HƯỚNG DẪN KỸ THUẬT GOLANG BACKEND ENGINE

Skill này cung cấp chi tiết kiến trúc, API contracts, cấu trúc CSDL và phương pháp vận hành Backend Golang cho hệ thống OngChu Lean POS.

---

## 🧭 KHI NÀO SỬ DỤNG SKILL NÀY
- Thêm mới hoặc sửa đổi REST API endpoint trong `backend/internal/handler/`.
- Cập nhật Data Model GORM hoặc tạo migration mới trong `backend/internal/models/` và `backend/migrations/`.
- Mở rộng logic phát hiện gian lận và gửi cảnh báo bot Telegram trong `backend/internal/service/telegram.go`.
- Thêm các lệnh in nhiệt hoặc tùy biến layout hóa đơn ESC/POS trong `backend/internal/handler/printer.go`.
- Xử lý đồng bộ WebSocket đa kênh trong `backend/internal/websocket/hub.go`.

---

## 📁 DANH MỤC THÀNH PHẦN BACKEND
- **Mô hình Dữ liệu**: `backend/internal/models/models.go`
- **Tập lệnh Khởi tạo CSDL**: `backend/migrations/001_initial_schema.sql`
- **Bộ điều hướng Gin**: `backend/cmd/server/main.go`
- **Handlers**:
  - `order.go`: Nghiệp vụ Đơn hàng, Hóa đơn & Bàn
  - `cash_flow.go`: Sổ quỹ tiền mặt Thu / Chi chợ
  - `shift.go`: Giao ca, Đếm két & Báo động lệch két
  - `owner_pnl.go`: Báo cáo 3 Con số vàng bỏ túi
  - `printer.go`: In hóa đơn ESC/POS TCP Socket 9100
  - `cfd.go`: Trạng thái Customer Facing Display
- **Dịch vụ**:
  - `service/telegram.go`: Bot Telegram Goroutine
  - `websocket/hub.go`: WebSocket Broadcast Hub

---

## 📚 TÀI LIỆU THAM KHẢO KÈM THEO
- [api-specs.md](file:///d:/duanpos-ongchu/.agents/skills/ongchu-backend-engine/references/api-specs.md): Đặc tả chi tiết các REST API endpoints.
- [database-schema.md](file:///d:/duanpos-ongchu/.agents/skills/ongchu-backend-engine/references/database-schema.md): Sơ đồ quan hệ thực thể (ERD) và ràng buộc khóa.
- [escpos-commands.md](file:///d:/duanpos-ongchu/.agents/skills/ongchu-backend-engine/references/escpos-commands.md): Chi tiết bảng mã byte ESC/POS và điều khiển ngăn kéo tiền.

---

## 🛠️ CÁCH BIÊN DỊCH & KIỂM THỬ BACKEND

```bash
cd backend

# Tải dependencies
go mod tidy

# Chạy server ở chế độ phát triển
go run cmd/server/main.go

# Build file nhị phân siêu nhẹ
go build -ldflags="-s -w" -o server.exe cmd/server/main.go

# Kiểm tra sức khỏe hệ thống
curl http://localhost:8080/health
```

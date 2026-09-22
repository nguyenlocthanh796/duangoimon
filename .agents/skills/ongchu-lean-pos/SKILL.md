---
name: ongchu-lean-pos
description: Quy chuẩn kiến trúc, quy tắc nghiệp vụ và cẩm nang vận hành toàn diện cho Hệ thống POS F&B Thực Chiến Vị Chủ Quán (Go Backend 15MB + Expo SDK 52 Native + Sổ Quỹ Chi Chợ + Giao Ca Két 30s + In Nhiệt ESC/POS Direct Socket). Áp dụng cho toàn bộ dự án duanpos-ongchu.
---

# 👑 CẨM NANG VẬN HÀNH ONGCHU LEAN POS (MASTER SKILL)

Hệ thống POS F&B Thực Chiến Vị Chủ Quán được thiết kế nhằm giải quyết triệt để bài toán vận hành nhà hàng, quán cà phê, trà sữa, ăn vặt tại Việt Nam với tốc độ cực nhanh, dung lượng siêu nhẹ, không phụ thuộc kết nối Internet và chống thất thoát nội bộ tối đa.

---

## 🧭 KHI NÀO SỬ DỤNG SKILL NÀY

Kích hoạt skill này khi:
1. Phát triển, mở rộng hoặc sửa lỗi tính năng trên toàn bộ dự án `duanpos-ongchu`.
2. Thiết kế hoặc cập nhật màn hình POS Bán Hàng, Sơ Đồ Bàn, Sổ Quỹ Tiền Mặt, Giao Ca Đếm Két, Báo Cáo Lợi Nhuận Bỏ Túi, hoặc Màn Hình Khách Hàng (CFD).
3. Tích hợp máy in nhiệt hóa đơn ESC/POS K80/K58, ngăn kéo đựng tiền RJ11, quét mã VietQR Napas247 động.
4. Xử lý đồng bộ WebSocket đa thiết bị giữa POS thu ngân, Màn hình bếp KDS và Màn hình phụ CFD.
5. Triển khai bot Telegram cảnh báo gian lận và kế toán dòng tiền kép.

---

## 🏛️ 6 TRỤ CỘT BẤT BIẾN

1. **Triết lý Vị Chủ Quán**: Sổ Quỹ Chi Chợ 3 giây (`/so-quy`), Giao Ca Đếm Két 30 giây (`/giao-ca`), Báo Cáo 3 Con Số Vàng Bỏ Túi (`/bao-cao-loi-nhuan`).
2. **Backend Siêu Tốc (15MB RAM)**: Golang Gin/Fiber khởi động trong `0.05 giây`, WebSocket Hub `/ws/pos`, GORM auto-migrate.
3. **In Nhiệt ESC/POS Trực Tiếp**: Kết nối TCP Socket Cổng `9100` không qua Windows driver, tự động kích mở két `\x1b\x70\x00\x19\xfa`.
4. **Frontend Universal 60 FPS**: 1 Codebase Expo SDK 52 React Native, Zustand Multi-Table Cart, Shopify FlashList.
5. **Thiết Kế Indochine Heritage (Giấy Dó & Gỗ Mun)**: Light Mode Ngà Giấy Dó (`#F9F6F0`) & Gỗ Mun (`#1C1917`), Dark Mode Gỗ Gụ & Cà Phê Đậm (`#120E0B`), Vàng Đồng Thau Phin (`#B45309`), Tabular Nums 100% cho số tiền.
6. **Chống Gian Lận & Độc Lập**: Hoạt động offline hoàn toàn khi mất mạng, Audit Logs cảnh báo hủy món sau in tạm tính qua Telegram bot.

---

## 📂 BẢN ĐỒ TÀI LIỆU & SKILL CHUYÊN SÂU LIÊN QUAN

- **Quy chuẩn lập trình & Giao diện**:
  - [AGENTS.md](file:///d:/duanpos-ongchu/AGENTS.md): Kim chỉ nam quy tắc dự án.
  - [code-style.md](file:///d:/duanpos-ongchu/.agents/rules/code-style.md): Quy chuẩn Go & TypeScript.
  - [ui-ux-ergonomics.md](file:///d:/duanpos-ongchu/.agents/rules/ui-ux-ergonomics.md): Công thái học F&B.
  - [anti-fraud-accounting.md](file:///d:/duanpos-ongchu/.agents/rules/anti-fraud-accounting.md): Sổ quỹ & chống thất thoát.
  - [security-hardening.md](file:///d:/duanpos-ongchu/.agents/rules/security-hardening.md): Bảo mật 4 vành đai & chống mất code.
- **Các Skill chuyên sâu**:
  - `ongchu-backend-engine`: Chi tiết kiến trúc Golang Gin, GORM, WebSocket, REST APIs.
  - `ongchu-frontend-expo`: Chi tiết Expo SDK 52, Zustand, FlashList, UI primitives.
  - `ongchu-hardware-devices`: Chi tiết máy in ESC/POS TCP 9100, két RJ11, CFD, ADB testing.
  - `ongchu-security-hardening`: Chi tiết 4 vành đai bảo mật, Stripped Binary, HMAC Signature, VPS OS Hardening.

---

## 🚀 QUY TRÌNH KHỞI CHẠY & KIỂM THỬ HỆ THỐNG

### Bước 1: Khởi động CSDL & Bộ Nhớ Đệm
```bash
docker-compose up -d
```
*Kiểm tra: Cổng PostgreSQL 5432 và Redis 6379.*

### Bước 2: Khởi động Golang Backend Server
```bash
cd backend
go run cmd/server/main.go
```
*Kiểm tra Health: `curl http://localhost:8080/health` (hoặc 8085).*

### Bước 3: Khởi động Expo Frontend App
```bash
cd frontend
npm run dev
```
*Truy cập trình duyệt: `http://localhost:8085` hoặc quét mã QR qua Expo Go trên điện thoại.*

### Bước 4: Kiểm thử Thiết Bị Android Thực Tế
```bash
python scripts/android_adb_mcp.py
```

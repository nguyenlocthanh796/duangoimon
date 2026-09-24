# 📋 Nhật Ký Cập Nhật (CHANGELOG)

## [v2.0.0] - 2026-09-24
### 🚀 Bản Phát Hành Chính Thức Toàn Diện (Official Production Release)
- **Windows Desktop Native (.exe)**:
  - Bản cài đặt NSIS Wizard (`OngChu_POS_v2.0.0_Setup.exe`, 5.81 MB) tích hợp icon, uninstaller, desktop shortcut.
  - Bản chạy ngay Portable (`OngChu_POS_v2.0.0_Portable.exe`, 12.02 MB) không cần cài đặt.
  - Tích hợp in nhiệt trực tiếp qua mạng LAN TCP Raw Socket 9100 và xung mở két tiền RJ11.
- **Android Native (.apk)**:
  - Bản cài đặt Standalone (`OngChu_POS_v2.0.0.apk`) tương thích điện thoại, máy tính bảng Android và máy POS chuyên dụng (Sunmi V2/T2, iMin, Ocha).
  - Tối ưu cuộn 60 FPS Shopify FlashList và phản hồi xúc giác Haptic khi chọn món.
- **Bảo Mật 4 Vành Đai Khép Kín**:
  - Triệt tiêu 100% secret trên client bundle; xác thực Quản trị SaaS chuyển toàn bộ về Backend Go.
  - Rate limiting 3 lần/15 phút trên từng IP, chống tấn công brute-force; tích hợp Telegram Alert tức thì.
  - Mã băm SHA-256 minh bạch cho từng file đóng gói.
- **Kênh Phân Phối Đa Nền Tảng (Dual-Mirror CDN)**:
  - Hỗ trợ tải song song từ Máy chủ Việt Nam (`https://ongchu.cloud/downloads`) và CDN toàn cầu GitHub Releases.

## [v1.0.0] - 2026-09-22
### ✨ Tính Năng Mới
- Ra mắt bộ giao diện POS Universal (Expo SDK 57 / React 19).
- Tích hợp Sổ Quỹ Chi Chợ 3s và Giao Ca Đếm Két 30s.
- Hỗ trợ in nhiệt ESC/POS Direct Socket TCP 9100.
- Ra mắt bản Windows Native Desktop Client siêu nhẹ ~12MB.
- Kết nối Màn hình Bếp KDS Realtime qua WebSocket Hub.

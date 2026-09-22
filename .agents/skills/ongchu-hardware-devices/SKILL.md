---
name: ongchu-hardware-devices
description: Hướng dẫn kết nối và điều khiển thiết bị ngoại vi phần cứng F&B (Máy in nhiệt ESC/POS TCP 9100, Kích mở ngăn kéo đựng tiền RJ11, Màn hình phụ khách hàng CFD, Quét mã VietQR động, và Kiểm thử thiết bị Android qua ADB MCP Server).
---

# 🖨️ HƯỚNG DẪN KỸ THUẬT THIẾT BỊ NGOẠI VI & PHẦN CỨNG

Skill này cung cấp chi tiết cách kết nối, cấu hình, xử lý sự cố máy in nhiệt, két tiền, màn hình phụ và quy trình tự động hóa kiểm thử trên thiết bị Android thật bằng ADB MCP Server.

---

## 🧭 KHI NÀO SỬ DỤNG SKILL NÀY
- Cấu hình máy in hóa đơn K80/K58 hoặc máy in bếp qua mạng LAN (cổng TCP 9100) hoặc cổng USB/COM.
- Kích xung điện mở ngăn kéo đựng tiền thu ngân tự động (RJ11 24V).
- Đồng bộ hiển thị giỏ hàng và mã VietQR Napas247 sang máy tính bảng thứ hai (Màn hình khách hàng CFD).
- Tự động hóa chụp ảnh màn hình, chạm, vuốt, nhập text trên điện thoại Android qua `scripts/android_adb_mcp.py`.
- Đóng gói ứng dụng Desktop bằng Tauri 2.0.

---

## 📁 CÁC TẬP TIN LIÊN QUAN
- **Backend Printer Handler**: `backend/internal/handler/printer.go`
- **Tauri Desktop Printer Driver**: `desktop/src-tauri/src/printer.rs` & `main.rs`
- **Android ADB MCP Server**: `scripts/android_adb_mcp.py`
- **Màn hình CFD**: `frontend/app/cfd/index.tsx`
- **Modal Quét QR Barcode**: `frontend/lib/components/pos/QRScannerModal.tsx`

---

## 📚 TÀI LIỆU THAM KHẢO KÈM THEO
- [thermal-printer-setup.md](file:///d:/duanpos-ongchu/.agents/skills/ongchu-hardware-devices/references/thermal-printer-setup.md): Hướng dẫn cấu hình IP tĩnh cho máy in nhiệt và xử lý kẹt lệnh.
- [cfd-vietqr-sync.md](file:///d:/duanpos-ongchu/.agents/skills/ongchu-hardware-devices/references/cfd-vietqr-sync.md): Giao thức đồng bộ WebSocket giỏ hàng & mã VietQR Napas247 động.
- [adb-device-testing.md](file:///d:/duanpos-ongchu/.agents/skills/ongchu-hardware-devices/references/adb-device-testing.md): Hướng dẫn sử dụng công cụ ADB MCP để điều khiển và kiểm thử thiết bị Android từ xa.

---

## 🛠️ QUY TRÌNH KIỂM THỬ THIẾT BỊ NGOẠI VI

### 1. Kiểm tra kết nối máy in qua Telnet / Netcat
```bash
# Thử kết nối cổng in 9100 của máy in Xprinter / Epson
powershell -Command "Test-NetConnection -ComputerName 192.168.1.200 -Port 9100"
```

### 2. Kiểm thử Android ADB MCP Server
```bash
python scripts/android_adb_mcp.py
```
*Hỗ trợ các tool: `adb_list_devices`, `adb_dump_ui` (ưu tiên phân tích UI), `adb_screenshot` (tự động verify & nén chống lỗi HTTP 400), `adb_tap`, `adb_swipe`, `adb_input_text`, `adb_reverse_ports` (forward 8085/8080).*

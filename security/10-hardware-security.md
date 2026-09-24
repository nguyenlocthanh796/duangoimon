# 10 — HARDWARE INTEGRATION & ESC/POS SECURITY

## 1. Hardware Communication Architecture

- **Kết Nối Máy In**: Direct Raw TCP Socket cổng `9100` (Không qua Windows Print Spooler hay CUPS driver).
- **Lệnh Hex ESC/POS Chuẩn**:
  - `\x1B\x40` (ESC @): Reset / Initialize printer.
  - `\x1D\x56\x41\x10` (GS V 65 16): Cắt giấy tự động (Auto-cut).
  - `\x1B\x70\x00\x19\xFA` (ESC p 0 25 250): Xung điện 24V kích mở két tiền RJ11.
- **TSPL Label Protocol**: `BuildTSPLCupLabelsBuffer` sinh mã in tem dán ly trà sữa (`SIZE 50 mm, 30 mm`, `DIRECTION 1`, `TEXT`, `PRINT 1,1`).

---

## 2. SSRF Protection & Network Dialing

- **Code Reference**: `backend/internal/handler/printer.go:228-243`.
- **Hàm `isSafePrinterIP`**:
  ```go
  func isSafePrinterIP(ipStr string) bool {
      cleanIP := strings.TrimSpace(ipStr)
      if cleanIP == "" { return false }
      ip := net.ParseIP(cleanIP)
      if ip == nil { return false }
      if ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() || ip.IsUnspecified() {
          return false
      }
      return true
  }
  ```
- **Lỗ Hổng SSRF & Port Scanning Nội Bộ**:
  - `isSafePrinterIP` chỉ chặn `169.254.x.x` (AWS/GCP metadata) và Multicast/Unspecified.
  - Hàm **CHO PHÉP** tất cả dải IP private (`192.168.x.x`, `10.x.x.x`, `172.16.x.x`), Loopback (`127.0.0.1`), và IP Public trên Internet.
  - Request có thể tùy chỉnh trường `printer_port` (VD: port 22, 5432, 6379, 80).
  - Kẻ tấn công có thể sử dụng endpoint `POST /api/v1/printer/print-receipt` làm bàn đạp SSRF để quét mạng nội bộ VPS / Cloud, hoặc gửi raw byte payload tấn công các dịch vụ Redis / memcached nội bộ.

---

## 3. Cash Drawer Kick Security

- **Endpoint**: `POST /api/v1/printer/open-drawer`.
- **Xác Thực**: Endpoint nằm trong nhóm bảo vệ bởi `TenantQuotaMiddleware`, nhưng **KHÔNG** yêu cầu Manager PIN hay xác thực quyền thu ngân.
- **Audit Logging**: Tự động gọi `service.GlobalTelegramAlert.AlertManualDrawerKick(cashier)` để gửi cảnh báo về Telegram Chủ Quán.
- **Tauri Desktop IPC**: Lệnh `open_cash_drawer` trong Tauri Rust (`desktop/src-tauri/src/main.rs:13`) có thể bị gọi trực tiếp từ Webview JS mà không qua bất kỳ lớp kiểm tra nào.

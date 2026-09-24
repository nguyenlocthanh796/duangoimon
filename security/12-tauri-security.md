# 12 — DESKTOP TAURI CLIENT SECURITY

## 1. Tauri Framework & Manifest Review

- **Tauri Core**: `2.0.0` (Rust 2021 edition).
- **Manifest**: `desktop/src-tauri/tauri.conf.json`.
  - App Identifier: `com.ongchu.pos.desktop`.
  - Frontend Dist: `../../frontend/dist`.
  - Dev URL: `http://localhost:8082`.
  - `bundle.active`: `true`.

---

## 2. IPC Commands & Attack Surface

- **Registered Handlers** (`desktop/src-tauri/src/main.rs:20`):
  1. `print_receipt`: Nhận payload JSON hóa đơn và gửi raw ESC/POS ra máy in.
  2. `open_cash_drawer`: Nhận `printer_ip: Option<String>` và gửi tín hiệu xung điện `\x1B\x70\x00\x19\xFA` tới máy in.
- **Lỗ Hổng IPC Không Xác Thực**:
  - Bất kỳ đoạn mã JavaScript nào chạy trong Webview đều có thể gọi `window.__TAURI__.invoke('open_cash_drawer', { printerIp: '...' })`.
  - Không có lớp bảo vệ mã PIN, phân quyền thu ngân, hay rate limit trên tầng Rust Core.

---

## 3. CSP & Webview Isolation

- **Content Security Policy (CSP)** (`tauri.conf.json:24`):
  - `"security": { "csp": null }` -> Toàn bộ CSP bị vô hiệu hóa.
- **Global Tauri Scope** (`tauri.conf.json:11`):
  - `"withGlobalTauri": true` -> Expose toàn bộ API Tauri vào đối tượng toàn cục `window.__TAURI__`.
- **Đánh Giá Rủi Ro**:
  - Nếu ứng dụng có bất kỳ lỗ hổng XSS nào từ tên món ăn, tên khách hàng, hoặc dữ liệu WebSocket, mã độc có thể gọi trực tiếp IPC commands để kích mở két tiền hoặc gửi dữ liệu qua socket TCP nội bộ.

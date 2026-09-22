# 📋 QUY CHUẨN LẬP TRÌNH (CODE STYLE & CODING STANDARDS)

Áp dụng cho toàn bộ dự án `duanpos-ongchu`. Mọi lập trình viên và AI Agent phải tuân thủ nghiêm ngặt các quy ước dưới đây.

---

## 🐹 1. QUY CHUẨN GOLANG (BACKEND)

### 1.1. Kiến Trúc & Tổ Chức Gói
- Tổ chức theo Standard Go Project Layout:
  - `cmd/server/`: Điểm khởi chạy nhị phân duy nhất.
  - `internal/models/`: Struct dữ liệu GORM + JSON tags.
  - `internal/handler/`: Controller tiếp nhận HTTP Gin context, validation và phản hồi JSON.
  - `internal/service/`: Logic nghiệp vụ phức tạp, goroutines (Telegram alert, ESC/POS generator).
  - `internal/websocket/`: Quản lý pool kết nối, kênh truyền và broadcast realtime.
  - `internal/database/`: Khởi tạo GORM, connection pooling và auto-migrate.

### 1.2. Xử Lý Lỗi & Goroutine Safety
- **Luôn kiểm tra `err != nil` tường minh**: Không bao giờ bỏ qua lỗi (`_ = db.Save()`).
- **Gửi cảnh báo Telegram bất đồng bộ**: Luôn bọc trong goroutine độc lập với `recover()` để tránh panic làm sập HTTP request chính:
  ```go
  go func() {
      defer func() {
          if r := recover(); r != nil {
              log.Printf("[Telegram Alert Recovered]: %v", r)
          }
      }()
      telegramService.SendSecurityAlert(tenantID, message)
  }()
  ```
- **Thread-safe WebSocket Hub**: Quản lý `clients map[*Client]bool` bắt buộc qua `sync.RWMutex` hoặc thông qua kênh `register`, `unregister`, `broadcast` trong vòng lặp `hub.Run()`.

### 1.3. Định Dạng JSON & Database
- Tên trường trong JSON API luôn dùng `snake_case` (ví dụ: `total_amount`, `payment_method`, `table_id`).
- Struct GORM phải có đầy đủ tag `gorm:"column:..."` và `json:"..."`.

---

## ⚛️ 2. QUY CHUẨN TYPESCRIPT & REACT NATIVE (FRONTEND)

### 2.1. Quản Lý Trạng Thái Bằng Zustand
- Tất cả trạng thái POS dùng chung (giỏ hàng đa bàn, bàn đang chọn, chiết khấu, danh sách bàn) lưu trữ trong `usePOSStore`.
- Cập nhật state bất biến (Immutable): Không dùng `Array.prototype.push` trực tiếp trên state mảng. Dùng Spread operator hoặc Map.
- Hạn chế re-render thừa: Sử dụng selector khi đọc state:
  ```typescript
  // Đúng: Chỉ re-render khi số lượng bàn thay đổi
  const tableCount = usePOSStore((s) => s.tables.length);
  // Sai: Re-render khi bất kỳ thuộc tính nào trong store thay đổi
  const { tables, tableCarts, activeArea } = usePOSStore();
  ```

### 2.2. Component Primitives & Styling
- **Tuyệt đối không dùng `<Text>` gốc của React Native**: Bắt buộc dùng `<AppText variant="..." weight="..." color="...">` để đảm bảo typography và tabular-nums đồng nhất.
- **Không hardcode màu Hex trong `StyleSheet.create`**: Sử dụng `theme` từ hook `useTheme()`.
- **Tối ưu danh sách lớn**: Luôn dùng `@shopify/flash-list` với `estimatedItemSize` chính xác cho danh sách món ăn và sơ đồ bàn. Bọc các Item Component trong `React.memo` với hàm so sánh tùy chỉnh.

### 2.3. Âm Thanh & Rung Phản Hồi (Audio & Haptics)
- Mọi thao tác chạm vào thẻ món, nút bấm tăng/giảm, chuyển bàn, gửi bếp, thanh toán đều phải kích hoạt đồng thời:
  1. Rung nhẹ: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`.
  2. Âm thanh tít tít: `playTapSound()`.
- Đảm bảo âm thanh phát sinh bằng Web Audio API hoặc Expo AV không gây block Main UI Thread (`0ms latency`).

---

## 🦀 3. QUY CHUẨN TAURI & DESKTOP WRAPPER
- Mã Rust trong `desktop/src-tauri/src/` đóng vai trò giao tiếp phần cứng cục bộ cấp thấp (máy in nhiệt USB/COM, ngăn kéo đựng tiền RJ11).
- Các hàm command Tauri (`#[tauri::command]`) phải trả về `Result<String, String>` để frontend dễ dàng bắt lỗi và hiển thị thông báo thân thiện.

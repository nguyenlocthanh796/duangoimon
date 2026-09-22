# 🔗 CƠ CHẾ CHUỖI HASH ĐƠN HÀNG NGOẠI TUYẾN (OFFLINE HASH CHAIN)

Tài liệu quy định giải pháp mã hóa chống gian lận và chống xóa đơn hàng khi máy POS hoạt động ở chế độ ngoại tuyến (Offline Mode / Mất kết nối Internet).

---

## 🛑 1. BÀI TOÁN GIAN LẬN KHI MẤT MẠNG

Khi nhà hàng/quán mất mạng Internet:
- Máy POS chuyển sang chế độ bán hàng ngoại tuyến (Offline-First), lưu đơn hàng vào CSDL cục bộ (SQLite).
- **Nguy cơ**: Nhân viên thu ngân thu tiền mặt của khách (ví dụ 3 đơn: `HD-01`, `HD-02`, `HD-03`), sau đó cố tình can thiệp vào máy để xóa đơn `HD-02` (bỏ túi 100k), rồi mới cắm mạng lại để đồng bộ các đơn còn lại (`HD-01`, `HD-03`) lên Server.

---

## ⛓️ 2. NGUYÊN LÝ CHUỖI HASH NỐI TIẾP (CRYPTOGRAPHIC HASH CHAIN)

Mỗi đơn hàng ngoại tuyến khi được tạo ra sẽ gắn liền với một mã băm mật mã học (SHA-256) phụ thuộc trực tiếp vào mã băm của đơn hàng liền kề trước đó trong ca làm việc:

$$\text{CurrentHash} = \text{SHA256}\left(\text{TenantID} + \text{DeviceID} + \text{OrderCode} + \text{TotalAmount} + \text{CreatedAt} + \text{PrevHash}\right)$$

### 2.1. Cấu Trúc Bản Ghi Đơn Hàng Ngoại Tuyến
```json
{
  "order_code": "HD-0002",
  "shift_id": "shift-20260918-01",
  "total_amount": 85000,
  "created_at": "2026-09-18T14:30:00Z",
  "prev_hash": "a8f5c... (Hash của đơn HD-0001)",
  "current_hash": "3e9b1... (SHA256 của toàn bộ dữ liệu HD-0002 + prev_hash)"
}
```

* **Đơn đầu tiên trong ca (`HD-0001`)**: `prev_hash` = $\text{SHA256}(\text{ShiftID} + \text{StartingCash})$.
* **Đơn tiếp theo (`HD-0002`)**: `prev_hash` = `CurrentHash` của `HD-0001`.
* **Đơn tiếp theo (`HD-0003`)**: `prev_hash` = `CurrentHash` của `HD-0002`.

---

## 🔍 3. QUY TRÌNH KIỂM CHỨNG TẠI BACKEND GOLANG KHI ĐỒNG BỘ

Khi máy POS có mạng trở lại và gọi API đồng bộ hàng loạt `POST /api/v1/sync/orders`:

1. **Backend nhận mảng đơn hàng** `[]models.Order`.
2. **Kiểm tra tuần tự từng mắt xích**:
   - Tính toán lại mã băm $\text{ExpectedHash}$ dựa trên dữ liệu đơn và $\text{prev\_hash}$.
   - Nếu $\text{ExpectedHash} \neq \text{CurrentHash}$ -> Dữ liệu đơn đã bị chỉnh sửa giá hoặc số lượng.
   - Nếu $\text{PrevHash}$ của đơn $N$ không khớp với $\text{CurrentHash}$ của đơn $N-1$ -> **Đã có ít nhất 1 đơn hàng bị xóa ở giữa!**

3. **Hành động khi phát hiện đứt chuỗi Hash**:
   - Vẫn lưu các đơn hợp lệ vào CSDL.
   - Đánh dấu trạng thái `has_fraud_flag = true` trên ca làm việc (`CashShift`).
   - Ghi bản ghi `AuditLog` loại `OFFLINE_CHAIN_BROKEN`.
   - **Kích hoạt Goroutine gửi Telegram Alert ngay lập tức cho Chủ Quán**:
     ```
     🚨 PHÁT HIỆN GIAN LẬN ĐƠN HÀNG NGOẠI TUYẾN!
     • Quầy: Thu ngân 01 (Ca Sáng)
     • Vị trí lỗi: Đứt gãy giữa đơn HD-0001 và HD-0003
     • Khả năng: Đơn HD-0002 đã bị xóa thủ công trên thiết bị trước khi kết nối lại mạng!
     ```

---

## 💾 4. MÃ HÓA CSDL SQLITE CỤC BỘ (SQLCIPHER)

Để chống việc nhân viên tháo file database SQLite trên thiết bị di động ra sửa trực tiếp:
- Sử dụng **SQLCipher** mã hóa toàn bộ file database cục bộ bằng thuật toán `AES-256`.
- Khóa bí mật (Encryption Key) được sinh ngẫu nhiên khi cài app và lưu trữ an toàn trong chip bảo mật phần cứng:
  - **iOS**: Apple Keychain Services.
  - **Android**: Android Keystore Provider qua `expo-secure-store`.

# 🖨️ BẢNG MÃ LỆNH ESC/POS & ĐIỀU KHIỂN PHẦN CỨNG (ESCPOS COMMANDS)

Giao thức in nhiệt hóa đơn thô (Raw Byte Stream) qua kết nối mạng LAN TCP Socket Cổng `9100`.

---

## 1. MÃ BYTE ESC/POS CHUẨN

| Tên Lệnh | Cú Pháp Byte (Go Hex) | Chức Năng Chi Tiết |
| :--- | :--- | :--- |
| `INIT` | `[]byte{0x1B, 0x40}` | Đặt lại bộ đệm máy in về cấu hình mặc định |
| `ALIGN_LEFT` | `[]byte{0x1B, 0x61, 0x00}` | Căn lề trái toàn bộ dòng văn bản kế tiếp |
| `ALIGN_CENTER` | `[]byte{0x1B, 0x61, 0x01}` | Căn lề giữa (Tiêu đề hóa đơn, Tên quán) |
| `ALIGN_RIGHT` | `[]byte{0x1B, 0x61, 0x02}` | Căn lề phải (Số tiền, Tổng cộng) |
| `BOLD_ON` | `[]byte{0x1B, 0x45, 0x01}` | Bật chế độ in đậm |
| `BOLD_OFF` | `[]byte{0x1B, 0x45, 0x00}` | Tắt chế độ in đậm |
| `DOUBLE_SIZE` | `[]byte{0x1D, 0x21, 0x11}` | Phóng to gấp đôi chiều ngang và chiều cao chữ |
| `NORMAL_SIZE` | `[]byte{0x1D, 0x21, 0x00}` | Quay lại kích thước chữ chuẩn 12x24 dots |
| `CUT_PAPER` | `[]byte{0x1D, 0x56, 0x41, 0x10}` | Lệnh cắt giấy tự động (Auto-Cut) |
| `KICK_DRAWER` | `[]byte{0x1B, 0x70, 0x00, 0x19, 0xFA}` | Phát xung điện 24V (250ms) mở két tiền RJ11 |

---

## 2. ĐỊNH DẠNG CỘT HÓA ĐƠN K80 (48 KÝ TỰ / DÒNG)

Hóa đơn K80 có độ rộng tiêu chuẩn 48 ký tự (Font A). Cấu trúc bảng chia cột:
```
Tên Món (24 ký tự)   SL(4)  Đ.Giá(9)    T.Tiền(11)
────────────────────────────────────────────────
Trà Sữa Trân Châu      2    35.000      70.000
- Size L, 50% Đường
Cà Phê Muối Cố Đô      1    29.000      29.000
────────────────────────────────────────────────
TỔNG CỘNG (3 MÓN):                      99.000 đ
GIẢM GIÁ (Voucher 10%):                 -9.900 đ
CẦN THANH TOÁN:                         89.100 đ
```

---

## 3. MẪU MÃ NGUỒN GỬI BYTE QUA TCP SOCKET (GOLANG)

```go
package service

import (
    "fmt"
    "net"
    "time"
)

func SendRawBytesToPrinter(printerIP string, port int, data []byte) error {
    address := fmt.Sprintf("%s:%d", printerIP, port)
    conn, err := net.DialTimeout("tcp", address, 3*time.Second)
    if err != nil {
        return fmt.Errorf("không thể kết nối máy in %s: %w", address, err)
    }
    defer conn.Close()

    conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
    _, err = conn.Write(data)
    if err != nil {
        return fmt.Errorf("lỗi ghi dữ liệu ra máy in: %w", err)
    }
    return nil
}
```

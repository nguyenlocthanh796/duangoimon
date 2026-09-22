# 🏗️ SƠ ĐỒ KIẾN TRÚC TOÀN HỆ THỐNG (SYSTEM ARCHITECTURE)

```
                                    ┌────────────────────────┐
                                    │    THIẾT BỊ NGƯỜI DÙNG │
                                    └───────────┬────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
      ┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
      │  iPad / Máy POS PC │         │  Điện Thoại Order  │         │  Màn Hình Phụ CFD  │
      │  (Master 60/40)    │         │  (1-Column Thumb)  │         │  (VietQR Napas247) │
      └──────────┬─────────┘         └──────────┬─────────┘         └──────────┬─────────┘
                 │                              │                              │
                 │   HTTP REST API (Port 8080)  │   WebSocket Event (/ws/pos)  │
                 └──────────────────────────────┼──────────────────────────────┘
                                                ▼
                             ┌─────────────────────────────────────┐
                             │        GOLANG GIN ENGINE (15MB)     │
                             │  - Router & CORS Middleware         │
                             │  - WebSocket Hub Multi-Client       │
                             │  - Telegram Anti-Fraud Goroutine    │
                             │  - ESC/POS TCP Byte Streamer        │
                             └──────────┬──────────────────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
      ┌────────────────────┐                        ┌────────────────────┐
      │   PostgreSQL 16    │                        │  Máy In Nhiệt LAN  │
      │   (ACID Ledger)    │                        │  (TCP Port 9100)   │
      └────────────────────┘                        └──────────┬─────────┘
                                                               │
                                                               ▼ (RJ11 24V Signal)
                                                    ┌────────────────────┐
                                                    │ Ngăn Kéo Tiền Két  │
                                                    └────────────────────┘
```

## 🔄 LUỒNG DỮ LIỆU ĐỒNG BỘ REALTIME
1. Thu ngân bấm **"GỬI BẾP"** hoặc **"THANH TOÁN"** trên máy POS.
2. Trạng thái đơn được lưu vào CSDL PostgreSQL qua API `POST /api/v1/orders`.
3. Backend phát sự kiện `order_updated` qua `WebSocket Hub`.
4. Màn hình Khách Hàng (CFD) lập tức cập nhật giỏ hàng và render mã VietQR động với đúng số tiền và nội dung bàn.
5. Máy in tại quầy thu ngân và máy in bếp nhận luồng byte ESC/POS qua TCP socket cổng `9100`, tự động in phiếu và cắt giấy.
6. Ngăn kéo đựng tiền tự động bật mở nếu là đơn thanh toán tiền mặt.

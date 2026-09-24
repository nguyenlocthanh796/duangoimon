# 👑 OngChu Lean POS — Universal Omnichannel F&B Platform
> **Hệ Thống Bán Hàng & Quản Trị F&B Thực Chiến — Cái Tâm Vị Chủ Quán**
> 
> *Đa Nền Tảng Siêu Nhẹ:* Windows Desktop Native (.exe 15MB) · iPad & iPhone (iOS Safari PWA) · Android POS (Sony Xperia / Sunmi / iMin) · Web Cloud ([app.ongchu.cloud](https://app.ongchu.cloud))

---

## 🏛️ 1. Kiến Trúc Cốt Lõi (Architecture Overview)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        ONGCHU LEAN POS CORE ARCHITECTURE                          │
├────────────────────────────────┬──────────────────────────────────────────────────┤
│ 1. Triết Lý Vị Chủ Quán        │ • Sổ Quỹ Chi Chợ 3s (/so-quy)                     │
│    (Zero-Government)           │ • Giao Ca Đếm Két 30s (/giao-ca)                 │
│                                │ • Báo Cáo 3 Con Số Vàng (/bao-cao-loi-nhuan)     │
│                                │ • Bot Telegram Báo Động Gian Lận Goroutine       │
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ 2. Backend Siêu Tốc (15MB)     │ • Golang 1.22+ Gin / Fiber (Khởi động 0.05s)     │
│                                │ • WebSocket Hub (/ws/pos) đồng bộ CFD & KDS      │
│                                │ • GORM Auto-Migrate PostgreSQL 16 & SQLite       │
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ 3. In Nhiệt ESC/POS Trực Tiếp  │ • In qua mạng LAN/WiFi TCP Socket (Port 9100)    │
│    (Không Cần Driver Windows)  │ • Kích mở két tiền tự động: \x1b\x70\x00\x19\xfa │
│                                │ • Tự cắt giấy: \x1d\x56\x41\x10                  │
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ 4. Frontend Universal          │ • 1 Codebase Expo SDK 57 (iOS, Android, Web PWA) │
│    (Ergonomic Responsive)      │ • Zustand Multi-Table Cart (<1KB, Zero DOM lag)  │
│                                │ • Shopify FlashList 60 FPS                       │
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ 5. Thiết Kế Dual-Theme         │ • Light Mode: Ngà Giấy Dó / Gỗ Mun (#F9F6F0)     │
│    (High-Contrast & Tabular)   │ • Dark Mode: Nâu Than / Cà Phê Rang (#14110E)    │
│                                │ • Điểm nhấn Cam Apple Action Thread (#B45309)   │
│                                │ • Tabular Nums 100% cho số tiền, SKU, số lượng  │
│                                │ • Thang đo 7 cấp font chuẩn (<AppText>): xxs->lg │
├────────────────────────────────┼──────────────────────────────────────────────────┤
│ 6. Chống Gian Lận & Độc Lập    │ • SQLite Offline-First bán hàng khi mất Internet │
│    (Offline-First & Security)  │ • Audit Log lưu vết hủy món sau khi in tạm tính  │
│                                │ • Cảnh báo chiết khấu > 20% và mở két tay       │
└────────────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 💻 2. Bảng Điều Phối Cổng & Môi Trường (Port Matrix)

| Phân Hệ | Thư Mục | Công Nghệ | Cổng Mặc Định | Nhiệm Vụ Trọng Tâm |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Mobile & Web** | `/frontend` | Expo SDK 57, React Native 0.86, Zustand | `8085` | 10 Màn hình: Bán hàng, Thanh toán, KDS, Sổ đơn, Thực đơn, Cài đặt, Sổ quỹ, Giao ca, Báo cáo, CFD |
| **Golang Backend** | `/backend` | Go 1.22+, Gin, GORM, WebSocket Hub | `8080` | REST APIs, WebSocket Broadcast, ESC/POS TCP Socket |
| **Database** | `docker-compose` | PostgreSQL 16 Alpine, Redis 7 Alpine | `5432` / `6379` | Sổ kế toán kép, lưu vết Audit Logs, Caching |
| **Máy In Nhiệt ESC/POS** | Mạng LAN | TCP Raw Socket | `9100` | In hóa đơn K80/K58 trực tiếp, kích mở két tiền |
| **Desktop Wrapper** | `/desktop` | Tauri 2.0 (Rust Core) | N/A (`.exe`) | Đóng gói Windows Native siêu nhẹ (~10MB, ~15MB RAM) |
| **Android ADB Testing** | `/scripts` | Python JSON-RPC MCP Server | ADB Stdio | Kiểm thử thiết bị thật (Sony Xperia 5 / Tablet) |

---

## 📱 3. Danh Mục Màn Hình Nghiệp Vụ (Screen Catalog)

1. **Bán Hàng & Sơ Đồ Bàn (`/`)**: Sơ đồ bàn trực quan, đổi tầng/khu vực, giỏ hàng đa bàn không giật lag, hỗ trợ bán mang về.
2. **Thanh Toán Đa Phương Thức (`/thanh-toan`)**: Tiền mặt tính tiền thối tự động, VietQR động Napas247, Sổ nợ khách quen, Xuất HĐĐT MTT CQT.
3. **Bếp & Quầy Pha Chế KDS (`/kds`)**: Nhận order realtime qua WebSocket, bấm xong món / bưng bàn, báo hết món (86) tức thì.
4. **Sổ Hóa Đơn (`/hoa-don`)**: Tra cứu lịch sử đơn hàng, in lại hóa đơn, lọc theo trạng thái, lưu vết hủy món.
5. **Thực Đơn & Món Ăn (`/thuc-don`)**: Quản lý nhóm món, món kèm topping, biến thể size, bật tắt trạng thái hết món tức thì.
6. **Sổ Quỹ Chi Chợ 3 Giây (`/so-quy`)**: Ghi chép tức thì các khoản tiền mặt chi thực tế (đá, rau, thịt, ứng lương), bóc tách dòng tiền.
7. **Giao Ca Đếm Két 30 Giây (`/giao-ca`)**: Đếm tiền theo từng mệnh giá, đối soát chênh lệch két tự động, in phiếu bàn giao ca.
8. **Báo Cáo 3 Con Số Vàng (`/bao-cao-loi-nhuan`)**: Tiền mặt trong két thực tế, tiền VietQR ngân hàng, lợi nhuận ròng bỏ túi thực sự.
9. **Màn Hình Khách Hàng CFD (`/cfd`)**: Quay ra ngoài cho khách xem đơn, quét mã VietQR thanh toán 1 giây.
10. **Cài Đặt Hệ Thống (`/cai-dat`)**: Kết nối máy in nhiệt IP LAN, két tiền, cấu hình VietQR, tài khoản chi nhánh.

---

## 🚀 4. Hướng Dẫn Khởi Chạy Nhanh (Quick Start)

### 4.1. Khởi động Database:
```bash
docker-compose up -d
```

### 4.2. Khởi động Golang Backend:
```bash
cd backend
go run cmd/server/main.go
# Backend lắng nghe tại: http://localhost:8080
```

### 4.3. Khởi động Frontend Universal (Expo SDK 57):
```bash
cd frontend
npm install
npm run dev
# Mở trình duyệt tại: http://localhost:8085
```

### 4.4. Khởi động Windows Desktop Native (Tauri 2.0):
```bash
cd desktop
npm run tauri dev
```

---

## 🛡️ 5. Bảo Mật Toàn Diện 4 Vành Đai

- **Vành đai 1**: Zero-Source Deployment (Stripped Binary Go `-s -w -trimpath`, Hermes Bytecode `.hbc`).
- **Vành đai 2**: Chống MITM & Ký số Request HMAC-SHA256 (`X-Signature`, `X-Timestamp`, `X-Nonce` TTL 30s).
- **Vành đai 3**: Đóng băng VPS OS, UFW Firewall drop-all, PostgreSQL/Redis cô lập mạng nội bộ.
- **Vành đai 4**: GORM Parameterized Query 100%, Multi-Tenant Isolation, Token Bucket Rate Limiting, Audit Logs & Telegram Alerts.

---

## 📖 6. Tài Liệu Hướng Dẫn & Cổng Thông Tin

- **Cổng Thông Tin Marketing Showroom V2**: [https://ongchu.cloud](https://ongchu.cloud)
- **Web POS Trực Tiếp**: [https://app.ongchu.cloud](https://app.ongchu.cloud)
- **Cẩm nang vận hành chi tiết**: Xem file [HUONG_DAN_SU_DUNG.md](file:///d:/duanpos-ongchu/HUONG_DAN_SU_DUNG.md)
- **Hướng dẫn tạo danh mục (có ảnh chụp trực quan)**: Xem file [docs/HUONG_DAN_TAO_DANH_MUC.md](file:///d:/duanpos-ongchu/docs/HUONG_DAN_TAO_DANH_MUC.md)
- **Quy tắc AI & Kiến trúc bất biến**: Xem file [AGENTS.md](file:///d:/duanpos-ongchu/AGENTS.md) và [GEMINI.md](file:///d:/duanpos-ongchu/GEMINI.md)
- **Kho phát hành công khai**: [https://github.com/nguyenlocthanh796/duangoimon](https://github.com/nguyenlocthanh796/duangoimon)

# 🛡️ QUY CHUẨN BẢO MẬT & PHÒNG THỦ TOÀN DIỆN (SECURITY HARDENING RULES)

Bắt buộc tuân thủ 100% cho mọi nhà phát triển và AI Agent khi viết mã nguồn Backend Golang, Frontend Expo và cấu hình hạ tầng cho dự án `duanpos-ongchu`.

---

## 🚫 1. BẢO VỆ MÃ NGUỒN (ZERO-SOURCE INVARIANT)
1. **Tuyệt đối không lưu code thô trên VPS**: Cấm tạo thư mục chứa `.go`, `.ts`, `.tsx`, `.git` trên máy chủ Production. Chỉ phát hành file nhị phân Go Stripped (`-ldflags="-s -w" -trimpath`) hoặc Docker Image Distroless.
2. **Hermes Bytecode trên Mobile**: Cấu hình `"jsEngine": "hermes"` bắt buộc trong `app.json` để biên dịch JS AOT sang Bytecode `.hbc`.
3. **Cấm rò rỉ Secrets trong mã nguồn**: Cấm hardcode API Keys, Database Password, Telegram Bot Token trong code. Mọi biến nhạy cảm nạp qua `os.Getenv()` và file `.env` được phân quyền `chmod 600`.

---

## 🔒 2. BẢO MẬT ĐƯỜNG TRUYỀN & REQUEST (ANTI-MITM & ANTI-TAMPER)
1. **100% HTTPS & TLS 1.3**: Không có ngoại lệ cho HTTP thông thường trên Internet. Bật HSTS `max-age=31536000`.
2. **Ký số HMAC-SHA256**: Mọi endpoint thanh toán, đổi giá, đóng ca bắt buộc kiểm tra `X-Signature`, `X-Timestamp`, `X-Nonce`. Server từ chối request lệch quá 30 giây hoặc nonce trùng lặp.
3. **WebSocket Security**: Đường dẫn WebSocket `/ws/pos` bắt buộc đi qua giao thức `wss://` và xác thực JWT handshake.

---

## 🏰 3. BẢO VỆ HẠ TẦNG & CSDL (INFRASTRUCTURE ISOLATION)
1. **Cách ly CSDL tuyệt đối**: Cổng PostgreSQL `5432` và Redis `6379` chỉ nằm trong mạng nội bộ Docker (`internal: true`). Nghiêm cấm bind cổng ra `0.0.0.0`.
2. **Khóa cổng SSH**: Tắt mật khẩu SSH (`PasswordAuthentication no`), tắt root SSH, đổi port mặc định sang dải cổng cao (ví dụ `2222`), dùng khóa `ed25519`.
3. **Tường lửa UFW**: Thiết lập mặc định `deny incoming`, chỉ mở cổng 443 và cổng SSH tùy chỉnh.
4. **CẤM TUYỆT ĐỐI DEPLOY DATABASE LÊN VPS (ZERO-DATABASE-DEPLOY INVARIANT)**:
   - CSDL trên VPS (`ongchu_pos.db`, Shard DB `data/tenants/*.db`, PostgreSQL) là dữ liệu thực tế của các quán (stateful production data).
   - NGHIÊM CẤM sao chép, upload, rsync, scp, sftp hoặc ghi đè bất kỳ file database nào (`*.db*`, `*.sqlite*`, `*.db-wal`, `*.db-shm`, `data/`, dump `.sql`) từ máy local/dev lên VPS Production.
   - Thay đổi cấu trúc bảng (schema changes) BẮT BUỘC chỉ được áp dụng tự động qua `GORM AutoMigrate` hoặc script DDL migration an toàn khi khởi chạy binary server, không bao giờ thay thế file database vật lý.
   - 100% scripts triển khai (deployment scripts) BẮT BUỘC cấu hình exclude cứng toàn bộ các file `.db`, `.sqlite`, `.sql`, thư mục `data/` và backup.

---

## ⚡ 4. BẢO MẬT ỨNG DỤNG & CODE BACKEND (APPLICATION DEFENSE)
1. **Cấm Tuyệt Đối Hardcoded PIN / Secrets**: CẤM viết mã PIN mặc định dự phòng (`8888`, `9999`) trong code. Mọi xác thực PIN bắt buộc đối chiếu với `models.User` (Role `owner`/`manager`) trong CSDL.
2. **Bảo Vệ SaaS Admin 100%**: 100% endpoint `/api/v1/saas/*` bắt buộc đi qua `middleware.SaaSAdminAuthMiddleware()`, kiểm tra `X-Admin-Key` hoặc Bearer token qua `crypto/subtle.ConstantTimeCompare`.
3. **Chống Brute-Force PIN & Rate Limiting**: 
   - Áp dụng `RateLimiterMiddleware(30, time.Second)` cho toàn bộ API POS.
   - Áp dụng `PinBruteForceMiddleware(5, 2*time.Minute)` khóa tạm 2 phút nếu nhập sai quá 5 lần trên các endpoint `/auth/verify-pin` và `/public/staff-pin`.
4. **Chống SSRF Trên Raw TCP Sockets**: Mọi lệnh kết nối TCP Socket máy in (`net.DialTimeout`) bắt buộc kiểm tra IP qua `isSafePrinterIP()`, chặn Cloud Metadata `169.254.169.254`, hostname lạ và multicast.
5. **Bảo Vệ Webhook Ngân Hàng**: Đọc `WEBHOOK_SECRET` từ env, so sánh constant-time, vô hiệu hóa hoàn toàn endpoint `/webhook/simulate-bank-transfer` ở chế độ Production (`ReleaseMode`).
6. **Zero SQL Injection**: 100% truy vấn CSDL qua GORM Parameterized Query hoặc Prepared Statement. Cấm ghép chuỗi câu lệnh SQL (`fmt.Sprintf("SELECT ... %s")`).
7. **Audit Log Bất Biến & Telegram Alert**: Mọi thao tác rủi ro (Hủy món sau khi gửi bếp/in tạm tính, Giảm giá > 20%, Mở két tiền thủ công) bắt buộc ghi `audit_logs` và kích hoạt Goroutine gửi cảnh báo Telegram tức thì về máy Chủ Quán.

---

## 🌐 5. BẢO MẬT MẠNG NỘI BỘ & NGOẠI TUYẾN (LAN & OFFLINE RESILIENCE)
1. **Tách Biệt VLAN Mạng Quán**: Bật AP Isolation / tách riêng VLAN Wi-Fi Khách và VLAN Thiết Bị POS (Máy in, KDS, Thu ngân). Khách dùng Wi-Fi quán không được phép truy cập cổng TCP 9100 của máy in.
2. **Chuỗi Hash Toàn Vẹn Đơn Hàng Ngoại Tuyến (Offline Hash Chain)**: Đơn hàng lưu tạm khi mất mạng bắt buộc tính toán `Hash[N] = SHA256(Order[N] + Hash[N-1])`. Khi online, server phát hiện ngay hành vi cố tình xóa đơn hàng ở giữa nếu chuỗi hash bị đứt gãy.
3. **Mã Hóa CSDL Offline**: CSDL SQLite cục bộ trên thiết bị POS được mã hóa bằng AES-256 (SQLCipher), khóa lưu trữ an toàn trong iOS Keychain / Android Keystore.

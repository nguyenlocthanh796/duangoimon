# BÁO CÁO TỔNG HỢP ĐIỀU TRA AN NINH TOÀN DIỆN
# ONGCHU LEAN POS — SECURITY INTELLIGENCE REPORT
> **Ngày thực hiện:** 23/09/2026 | **Phiên bản:** 1.0.0 | **Phạm vi:** 100% Repository, Backend Go, Frontend Expo, Desktop Tauri, Docker & CSDL

---

## 1. TỔNG QUAN HIỆN TRẠNG (EXECUTIVE SUMMARY)

Dự án **OngChu Lean POS** là một hệ thống POS F&B thực chiến có kiến trúc tinh gọn, hiệu năng rất cao (< 50ms cho hầu hết các tác vụ POS/KDS), giao diện tối ưu hóa công thái học xuất sắc trên Expo SDK 57 và backend Golang 1.22.6 siêu nhẹ.

Tuy nhiên, qua quá trình điều tra mã nguồn chuyên sâu trên toàn bộ 22 miền an ninh kỹ thuật, **hệ thống hiện tồn tại các điểm nghẽn an ninh trọng yếu (Security Blockers)** cần được khắc phục trước khi triển khai mở rộng SaaS quy mô lớn.

---

## 2. BẢNG THỐNG KÊ PHÁT HIỆN AN NINH (FINDINGS SUMMARY)

| Mức Độ | Số Lượng | Các Phát Hiện Trọng Tâm |
|---|---|---|
| **CRITICAL** | **5** | 1. Thiếu xác thực mã hóa Token trên 50+ route nghiệp vụ (`/api/v1/*`).<br>2. Hardcoded SuperAdmin & Mã PIN Quản lý `8888`/`9999` bypass DB check.<br>3. Endpoint `RestoreBackup` cho phép xóa sạch menu/bàn ăn của bất kỳ tenant nào.<br>4. WebSocket không xác thực handshake & rò rỉ giao dịch ngân hàng toàn hệ thống.<br>5. Cổng PostgreSQL 5432 & Redis 6379 bind công khai `0.0.0.0` với mật khẩu mặc định. |
| **HIGH** | **5** | 1. SSRF & Port Scanning qua socket TCP máy in nhiệt `POST /api/v1/printer/print-receipt`.<br>2. `CheckPasswordHash` chấp nhận so khớp trực tiếp mật khẩu plaintext.<br>3. Lưu trữ secret mặc định & chứng chỉ iOS P12 trong git repository.<br>4. Tauri Desktop vô hiệu hóa CSP & expose lệnh IPC mở két tiền tự do.<br>5. Lưu trữ token phiên dưới dạng unencrypted AsyncStorage trên client. |
| **MEDIUM** | **4** | 1. Webhook ngân hàng thiếu cơ chế chống Replay Attack.<br>2. Chưa có giới hạn tài nguyên CPU/RAM trong Docker Compose.<br>3. CORS fallback trả về `true` cho mọi origin.<br>4. Client-side price tampering khi sync đơn ngoại tuyến. |
| **LOW** | **2** | 1. Thiếu JSON structured logging tới hệ thống SIEM tập trung.<br>2. Chưa cấu hình cờ `FLAG_SECURE` chống chụp màn hình trên Android. |

---

## 3. DANH MỤC HỒ SƠ AN NINH ĐÃ THIẾT LẬP (DOCUMENTATION INVENTORY)

Toàn bộ 23 hồ sơ điều tra chi tiết đã được tạo đầy đủ tại thư mục `security/`:

1. `security/00-project-inventory.md` — Toàn bộ cấu trúc thư mục, phiên bản package, framework.
2. `security/01-architecture-map.md` — Sơ đồ kiến trúc luồng dữ liệu Client -> Edge -> Engine -> DB/Hardware.
3. `security/02-api-inventory.md` — Danh mục chi tiết 70+ endpoints kèm quyền hạn và kiểm soát an ninh.
4. `security/03-authentication.md` — Kiểm tra cơ chế đăng nhập, tạo token, bcrypt, và password hashing.
5. `security/04-authorization-rbac.md` — Ma trận phân quyền RBAC và phân tích lỗ hổng BOLA/IDOR.
6. `security/05-tenant-branch-isolation.md` — Kiểm tra phân lập đa người thuê (Multi-Tenancy) và Sharding.
7. `security/06-database-security.md` — Kiểm tra GORM, Parameterized queries, SQLite WAL và kết nối DB.
8. `security/07-offline-sync.md` — Đánh giá cơ chế Idempotency, reconcilation ca làm việc và trừ kho BOM.
9. `security/08-websocket-security.md` — Kiểm tra handshake, Origin CORS, và phân phối bản tin realtime.
10. `security/09-payment-security.md` — Đánh giá tính toàn vẹn VietQR, Webhook và bảo vệ tài khoản ngân hàng.
11. `security/10-hardware-security.md` — Phân tích socket TCP 9100, lệnh kích két RJ11, và kiểm soát SSRF IP.
12. `security/11-mobile-security.md` — Đánh giá Expo SDK 57, Hermes bytecode, AsyncStorage, và SSL Pinning.
13. `security/12-tauri-security.md` — Kiểm tra Tauri 2.0 Rust IPC, Webview CSP, và quyền mở két tiền.
14. `security/13-infrastructure.md` — Đánh giá cấu hình Nginx, SSL/TLS Let's Encrypt, và tường lửa VPS.
15. `security/14-docker-security.md` — Đánh giá cấu hình `docker-compose.yml`, port binding và cấp quyền container.
16. `security/15-dependencies.md` — Kiểm tra chuỗi cung ứng mã nguồn Go, npm, và Rust crates.
17. `security/16-secrets-audit.md` — Bảng kiểm kê toàn bộ secrets, keys, credentials trong codebase (REDACTED).
18. `security/17-logging-audit.md` — Đánh giá bảng `audit_logs` và Goroutine Telegram Anti-Fraud.
19. `security/18-test-inventory.md` — Thống kê các test suites hiện có và các kịch bản kiểm thử còn thiếu.
20. `security/19-attack-surface.md` — Bản đồ bề mặt tấn công từ ngoài Internet, nội bộ nhân viên, và phần cứng.
21. `security/20-crown-jewels.md` — Danh mục các tài sản nghiệp vụ tối thượng cần ưu tiên bảo vệ (P0/P1).
22. `security/21-findings.md` — Sổ đăng ký chi tiết các phát hiện an ninh (Critical/High/Medium/Low).
23. `security/22-unknowns.md` — Các vùng dữ liệu/hạ tầng chưa thể xác minh từ local và cần kiểm tra trên VPS thật.

# 18 — TEST INVENTORY & GAP ANALYSIS

## 1. Backend Automated Tests Inventory

| Test Suite File | Phạm Vi Nghiệp Vụ | Kiểm Tra An Ninh / Ràng Buộc |
|---|---|---|
| `backend/internal/testsuite/closed_loop_e2e_test.go` | Vòng đời đơn hàng POS -> KDS -> Thanh toán | Kiểm tra tính toán tiền, giảm giá, đổi trạng thái bàn |
| `backend/internal/testsuite/scenario1_kds_test.go` | Trạm bếp KDS, cập nhật trạng thái món | Đồng bộ trạng thái món ăn giữa các station |
| `backend/internal/testsuite/scenario2_bom_test.go` | Định lượng nguyên liệu và trừ kho | Tính đúng trừ tồn kho khi thanh toán |
| `backend/internal/testsuite/scenario3_payment_test.go` | Thanh toán VietQR và tiền mặt | Tính tiền thối và cập nhật doanh thu |
| `backend/internal/testsuite/scenario4_shift_test.go` | Quản lý ca làm việc và két tiền | Tính lệch tiền giao ca và cảnh báo |
| `backend/internal/testsuite/scenario5_security_test.go` | Kiểm tra brute force PIN, Master key | Rate limiter và xác thực Admin key |
| `backend/internal/testsuite/scenario6_offline_test.go` | Đồng bộ đơn ngoại tuyến | Idempotency của `client_order_id` |
| `backend/internal/testsuite/scenario12_tenant_quota_middleware_test.go` | Giới hạn thiết bị và hạn sử dụng tenant | Phân lập tenant và quota kiểm soát |
| `backend/internal/handler/printer_test.go` | Bộ sinh byte ESC/POS & SSRF IP check | Hàm `isSafePrinterIP` |
| `backend/internal/database/sqlite_concurrency_test.go` | Concurrency stress test SQLite WAL | Khả năng chịu tải đồng thời ghi dữ liệu |

---

## 2. Frontend Automated Tests Inventory

- Có hơn 60 file test trong `frontend/tests/` bao quát:
  - `adversarial_discount_guard.test.ts`: Ràng buộc chiết khấu và cảnh báo vượt ngưỡng.
  - `auth_branch_staff_passcode_security.test.ts`: Kiểm tra chu trình mã PIN nhân viên.
  - `multi_tenant_isolation.test.ts`: Kiểm tra phân lập tenant trên Zustand store.
  - `mb_soundbox_vietqr.test.ts`: Kiểm tra sinh mã VietQR và tích hợp Soundbox.

---

## 3. Security Test Gaps (Các Kiểm Thử Còn Thiếu)

1. **Missing JWT Tamper Tests**: Chưa có bài test kiểm tra việc gửi token giả mạo `jwt_token_fake` vào các endpoint `/api/v1/orders`.
2. **Missing Cross-Tenant WebSocket Injection Test**: Chưa có test tự động kiểm tra việc client A gửi event mạo danh sang client B qua WebSocket.
3. **Missing SSRF Dialing Integration Test**: Chưa có test kiểm tra việc chặn gửi payload tới port nội bộ `127.0.0.1:6379`.
4. **Missing RestoreBackup Permission Test**: Chưa có test tự động chặn việc gọi `POST /api/v1/backup/restore` trái phép.

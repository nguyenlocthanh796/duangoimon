# ONGCHU LEAN POS — ANTIGRAVITY SECURITY RULES

## Vai trò của Agent

Antigravity là coding agent hỗ trợ dự án. Agent KHÔNG được tự kết luận hệ thống an toàn chỉ dựa trên code review.

Mọi claim như "fixed", "secure", "production-ready", "PASS" phải có verification evidence.

## 1. Trước khi sửa code

Agent MUST:
- Đọc architecture, API routes, auth middleware, DB models, WebSocket hub, sync logic, payment flow, printer/drawer service, Docker, Nginx và CI.
- Tìm tất cả nơi xử lý tenant_id, branch_id, user_id, role, permission, order_id, invoice_id, payment_id, device_id.
- Tìm tất cả SQL Raw/Exec/dynamic query.
- Tìm tất cả nơi lưu token/secret.
- Tìm tất cả endpoint mở két, print raw ESC/POS, payment confirmation, refund, invoice void, stock adjustment.
- Tạo threat model trước khi sửa P0.

## 2. Quy tắc không được vi phạm

Agent MUST NOT:
- Trust tenant_id/branch_id/role/price/paid status từ client.
- Bypass authorization để "cho test nhanh".
- Commit secret thật.
- Đặt secret vào source code, APK, PWA bundle, Tauri binary hoặc Docker image.
- Public PostgreSQL/Redis/9100.
- Cho arbitrary ESC/POS command từ client xuống hardware.
- Cho client tự xác nhận payment thành paid.
- Disable TLS/CORS/auth/rate limit chỉ để làm feature chạy được.
- Xóa test đang fail thay vì sửa nguyên nhân.
- Dùng mock để tuyên bố production behavior đã được xác minh.

## 3. Quy trình bắt buộc cho mỗi task bảo mật

### Step A — Inspect
Trả ra:
- Files inspected
- Routes inspected
- Models inspected
- Threats found
- Current test coverage

### Step B — Plan
Tạo plan theo:
- Root cause
- Security impact
- Minimal safe fix
- Regression tests
- Verification commands

### Step C — Implement
Ưu tiên:
1. Server-side authorization
2. Data integrity
3. Auditability
4. Tests
5. Observability
6. Performance optimization

### Step D — Verify
Agent MUST run:
- Unit tests
- Integration tests
- Security regression tests
- Build
- Lint/typecheck

### Step E — Evidence
Không được nói "PASS" nếu không có:
- command
- result
- expected
- actual

## 4. Agent Output Format

Mỗi security audit & task kết thúc bằng đúng cấu trúc:

```text
P0 OPEN:
P1 OPEN:
P0 VERIFIED:
P1 VERIFIED:
BLOCKED:
RELEASE GATE: PASS / FAIL / BLOCKED
```

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
- Dependency scan nếu task liên quan dependency
- Container scan nếu task liên quan image/container

### Step E — Evidence

Không được nói "PASS" nếu không có:
- command
- result
- expected
- actual

## 4. Security Regression Test Rules

Mỗi lỗi bảo mật đã sửa phải có test tái hiện lỗi trước khi fix hoặc test regression tương đương sau khi fix.

Ví dụ tenant isolation:

```text
Given user belongs to Tenant A / Branch 1
When user requests object belonging to Tenant B
Then API returns 403 or 404 according to policy
And no Tenant B data is returned
And an authorization failure is auditable
```

Ví dụ cash drawer:

```text
Given cashier lacks DRAWER_OPEN permission
When cashier requests drawer open
Then request is rejected
And no ESC/POS open-drawer command is emitted
And audit event is created if policy requires
```

Ví dụ payment:

```text
Given invoice amount = X
When client submits paid=true or amount=Y
Then server ignores the forged fields
And payment can become PAID only after server-side verification
```

## 5. Agent Output Format

Mỗi security task kết thúc bằng đúng cấu trúc:

```text
SECURITY TASK RESULT

Scope:
Root cause:
Files changed:
Tests added:
Tests executed:
Security checks executed:
Evidence:
Remaining risks:
Release impact: PASS / FAIL / BLOCKED
```

## 6. Không tự ý mở rộng scope

Nếu phát hiện lỗi ngoài task:
- Không âm thầm refactor toàn hệ thống.
- Ghi vào `security/findings.md`.
- Gán severity P0/P1/P2/P3.
- Cho biết exploit path và affected component.
- Chỉ sửa ngay nếu lỗi có thể tạo critical security regression cho task đang làm.

## 7. Definition of Done cho Security

Một security task chỉ DONE khi:

- Root cause được xác định.
- Fix đã implement.
- Regression test đã thêm.
- Existing tests vẫn PASS.
- Security test PASS.
- Không có secret mới trong diff.
- Logs không lộ sensitive data.
- Evidence đã lưu.
- Không còn known blocker liên quan task.

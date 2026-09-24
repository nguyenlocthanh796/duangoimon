# 🔐 AUTHENTICATION & ACCESS CONTROL TESTS

## 1. Test Matrix

| Test ID | Scenario | Input / Vector | Expected | Actual Evidence | Status |
|---|---|---|---|---|---|
| **AUTH-01** | Anonymous Request to Protected API | `GET /api/v1/owner/pnl-summary` without Token / Tenant | `404 Not Found` or `401 Unauthorized` | Status 404 / 401 | **PASS** |
| **AUTH-02** | Wrong Password Authentication | `POST /api/v1/public/login` with `password="wrong_pass"` | `401 Unauthorized` ("Mật khẩu tài khoản không chính xác") | Status 401 | **PASS** |
| **AUTH-03** | Valid Tenant A Token vs Tenant B Data | `GET /api/v1/tables` with `X-Tenant-ID: tenant_B` | `404 Not Found` (Zero records returned) | Status 404 / Count = 0 | **PASS** |
| **AUTH-04** | SaaS Master Endpoint Protection | `GET /api/v1/saas/overview` without `X-Admin-Key` | `401 Unauthorized` | Code 401 | **PASS** |
| **AUTH-05** | PIN Brute-Force Rate Limiting | 4 consecutive failed attempts to `/api/v1/auth/verify-pin` | `429 Too Many Requests` | Code 429 | **PASS** |

## 2. Test Execution Command
```bash
go test -v ./internal/handler -run "TestSaaSAdminAuthMiddleware|TestPinBruteForceProtection|TestVerifyPin"
```

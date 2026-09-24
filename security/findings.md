# 🔍 SECURITY FINDINGS LEDGER — ONGCHU LEAN POS

## Finding SEC-001 (P0) — Insecure Hardcoded Password Fallback in SaaS Login
- **ID**: SEC-001
- **Severity**: P0
- **Component**: `backend/internal/handler/auth.go`
- **Attack path**: Attacker supplies any password in `validPasswords` ("123456", "admin123", "demo123", "Danh@!26062002") to log into any tenant account without the owner's actual password.
- **Precondition**: Production backend running with `validPasswords` map.
- **Root cause**: Hardcoded fallback map used during early development was left in production authentication handler.
- **Impact**: Complete account takeover across all SaaS tenants.
- **Fix recommendation**: Remove `validPasswords` map from production flow; enforce `bcrypt.CompareHashAndPassword` (Cost 12) via `CheckPasswordHash()`.
- **Regression test**: `TestVerifyPin`, `TestSaaSLogin` and `scripts/test_security_audit_suite.py`.
- **Status**: **VERIFIED**

---

## Finding SEC-002 (P1) — Plaintext Password Storage on Tenant Registration
- **ID**: SEC-002
- **Severity**: P1
- **Component**: `backend/internal/handler/auth.go` -> `RegisterTenant()`
- **Attack path**: If database is dumped, passwords of new tenants are exposed in plaintext.
- **Precondition**: New tenant registered via `POST /api/v1/public/register`.
- **Root cause**: Password was directly assigned to `models.User.PasswordHash` without hashing.
- **Impact**: Credential leakage if database read access is compromised.
- **Fix recommendation**: Hash password using `HashPassword(cleanPassword)` (Bcrypt Cost 12) before persisting.
- **Regression test**: `auth.go` unit tests & automated sync audit.
- **Status**: **VERIFIED**

---

## Finding SEC-003 (P1) — Missing Tenant Normalization for Custom Tenant in WebSocket Hub
- **ID**: SEC-003
- **Severity**: P1
- **Component**: `backend/internal/websocket/hub.go` -> `CanonicalTenantID()`
- **Attack path**: WebSocket broadcast for tenant alias `quanchebuoiangiang` vs canonical ID `tenant_87fb90f7` failed to align, leading to dropped messages or fallback.
- **Precondition**: Store client connecting with alias subdomain.
- **Root cause**: Alias list in `hub.go` did not include newest production tenant mapping.
- **Impact**: Realtime KDS/CFD sync failure or cross-channel event drop.
- **Fix recommendation**: Synchronize `CanonicalTenantID()` in `hub.go` with `common.go`.
- **Regression test**: `test_deep_sync_audit.py` & WebSocket room isolation test.
- **Status**: **VERIFIED**

---

## Finding SEC-004 (P0) — SSRF & Cloud Metadata Access via Printer TCP Socket
- **ID**: SEC-004
- **Severity**: P0
- **Component**: `backend/internal/handler/printer.go`
- **Attack path**: Attacker sends `printer_ip: "169.254.169.254"` to query AWS/GCP metadata credentials or internal services.
- **Precondition**: Public access to printer endpoints.
- **Root cause**: Direct `net.DialTimeout` without IP format and Link-Local/Multicast validation.
- **Impact**: Cloud IAM credential extraction and internal network port scanning.
- **Fix recommendation**: Enforce `isSafePrinterIP()` blocking non-IP hostnames, `IsLinkLocalUnicast`, `IsLinkLocalMulticast`, and loopback abuse.
- **Regression test**: `TestSSRFPrinterProtection` in `security_test.go`.
- **Status**: **VERIFIED**

---

## Finding SEC-005 (P0) — Unauthorized Bank Webhook Balance Injection
- **ID**: SEC-005
- **Severity**: P0
- **Component**: `backend/internal/handler/webhook.go`
- **Attack path**: Attacker sends fake `POST /api/v1/webhook/bank-transfer` to mark unpaid orders as paid.
- **Precondition**: Attacker discovers webhook endpoint.
- **Root cause**: Missing or weak constant-time token comparison on incoming webhook requests.
- **Impact**: Free orders / fraudulent checkout without real bank transfers.
- **Fix recommendation**: Verify `X-Webhook-Token` / `Authorization` against `WEBHOOK_SECRET` using `subtle.ConstantTimeCompare`.
- **Regression test**: `TestWebhookSecurity` in `security_test.go`.
- **Status**: **VERIFIED**

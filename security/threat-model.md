# 🛡️ ONGCHU LEAN POS — THREAT MODEL

## 1. System Overview & Trust Boundaries

```
[ UNTRUSTED CLIENTS ]
  - Android APK (Hermes bytecode)
  - iOS Native App
  - Web PWA (React 19)
  - Tauri Desktop (.exe)
  - Raw TCP 9100 / Hardware clients
        │ (HTTPS / WSS / TLS 1.3)
        ▼
[ NETWORK BOUNDARY / REVERSE PROXY ]
  - Let's Encrypt TLS 1.3
  - Nginx 1.24 (Port 443 only)
  - UFW Firewall (Drop all except 443 & SSH)
        │
        ▼
[ APPLICATION SERVER (AUTHORITY) ]
  - Golang 1.22+ Gin Web Engine
  - Rate Limiting Token Bucket & Brute-force Shield
  - Multi-Tenant & RBAC Middleware
  - Goroutine Telegram Fraud Alert Bot
        │
   ┌────┴──────────────────────────┐
   ▼                               ▼
[ ISOLATED DATA TIER ]     [ HARDWARE SOCKETS ]
  - PostgreSQL 16 (127.0.0.1) - Raw TCP 9100 ESC/POS
  - Redis 7 (127.0.0.1)        - RJ11 Cash Drawer Kick (24V)
  - SQLite WAL (Local)
```

## 2. Attack Vectors & Threat Scenarios

### T1: Authentication & Token Manipulation
- **Threat**: Forging JWT or using static/mock tokens to access SaaS master portal or merchant accounts.
- **Mitigation**: Bcrypt (Cost 12) for passwords; `subtle.ConstantTimeCompare` for master keys; no hardcoded passwords in production.

### T2: Multi-Tenant Data Bleeding (BOLA / IDOR)
- **Threat**: Tenant A sends `X-Tenant-ID: tenant_B` or modifies URL query `?tenant_id=tenant_B` to read/modify orders, menu, or cash transactions of Tenant B.
- **Mitigation**: `ScopeTenant()` and `GetTenantID()` enforced on all database queries using Parameterized Queries.

### T3: Financial Logic Manipulation & Fraud
- **Threat**: Client sends negative price (`unit_price: -100000`), negative quantity, fake discount > 20%, or self-declares order as `paid=true`.
- **Mitigation**: Server-side price calculation, strict bounds checking (`qty > 0`, `totalAmount >= 0`), manager PIN verification with audit logging and Telegram Goroutine alerts on void/discount.

### T4: Hardware & Cash Drawer Abuse
- **Threat**: Cashier triggers drawer kick anonymously without an order, or attacker sends arbitrary SSRF payloads via printer IP (`169.254.169.254`).
- **Mitigation**: `isSafePrinterIP` blocks SSRF / cloud metadata; all manual drawer kicks trigger Telegram alerts and audit log events.

### T5: Realtime & Webhook Spoofing
- **Threat**: Fake bank transfer webhook submissions to falsely mark orders as paid; cross-tenant WebSocket message interception.
- **Mitigation**: Webhook HMAC/Token constant-time verification; `BroadcastToTenantBranch` and `CanonicalTenantID` isolation in WebSocket Hub.

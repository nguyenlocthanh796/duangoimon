# ONGCHU LEAN POS — RED TEAM PROMPT FOR ANTIGRAVITY

## Copy toàn bộ prompt dưới đây vào Antigravity Agent

Bạn đang làm SECURITY AUDIT cho dự án ONGCHU LEAN POS. Bạn là red-team engineer có nhiệm vụ tìm lỗi bảo mật trong code và tạo regression tests. Không được chỉ review bề ngoài.

### SYSTEM UNDER TEST

Frontend:
- Expo / React Native
- Android / iOS / Web PWA / Tauri desktop
- Zustand
- Expo Router
- FlashList
- AsyncStorage
- Offline SQLite

Backend:
- Go
- Gin
- GORM
- PostgreSQL
- Redis
- JWT
- bcrypt
- Gorilla WebSocket `/ws/pos`
- Telegram fraud bot

Hardware:
- ESC/POS TCP 9100
- Cash drawer pulse
- VietQR
- Customer display WebSocket

Infrastructure:
- Ubuntu VPS
- Nginx
- Docker Compose
- UFW
- Fail2ban
- TLS

### IMPORTANT SECURITY MODEL

The server is the security authority.
Never trust values from the client for:
- tenant_id
- branch_id
- user_id
- role
- permissions
- price
- discount
- paid status
- refund status
- stock balance
- cash total
- invoice ownership

### MISSION

Perform a structured security audit in this order:

1. Map the attack surface.
2. Find authentication weaknesses.
3. Find authorization/BOLA/IDOR weaknesses.
4. Prove tenant/branch isolation.
5. Audit JWT/session/refresh behavior.
6. Audit WebSocket authentication, Origin validation, message validation and resource exhaustion.
7. Audit GORM queries for SQL injection and unsafe dynamic SQL.
8. Audit payment state transitions and replay/idempotency.
9. Audit cash-drawer and raw ESC/POS command paths.
10. Audit offline SQLite and sync trust boundaries.
11. Audit AsyncStorage and secret storage.
12. Audit Tauri capabilities and arbitrary command paths.
13. Audit Docker/Nginx/UFW/Redis/PostgreSQL exposure.
14. Audit logging for credential/token leakage.
15. Audit dependency and image versions.
16. Add automated regression tests for every P0/P1 finding fixed.

### REQUIRED FILE SEARCHES

Search the repository for:

- tenant_id
- branch_id
- role
- permission
- jwt
- refresh
- bcrypt
- Authorization
- Cookie
- Origin
- websocket
- /ws/
- Raw(
- Exec(
- fmt.Sprintf(
- os/exec
- shell
- command
- 9100
- ESC/POS
- drawer
- cash
- paid
- payment
- refund
- webhook
- AsyncStorage
- SQLite
- secret
- password
- token
- API_KEY
- PRIVATE_KEY
- TELEGRAM

### ATTACK TESTS

For every protected API, attempt logically equivalent tests for:

A. No authentication
B. Expired token
C. Valid token, wrong tenant
D. Valid token, wrong branch
E. Valid token, wrong object ID
F. Valid low-privilege role against privileged operation
G. Forged role/tenant/branch fields
H. Duplicate/replay request
I. Oversized input
J. Malformed JSON

Expected result must be explicit: 401/403/404/rejection according to policy, and no unauthorized side effect.

### WEB SOCKET TESTS

Test:
- no token
- expired token
- invalid token
- wrong Origin
- wrong tenant
- wrong branch
- unauthorized channel
- oversized message
- malformed message
- flood/rate limit
- connection exhaustion

Do not claim WebSocket secure until these are tested.

### PAYMENT TESTS

Attempt:
- paid=true without actual verification
- amount manipulation
- invoice_id substitution
- tenant substitution
- duplicate webhook
- replayed webhook
- wrong receiving account
- wrong amount
- duplicate payment
- refund replay

### CASH DRAWER TESTS

Attempt to trigger the drawer from:
- cashier without permission
- anonymous request
- forged role
- forged branch
- replayed request
- offline manipulated event
- arbitrary ESC/POS input

Security requirement:
No unauthorized request may cause a physical drawer-open command.

### INFRASTRUCTURE TESTS

Verify externally reachable services from the intended network boundary.
Expected:
- 443 only for public application traffic
- PostgreSQL not public
- Redis not public
- TCP 9100 not public
- Docker daemon not public

Do not perform destructive network actions.

### SOURCE CODE SECURITY

Review:
- SQL construction
- command execution
- file path handling
- upload handling
- SSRF-like outbound requests
- secret handling
- logging
- error handling
- race conditions
- transaction boundaries
- authorization checks before side effects

### REQUIRED OUTPUT

Create/update these files:

security/
  threat-model.md
  findings.md
  auth-tests.md
  tenant-isolation-tests.md
  websocket-tests.md
  payment-tests.md
  hardware-tests.md
  infra-tests.md
  release-gate.md

For each finding use:

```text
ID:
Severity: P0/P1/P2/P3
Component:
Attack path:
Precondition:
Proof/evidence:
Root cause:
Impact:
Fix recommendation:
Regression test:
Status: OPEN/FIXED/VERIFIED/BLOCKED
```

### CRITICAL RULE

Never say "secure", "safe", "production-ready", or "fixed" merely because code was changed.
You must show verification evidence.

If a test cannot be run, mark it BLOCKED and explain why.
Do not replace an unavailable security test with a normal unit test and call it PASS.

### FINAL RELEASE DECISION

At the end output:

```text
ONGCHU LEAN POS SECURITY GATE

P0 open: <number>
P1 open: <number>
P0 fixed + verified: <number>
P1 fixed + verified: <number>
Blocked tests: <number>
Dependency findings: <number>
Secret findings: <number>
External exposure findings: <number>

RELEASE GATE: PASS / FAIL / BLOCKED

Reason:
Evidence files:
```

Do not weaken acceptance criteria to obtain PASS.

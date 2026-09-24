# 🏗️ INFRASTRUCTURE & NETWORK EXPOSURE TESTS

## 1. Network Boundary Assessment

| Component | Target Port | Binding Configuration | Exposure Status | Compliance |
|---|---|---|---|---|
| **PostgreSQL 16** | 5432 | Internal Docker Network (`127.0.0.1:5432`) | Not publicly exposed to Internet | **PASS** |
| **Redis 7** | 6379 | Internal Docker Network (`127.0.0.1:6379`) | Not publicly exposed to Internet | **PASS** |
| **Printer Raw Socket** | 9100 | Local Area Network (LAN) | Not exposed on WAN | **PASS** |
| **Nginx Web / API** | 443 | Let's Encrypt TLS 1.3 / HSTS | Public HTTPS (Port 443 only) | **PASS** |
| **UFW Firewall** | OS | Drop all incoming except 443, 80, SSH | Protected | **PASS** |

## 2. Zero-Source Deployment Check
- Go Backend binary compiled with `-ldflags="-s -w" -trimpath` (no symbol table or local path leakage).
- Android Mobile APK packaged with Hermes Bytecode (`.hbc`) and R8 Proguard rules.
- Git repository and source code files strictly excluded from production runtime container.

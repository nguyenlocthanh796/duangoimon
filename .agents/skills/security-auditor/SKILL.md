---
name: security-auditor
description: Multi-tool security audit skill — runs bandit (SAST), semgrep (pattern analysis), safety (dependency CVEs), zaproxy (OWASP ZAP DAST), and npm audit to systematically discover vulnerabilities in FastAPI/Python/Node projects.
---

# 🛡️ Security Auditor Skill

## Overview
Automated multi-layer security scanning for FastAPI + React projects. Combines **SAST + DAST + Dependency + Browser** testing.

## Quick Start

```bash
# Full scan
python scripts/run.py

# SAST only
python scripts/run.py --sast

# Dependencies only
python scripts/run.py --deps
```

## Tools Used

| Tool | Type | Scope | Install |
|------|------|-------|---------|
| **bandit** | SAST (Static Analysis) | Python — hardcoded secrets, SQLi, eval() | `pip install bandit` ✅ |
| **semgrep** | SAST + Pattern | Python/JS — OWASP Top 10 | `pip install semgrep` ✅ |
| **safety** | Dependency scan | Python packages — known CVEs | `pip install safety` ✅ |
| **zaproxy** | DAST (Dynamic) | Live API — OWASP full scan | `pip install zaproxy` ❌ (cần ZAP GUI) |
| **npm audit** | Dependency scan | Frontend — npm packages | `npm audit` (có sẵn) |

## Attack Categories

1. **Reconnaissance** — hidden endpoints, OpenAPI, common paths
2. **Authentication** — SQLi login, NoSQLi, brute force, JWT alg=none
3. **Authorization** — RBAC bypass, IDOR, privilege escalation
4. **Injection** — SQL, NoSQL, Command, CSV formula, XSS
5. **Business Logic** — tax fraud, double payment, state machine
6. **Network** — CORS, CSRF, SSRF, WebSocket auth, path traversal
7. **Crypto** — JWT weakness, weak password hashing
8. **Config** — default creds, debug mode, CORS wildcard
9. **Dependencies** — known CVEs, outdated packages

## From GitHub: More Security Tools to Consider

| Repo | ⭐ | Use Case |
|------|-----|----------|
| [sudo-secxyz/OpenVulnScan](https://github.com/sudo-secxyz/OpenVulnScan) | 34 | FastAPI-based NMAP+CVE scanner — scan network layer |
| [MaxwellCalkin/sentinel-ai](https://github.com/MaxwellCalkin/sentinel-ai) | 19 | AI guardrails: prompt injection, PII detection |

## Result Analysis
- Bandit: HIGH/CONFIDENCE issues are real vulns
- Semgrep: Focus on OWASP top 10 rules
- Safety: Any CVE with score > 7.0 is critical

## Related Skills

| Skill | Why |
|-------|-----|
| [9router](../9router/SKILL.md) | Có thể dùng AI models để phân tích kết quả scan |
| [subagent-orchestrator](../subagent-orchestrator/SKILL.md) | Có thể spawn subagents để pentest chuyên sâu |
| [team-work](../team-work/SKILL.md) | Có thể tích hợp security scan vào pipeline |

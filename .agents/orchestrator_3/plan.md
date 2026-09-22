# Orchestration Plan — orchestrator_3

## Objective
Detect and eliminate 100% hardcoded mock data, sample seed constants, and dummy fallbacks across Frontend (Expo SDK 57 / React Native) and Backend (Golang Gin / GORM) of OngChu Lean POS.
Enable dynamic fetching and persistence with real DB (PostgreSQL 16 / SQLite sharding).
Ensure tenant 0392387165 and saas_admin nguyenlocthanh291097 live data are not obscured or overwritten.
Run full verification (tsc, tests, review, audit) and deploy to VPS via python scripts/deploy_frontend.py.

## Strategy & Phasing
1. **Survey (Phase 0)**:
   - Spawn 3 Explorers in parallel:
     - Explorer 1: Frontend deep scan for mock arrays, sample products, dummy orders, fallback shifts, mock customers across app/ and lib/.
     - Explorer 2: Backend deep scan for mock seeds, hardcoded sample responses, in-memory dummy stores, seed constants in cmd/, internal/.
     - Explorer 3: Data flow & Tenant integration check: how tenant 0392387165 and saas_admin nguyenlocthanh291097 authenticate, how DB stores their data, and scripts/deploy_frontend.py prerequisites.
2. **Decompose & Plan (Phase 1)**:
   - Synthesize findings into PROJECT.md with Feature Inventory, Milestones, and Interface Contracts.
3. **Execution (Phase 2 & 3)**:
   - Execute milestones via Worker with strict integrity warning.
   - Independent verification by Reviewers and Challengers.
   - Forensic integrity audit by Auditor.
4. **Verification & Deployment (Phase 4 & 5)**:
   - Worker runs typecheck (npx tsc --noEmit), tests (npx ts-node tests/run_all_tests.ts), and python scripts/deploy_frontend.py.
   - Report final completion to Sentinel.

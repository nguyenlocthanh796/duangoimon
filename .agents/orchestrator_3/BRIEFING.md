# BRIEFING — 2026-09-22T02:06:30Z

## Mission
Eliminate 100% mock/seed hardcoded data in OngChu Lean POS frontend (Expo SDK 57) and backend (Golang Gin/GORM), switch to dynamic real DB (PostgreSQL 16 / SQLite sharding) without blocking tenant 0392387165 & saas_admin nguyenlocthanh291097, verify tests, and deploy via python scripts/deploy_frontend.py.

## 🔒 My Identity
- Archetype: Project Orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: d:/duanpos-ongchu/.agents/orchestrator_3
- Original parent: Sentinel
- Original parent conversation ID: 8d79a817-0ba6-420f-bf0e-6316997cd47e

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: d:/duanpos-ongchu/PROJECT.md
1. **Decompose**: Survey codebase across Frontend and Backend for mock data, sample constants, hardcoded fallback strings, seed data obscuring real tenant data. Decompose into modules/milestones.
2. **Dispatch & Execute**: Iteration loop: Explorer -> Worker -> Reviewer -> Challenger -> Auditor.
3. **On failure**: Retry -> Replace -> Skip -> Redistribute -> Redesign -> Escalate.
4. **Succession**: Self-succeed at 16 spawns if necessary.
- **Work items**:
  1. Survey & Discovery (Frontend & Backend mock data inventory) [in-progress]
  2. Frontend dynamic data transition [pending]
  3. Backend real DB dynamic seeding & tenant binding [pending]
  4. Typecheck & Test Suite verification [pending]
  5. Deploy to VPS via deploy_frontend.py [pending]
- **Current phase**: 0 (Survey)
- **Current focus**: Parallel Survey by 3 Explorers

## 🔒 Key Constraints
- NEVER write source code or run build/tests directly as Orchestrator.
- CAM DEPLOY DATABASE LEN VPS (never upload/overwrite *.db*, *.sqlite*, data/ on VPS).
- Adhere strictly to AGENTS.md, GEMINI.md, Ponytail Full mode.
- 0 TypeScript errors (tsc --noEmit) and all test suites pass.
- Path to ORIGINAL_REQUEST.md must be provided to all subagents.

## Current Parent
- Conversation ID: 8d79a817-0ba6-420f-bf0e-6316997cd47e
- Updated: 2026-09-22T02:05:00Z

## Key Decisions Made
- Initialized orchestrator_3 session.
- Dispatched 3 parallel Explorers for comprehensive Frontend, Backend, and Tenant/Deployment Survey.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|---|---|---|---|---|
| explorer_survey3_1 | teamwork_preview_explorer | Scan frontend/ for mock data, sample constants, fallback mocks | in-progress | 0ccc43d4-96a4-499f-9bdc-cbb9c612bd9c |
| explorer_survey3_2 | teamwork_preview_explorer | Scan backend/ for mock responses, seed scripts, DB models | in-progress | 7f7c3aa1-f554-4b68-9a1a-1c218108e12f |
| explorer_survey3_3 | teamwork_preview_explorer | Scan tenant 0392387165, sharding, tests & deploy_frontend.py | in-progress | e90c66d4-0b41-4a94-9106-97e75c63a474 |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: 0ccc43d4-96a4-499f-9bdc-cbb9c612bd9c, 7f7c3aa1-f554-4b68-9a1a-1c218108e12f, e90c66d4-0b41-4a94-9106-97e75c63a474
- Predecessor: orchestrator_2
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: d38a72b3-c735-43bd-b4b6-acea6d3ebca3/task-20
- Safety timer: d38a72b3-c735-43bd-b4b6-acea6d3ebca3/task-36
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- d:/duanpos-ongchu/.agents/orchestrator_3/DISPATCH.md — Dispatch instructions
- d:/duanpos-ongchu/.agents/orchestrator_3/BRIEFING.md — Persistent working memory
- d:/duanpos-ongchu/.agents/orchestrator_3/plan.md — Orchestration plan
- d:/duanpos-ongchu/.agents/orchestrator_3/progress.md — Liveness and milestone progress

# BRIEFING — 2026-09-17T08:46:00Z

## Mission
Kế hoạch nâng cấp & quy chuẩn hóa toàn bộ dự án OngChu Lean POS về cỡ chữ (Typography 7 cấp) và Bảng màu Dual-Theme (Anti-Glare Dark Mode & Indochine Light Mode) theo chuẩn Apple HIG & công thái học F&B di động.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: d:/duanpos-ongchu/.agents/orchestrator_2
- Original parent: parent
- Original parent conversation ID: dccbce09-7168-44c9-b4e9-ef06fd343dea

## 🔒 My Workflow
- **Pattern**: Project Pattern (Survey -> Assess -> Decompose & Delegate / Iteration Loop)
- **Scope document**: d:/duanpos-ongchu/PROJECT.md
1. **Survey**: Spawn 3 Explorers in parallel to map full scope of Typography, Dual-Theme, and Action Thread across frontend.
2. **Decompose & Plan**: Create/update PROJECT.md with Feature Inventory and Milestones.
3. **Dispatch & Execute**:
   - Direct iteration loop: Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Auditor (1).
4. **On failure**:
   - Retry -> Replace -> Skip -> Redistribute -> Redesign -> Escalate.
5. **Succession**: Spawn successor when spawn count >= 16.
- **Work items**:
  1. Survey & Codebase Audit [in-progress]
  2. R1: Typography 7-tier alignment [pending]
  3. R2: Dual-Theme token & hex elimination [pending]
  4. R3: Apple Warm Orange action thread [pending]
  5. R4: Documentation sync (AGENTS.md & GEMINI.md) [pending]
  6. E2E & Static Verification [pending]
- **Current phase**: 0 (Survey)
- **Current focus**: Survey & Codebase Audit across /frontend

## 🔒 Key Constraints
- DISPATCH-ONLY: NEVER write source code directly, NEVER run build/test commands directly.
- Always delegate work to subagents via invoke_subagent.
- Hard constraints: 100% .tsx in /frontend use <AppText> and useTheme().
- TypeScript compilation `cd frontend && npx tsc --noEmit` must pass with 0 errors.
- Real Android device testing via ADB MCP Server (901SO).
- Pass path to ORIGINAL_REQUEST.md in every subagent dispatch.
- Mandatory integrity warning in worker dispatches.
- Forensic Auditor has binary veto power.

## Current Parent
- Conversation ID: dccbce09-7168-44c9-b4e9-ef06fd343dea
- Updated: 2026-09-17T08:46:00Z

## Key Decisions Made
- Initiating Survey phase with 3 parallel Explorers:
  - Explorer 1: Typography & TextInput inspection (R1 focus)
  - Explorer 2: Theme tokens & Hardcoded Hex scanner (R2 focus)
  - Explorer 3: Action buttons & Warm Orange thread audit (R3 focus)

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_survey_1 | teamwork_preview_explorer | R1 Typography & TextInput Survey | completed | 916fcfe2-b5ba-4646-8374-c9669496ce30 |
| explorer_survey_2 | teamwork_preview_explorer | R2 Dual-Theme & Hex Elimination Survey | completed | ec5b1337-96d0-4db4-9d95-97b4c573e22a |
| explorer_survey_3 | teamwork_preview_explorer | R3 Action Thread & R4 Doc Sync Survey | completed | ba991413-ffb2-43fc-b172-45b3d6135d5d |
| worker_m1 | teamwork_preview_worker | M1 Implementation | completed | 5f407771-63c4-477a-b0b7-afdcca749d55 |
| worker_m2 | teamwork_preview_worker | M2 Implementation | completed | 88fed168-9f88-4dc5-a7c5-df142efd3dcd |
| worker_m3 | teamwork_preview_worker | M3 Implementation | completed | a48a2768-93b3-4bf8-880b-0a216b19dc3c |

| reviewer_1 | teamwork_preview_reviewer | Typography & TextInput Review | in-progress | 14a03a7d-521c-42a5-b202-6ca45fed6751 |
| reviewer_2 | teamwork_preview_reviewer | Theme, Action Thread & Docs Review | in-progress | 4d4ae422-f1b4-4d14-88bc-80db8da1d554 |
| challenger_1 | teamwork_preview_challenger | Automated Tests & Static Scans | in-progress | a6af2507-c086-49cc-91bc-e738da2383e4 |
| challenger_2 | teamwork_preview_challenger | Real Android Device ADB Verification | in-progress | ac15d8a3-f27d-4726-96da-20140fd5bcaa |
| auditor_1 | teamwork_preview_auditor | Forensic Integrity Audit | in-progress | 221606eb-a47e-4985-a432-946ad20d1cde |

## Succession Status
- Succession required: no
- Spawn count: 11 / 16
- Pending subagents: 14a03a7d-521c-42a5-b202-6ca45fed6751, 4d4ae422-f1b4-4d14-88bc-80db8da1d554, a6af2507-c086-49cc-91bc-e738da2383e4, ac15d8a3-f27d-4726-96da-20140fd5bcaa, 221606eb-a47e-4985-a432-946ad20d1cde
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: af22ed07-f96a-48a4-b9d1-f8b47b7c0b54/task-14
- Safety timer: none

## Artifact Index
- d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md — Authoritative user request
- d:/duanpos-ongchu/.agents/orchestrator_2/DISPATCH.md — Incoming dispatch log
- d:/duanpos-ongchu/.agents/orchestrator_2/BRIEFING.md — Persistent memory
- d:/duanpos-ongchu/.agents/orchestrator_2/progress.md — Liveness & task checklist

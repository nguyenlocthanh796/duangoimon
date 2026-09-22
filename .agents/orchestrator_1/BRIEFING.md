# BRIEFING — 2026-09-16T10:21:00Z

## Mission
Kiểm duyệt, rà soát và chuẩn hóa 100% các thành phần giao diện, màn hình và component trên frontend Expo SDK 52 của dự án duanpos-ongchu theo chuẩn Indochine Heritage, Apple HIG và Typography 7 cấp, đảm bảo test suite pass 100%.

## 🔒 My Identity
- Archetype: orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: d:/duanpos-ongchu/.agents/orchestrator_1
- Original parent: parent
- Original parent conversation ID: 28ce6701-7c02-457f-9417-9e55421b00f6

## 🔒 My Workflow
- **Pattern**: Project Pattern
- **Scope document**: d:/duanpos-ongchu/PROJECT.md
1. **Decompose**: Survey (3 explorers) -> Feature Inventory & Milestone Decomposition (Target 3-5 milestones) -> Dual track (Implementation + E2E test track).
2. **Dispatch & Execute**:
   - **Direct (iteration loop)**: For each milestone: Explorer (3) -> Worker (1) -> Reviewer (2) -> Challenger (2) -> Auditor (1) -> Gate.
   - **Delegate (sub-orchestrator)**: If milestones are large, spawn sub-orchestrators for milestones or run iteration loop directly.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical, auditor is NON-SKIPPABLE)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  1. Survey & Codebase Exploration [in-progress]
  2. Project Architecture & Milestone Plan [pending]
  3. Milestone Execution & Verification [pending]
  4. Final Testing & Audit Verification [pending]
- **Current phase**: 0 (Survey)
- **Current focus**: Survey phase with 3 parallel Explorers

## 🔒 Key Constraints
- DISPATCH-ONLY: NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers/reviewers/auditors to do so.
- NEVER investigate or explore problem at code level — dispatch Explorers.
- Maintain persistent state in BRIEFING.md, progress.md, PROJECT.md, plan.md.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.
- Binary veto on Forensic Auditor failure.

## Current Parent
- Conversation ID: 28ce6701-7c02-457f-9417-9e55421b00f6
- Updated: 2026-09-16T10:21:00Z

## Key Decisions Made
- Selected Project Pattern with Survey Phase (3 Explorers in parallel) to map out all hardcoded colors, navigation components, typography, and test files.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|---|---|---|---|---|
| explorer_survey_1 | teamwork_preview_explorer | Survey Theme Tokens & Colors | in-progress | 19e81ce5-8b93-4920-9aee-342f76a2faec |
| explorer_survey_2 | teamwork_preview_explorer | Survey Navigation 2-tier & HIG | in-progress | 4cf3613b-2dc3-4274-b6f7-1bde13e07e41 |
| explorer_survey_3 | teamwork_preview_explorer | Survey Typography & Tests | in-progress | b94d63f9-6a86-472c-811f-dbe5d27c4d8d |

## Succession Status
- Succession required: no
- Spawn count: 3 / 16
- Pending subagents: 19e81ce5-8b93-4920-9aee-342f76a2faec, 4cf3613b-2dc3-4274-b6f7-1bde13e07e41, b94d63f9-6a86-472c-811f-dbe5d27c4d8d
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: f7cdb996-06f0-4fb4-ba39-142ee07fc06d/task-16
- Safety timer: none

## Artifact Index
- d:/duanpos-ongchu/.agents/orchestrator_1/BRIEFING.md — Working memory
- d:/duanpos-ongchu/.agents/orchestrator_1/progress.md — Liveness & task tracking
- d:/duanpos-ongchu/.agents/orchestrator_1/plan.md — Detailed orchestrator plan
- d:/duanpos-ongchu/.agents/orchestrator_1/DISPATCH.md — Dispatch log
- d:/duanpos-ongchu/PROJECT.md — Global project plan and milestones

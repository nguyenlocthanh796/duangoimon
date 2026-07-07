# BRIEFING — 2026-07-04T10:56:04+07:00

## Mission
Coordinate and implement the React Native / Expo POS app requirements, covering sales (bán hàng), management (quản lý), and accounting (kế toán) modules, and verify the integration.

## 🔒 My Identity
- Archetype: teamwork_preview_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: e:\posa\.agents\orchestrator
- Original parent: top-level
- Original parent conversation ID: 37300bd8-cac2-4541-9bb9-adc34db321e7

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: e:\posa\.agents\orchestrator\PROJECT.md
1. **Decompose**: Decompose the POS app into 3-7 logical milestones/modules based on requirements.
2. **Dispatch & Execute** (pick ONE):
   - **Delegate (sub-orchestrator)**: Spawn a sub-orchestrator for each milestone/track.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns. Write handoff.md, spawn successor.
- **Work items**:
  1. Initialize orchestrator state [done]
  2. Implement Milestone 1: Navigation & Auth Integration [done]
  3. Implement Milestone 2: Sales & POS Module [in-progress]
  4. Implement Milestone 3: Management Module [pending]
  5. Implement Milestone 4: Accounting Module [pending]
  6. Implement Milestone 5: Verification & Hardening [pending]
- **Current phase**: 2 (Iteration Loop)
- **Current focus**: Milestone 2: Sales & POS Module

## 🔒 Key Constraints
- NEVER write, modify, or create source code files directly.
- NEVER run build/test commands yourself — require workers to do so.
- You MAY use file-editing tools ONLY for metadata/state files (.md) in your .agents/ folder.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh

## Current Parent
- Conversation ID: 10c8d7cd-c7cc-4224-9742-ae6e0aa66468
- Updated: yes

## Key Decisions Made
- Milestone 1 is verified as complete and clean. Moving to Milestone 2.
- Milestone 2 exploration completed by 3 parallel Explorer subagents.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|-------|------|-----------|--------|---------|
| explorer_m1_1 | teamwork_preview_explorer | Explore Auth & Navigation | completed | d857ac43-4af3-40d3-b37b-fbee0c0c4b81 |
| worker_m1_1 | teamwork_preview_worker | Implement Auth & Navigation | completed | 2ec7da73-2d74-4b1a-a2c9-14f7af1eed4c |
| auditor_m1 | teamwork_preview_auditor | Forensic Audit M1 | completed | 78692858-eb31-4b09-a715-581e966046ed |
| explorer_m2_1 | teamwork_preview_explorer | Explore M2 Tables Map & POS Ordering | completed | a9e65b8a-8c0a-453b-afba-1e41a654fd50 |
| explorer_m2_2 | teamwork_preview_explorer | Explore M2 Payment & Kitchen | completed | 440f1fa4-4378-4b47-9c35-5de3e9e859a4 |
| explorer_m2_3 | teamwork_preview_explorer | Explore M2 Auth Guards & Configs | completed | dbde755e-d56d-4a35-9ceb-551feb8069f9 |
| worker_m2_1 | teamwork_preview_worker | Implement M2 Sales & Security | pending | fc3e5687-c2c5-4189-8206-11a6ab0e3fdf |

## Succession Status
- Succession required: no
- Spawn count: 11 / 16
- Pending subagents: fc3e5687-c2c5-4189-8206-11a6ab0e3fdf
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 5645c52b-b33d-482f-8e19-e02da4d57f0a/task-57
- Safety timer: 5645c52b-b33d-482f-8e19-e02da4d57f0a/task-155
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- e:\posa\.agents\orchestrator\ORIGINAL_REQUEST.md — Original user request
- e:\posa\.agents\orchestrator\BRIEFING.md — My persistent working memory
- e:\posa\.agents\orchestrator\progress.md — Liveness signal & state recovery
- e:\posa\.agents\orchestrator\plan.md — Detailed execution steps
- e:\posa\.agents\orchestrator\context.md — Codebase & requirements context

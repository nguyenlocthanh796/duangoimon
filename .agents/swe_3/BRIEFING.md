# BRIEFING — 2026-09-18T15:42:15+07:00

## Mission
Orchestrate SWE Light loop to build and integrate 6 shared UI components into frontend/lib/components/ui/ and refactor across screens.

## 🔒 My Identity
- Archetype: teamwork_preview_swe
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: d:/duanpos-ongchu/.agents/swe_3
- Original parent: parent
- Original parent conversation ID: 6e66ce0a-6437-4ec5-a574-7c06272ec98b

## 🔒 My Workflow
- **Pattern**: SWE Light
- **Scope document**: d:/duanpos-ongchu/.agents/swe_3/DISPATCH.md
1. **Decompose**: No decomposition (SWE Light single line of work).
2. **Dispatch & Execute**:
   - Sequential loop: teamwork_preview_implementer -> teamwork_preview_reviewer x 3+ -> teamwork_preview_victory_auditor
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: at 16 spawns, write handoff.md, spawn successor
- **Work items**:
  1. Implementation (teamwork_preview_implementer) [done]
  2. Review Round 1 (teamwork_preview_reviewer) [in-progress]
  3. Review Round 2 (teamwork_preview_reviewer) [pending]
  4. Review Round 3 (teamwork_preview_reviewer) [pending]
  5. Audit (teamwork_preview_victory_auditor) [pending]
- **Current phase**: 2
- **Current focus**: Monitoring teamwork_preview_reviewer R1 (convId: a45e56b9-93b7-4f93-95be-c4e01d5e5662)

## 🔒 Key Constraints
- NEVER write or edit code directly — dispatch workers.
- Propagate original task verbatim.
- Sequential refinement, no parallel opinions.
- Floor: at least 3 review rounds + personally re-run relevant tests.
- Maintain open-issues ledger.
- Never reuse a subagent after it has delivered its handoff.

## Current Parent
- Conversation ID: 6e66ce0a-6437-4ec5-a574-7c06272ec98b
- Updated: not yet

## Key Decisions Made
- Matched domain skills: ongchu-frontend-expo, ongchu-lean-pos, ponytail.
- Implementer verified: tsc code 0, 478/478 tests pass.
- Reviewer Round 1 dispatched: a45e56b9-93b7-4f93-95be-c4e01d5e5662.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|---|---|---|---|---|
| implementer_swe3_r1 | teamwork_preview_implementer | Build 6 shared components & integrate into screens | completed | 38cec0e1-599c-467b-a304-b666ff42178e |
| reviewer_swe3_r1 | teamwork_preview_reviewer | Review & adversarial test 6 components & adoptions | in-progress | a45e56b9-93b7-4f93-95be-c4e01d5e5662 |

## Succession Status
- Succession required: no
- Spawn count: 2 / 16
- Pending subagents: a45e56b9-93b7-4f93-95be-c4e01d5e5662
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 2cc06e1e-7ffd-4433-90c2-5f6ae36c5f01/task-20
- Safety timer: none
- On succession: kill all timers before spawning successor
- On context truncation: run manage_task(Action="list") — re-create if missing

## Artifact Index
- d:/duanpos-ongchu/.agents/swe_3/DISPATCH.md — Dispatch specifications
- d:/duanpos-ongchu/.agents/swe_3/progress.md — Liveness & iteration tracking
- d:/duanpos-ongchu/.agents/teamwork_preview_implementer_swe3_r1/handoff.md — Implementer handoff report

# DISPATCH INSTRUCTIONS — Explorer Survey 3 (Tenant, Sharding & Deployment Investigator)

## Identity
- Type: teamwork_preview_explorer
- Role: Tenant, Sharding & Deployment Investigator
- Working directory: d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey3_3
- Parent: Orchestrator 3 (d38a72b3-c735-43bd-b4b6-acea6d3ebca3)

## Task & Scope
Read `d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md` (specifically timestamp `## 2026-09-21T19:04:07Z`), `d:/duanpos-ongchu/AGENTS.md`, and `d:/duanpos-ongchu/GEMINI.md`.
Conduct an investigation on:
1. `scripts/deploy_frontend.py` and any deployment scripts/configs: analyze what it does, what endpoints or SSH it touches, build steps, and verify strict adherence to "CẤM DEPLOY DATABASE LÊN VPS" (no *.db, *.sqlite, data/ uploaded to VPS).
2. Tenant sharding and auth flow: How tenant `0392387165` and `saas_admin nguyenlocthanh291097` authenticate across frontend and backend. Where tenant ID or schema or sqlite DB path is set.
3. Test suite architecture: Inspect `frontend/tests/` (especially `run_all_tests.ts`, `tier1_...`, etc.) and `frontend` typecheck `tsc --noEmit`. Analyze if mock elimination breaks any existing tests or requires test updates.
4. Document exact file paths, line numbers, dependencies, and deployment prerequisites.
5. Write your complete findings to `d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey3_3/report.md` and `handoff.md`.

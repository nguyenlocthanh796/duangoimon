# DISPATCH INSTRUCTIONS — Explorer Survey 1 (Frontend Mock & Hardcode Investigator)

## Identity
- Type: teamwork_preview_explorer
- Role: Frontend Mock & Hardcode Investigator
- Working directory: d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey3_1
- Parent: Orchestrator 3 (d38a72b3-c735-43bd-b4b6-acea6d3ebca3)

## Task & Scope
Read `d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md` (specifically timestamp `## 2026-09-21T19:04:07Z`), `d:/duanpos-ongchu/AGENTS.md`, and `d:/duanpos-ongchu/GEMINI.md`.
Conduct an exhaustive scan across `frontend/app/`, `frontend/lib/`, `frontend/stores/`, `frontend/hooks/`:
1. Identify all hardcoded mock data, mock constants (e.g. `MOCK_...`, `SAMPLE_...`, `DEFAULT_...`), dummy products, mock shifts, mock tables, mock orders, and fallback mock records.
2. Identify where zustand stores or UI components fall back to mock constants instead of empty states or dynamic API responses.
3. Identify any mock constants that obscure real live data for tenant `0392387165` and `saas_admin nguyenlocthanh291097`.
4. Document exact file paths, line numbers, code snippets, and specific refactoring recommendations.
5. Write your complete findings to `d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey3_1/report.md` and `handoff.md`.

## 2026-09-21T19:06:20Z
Received dispatch request from parent:
"You are Explorer Survey 1 (Frontend Mock & Hardcode Investigator).
Your working directory is d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey3_1.
Read your instructions in d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey3_1/DISPATCH.md and read d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (specifically timestamp ## 2026-09-21T19:04:07Z), d:/duanpos-ongchu/AGENTS.md, and d:/duanpos-ongchu/GEMINI.md.

Objective:
Conduct an exhaustive scan across frontend/app/, frontend/lib/, frontend/stores/, frontend/hooks/ for:
1. Hardcoded mock data, mock constants (MOCK_..., SAMPLE_..., DEFAULT_...), dummy products, mock shifts, mock tables, mock orders, and fallback mock records.
2. Areas where zustand stores or UI components fall back to mock constants instead of dynamic API responses or clean empty states.
3. Any mock constants that obscure real live data for tenant 0392387165 and saas_admin nguyenlocthanh291097.
4. Document exact file paths, line numbers, code snippets, and specific refactoring recommendations.
5. Write your complete findings to d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey3_1/report.md and handoff.md.
Send a completion message back to parent when done."

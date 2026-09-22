# DISPATCH INSTRUCTIONS — Explorer Survey 2 (Backend DB & Seed Data Investigator)

## Identity
- Type: teamwork_preview_explorer
- Role: Backend DB & Seed Data Investigator
- Working directory: d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey3_2
- Parent: Orchestrator 3 (d38a72b3-c735-43bd-b4b6-acea6d3ebca3)

## Task & Scope
Read `d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md` (specifically timestamp `## 2026-09-21T19:04:07Z`), `d:/duanpos-ongchu/AGENTS.md`, and `d:/duanpos-ongchu/GEMINI.md`.
Conduct an exhaustive scan across `backend/cmd/`, `backend/internal/database/`, `backend/internal/handler/`, `backend/internal/models/`, `backend/internal/service/`:
1. Check how database connections (PostgreSQL 16, SQLite sharding) are initialized, migrated, and seeded.
2. Check if any handlers or services return hardcoded mock responses, mock slices, or mock fallbacks instead of querying the GORM database.
3. Check how tenant `0392387165` and `saas_admin nguyenlocthanh291097` are seeded/stored, queried, and protected from being overwritten or shadowed by generic seeds.
4. Check if any seed scripts run unconditionally on server startup and overwrite real tenant data.
5. Document exact file paths, line numbers, code snippets, and specific refactoring recommendations.
6. Write your complete findings to `d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey3_2/report.md` and `handoff.md`.

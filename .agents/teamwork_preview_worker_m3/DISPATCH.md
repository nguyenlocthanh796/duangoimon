## 2026-09-17T08:44:44Z
You are teamwork_preview_worker_m3.
Your working directory is: d:/duanpos-ongchu/.agents/teamwork_preview_worker_m3

You MUST read d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (specifically section ## 2026-09-17T08:44:44Z) and d:/duanpos-ongchu/PROJECT.md before doing anything else.
Also read the survey reports at:
- d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey_2/handoff.md
- d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey_3/handoff.md

Consult skills:
- d:/duanpos-ongchu/.agents/skills/ongchu-frontend-expo/SKILL.md
- d:/duanpos-ongchu/.agents/skills/ponytail/SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Assigned Scope (Milestone 3):
1. Documentation Synchronization (`d:/duanpos-ongchu/AGENTS.md` and `d:/duanpos-ongchu/GEMINI.md`):
   - `AGENTS.md`:
     - Line 13: Update "Sử dụng chuẩn 4 cỡ chữ <AppText> (xs, sm, md, lg)..." to "Sử dụng chuẩn 7 cỡ chữ <AppText> (xxs, xs, sm, md, lg, xl, display), trong đó variant="md" (18px) gánh 85–90% nội dung POS...".
     - Line 51 (Bảng 6 Trụ Cột): Update `Dark Mode: Gỗ Gụ & Cà Phê Rang Đậm (#120E0B)` to `#14110E`.
     - Line 127: Update `theme.brand.accent: #D97706` to `theme.brand.accent: #B45309` (Vàng Đồng Thau Phin ấm áp, đồng nhất với Light Mode).
     - Ensure the Apple Warm Orange Action Thread (`#B45309`) and `TextInput >= 16px` rule are completely synced without internal contradictions.
   - `GEMINI.md`:
     - Confirm and sync all sections regarding Typography 7 tiers, `md` 18px backbone, `TextInput >= 16px`, `#14110E` Dark Mode, and `#B45309` Apple Warm Orange Action Thread.

2. Test Suite Alignment (`frontend/tests/`):
   - `frontend/tests/tier1_feature_coverage.test.ts`:
     - Lines ~824-851: Update the assertions testing `darkTheme.surface.app` to `#14110E` (instead of `#120E0B`), `lightTheme.border.default` to `#D6D3D1` (instead of `#A8A29E`), and `darkTheme.brand.accent` to `#B45309`.
   - `frontend/tests/adversarial_theme_tokens.test.ts`:
     - Lines ~88-102: Update the assertions testing `darkTheme.text.inverse` to `#14110E`, `darkTheme.text.onBrand` to `#FFFFFF`, `darkTheme.border.subtle` to `'rgba(243, 239, 234, 0.12)'`, and `darkTheme.brand.accent` to `#B45309`.

3. Verification Requirements:
   - Run `cd frontend && npx tsc --noEmit` and confirm 0 errors (Exit code 0).
   - Run `cd frontend && npx ts-node tests/run_all_tests.ts` and confirm 100% tests PASS (0 failures).
   - Run `cd frontend && npx ts-node tests/adversarial_theme_tokens.test.ts` and confirm 100% PASS.
   - Write a detailed completion report to:
     d:/duanpos-ongchu/.agents/teamwork_preview_worker_m3/handoff.md
   - Use send_message to report completion when done.

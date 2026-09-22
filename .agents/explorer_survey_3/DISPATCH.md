## 2026-09-16T10:21:37Z
You are Explorer 3 (Typography & Tests Explorer) for the duanpos-ongchu project.
Working directory: d:/duanpos-ongchu/.agents/explorer_survey_3

MANDATORY INPUTS:
- Authoritative User Request: Read d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (under ## 2026-09-16T10:19:35Z).
- Project Rules: Read d:/duanpos-ongchu/AGENTS.md (specifically § 3.1, 3.2) and d:/duanpos-ongchu/GEMINI.md.
- Skill reference: d:/duanpos-ongchu/.agents/skills/ongchu-frontend-expo/SKILL.md and d:/duanpos-ongchu/.agents/skills/ponytail/SKILL.md.

TASK OBJECTIVE:
Perform a comprehensive survey of Typography 7-scale compliance, Tabular Nums, and Test Suite status:
1. Audit Typography & Tabular Nums across `frontend/app/` and `frontend/lib/components/`:
   - 100% text rendered through `<AppText>` with standard 7 levels: `xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `display`.
   - Ensure no raw `<Text>` from react-native or inline `fontSize`/`lineHeight` overrides remain.
   - De-bolding: 90% normal/medium, max ceiling bold (600), no weight 700/800.
   - 100% tabularNums={true} for currency (VND), qty, timestamps, order codes (`HD-xxxxx`).
2. Audit Test Suite status:
   - Check `frontend/tests/adversarial_theme_tokens.test.ts`, `frontend/tests/tier1_feature_coverage.test.ts`, `frontend/tests/adversarial_m2_stress.ts`, and any test runners (`tests/run_all_tests.ts`, `package.json` test scripts).
   - Identify what tests currently exist, what assertions they make, which tests pass/fail, and which need updates to align with Indochine Heritage tokens and the latest requirements.
3. Document all exact file paths, line numbers, and required changes.

OUTPUT:
Write your full report to `d:/duanpos-ongchu/.agents/explorer_survey_3/survey_typography_tests.md` and write a structured handoff to `d:/duanpos-ongchu/.agents/explorer_survey_3/handoff.md`.
Then send a concise message to the parent orchestrator with the summary and artifact paths.

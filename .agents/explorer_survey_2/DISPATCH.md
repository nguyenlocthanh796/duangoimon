## 2026-09-16T10:21:37Z
You are Explorer 2 (Navigation HIG Explorer) for the duanpos-ongchu project.
Working directory: d:/duanpos-ongchu/.agents/explorer_survey_2

MANDATORY INPUTS:
- Authoritative User Request: Read d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (under ## 2026-09-16T10:19:35Z).
- Project Rules: Read d:/duanpos-ongchu/AGENTS.md (specifically § 3.8, 3.12, 3.13) and d:/duanpos-ongchu/GEMINI.md.
- Skill reference: d:/duanpos-ongchu/.agents/skills/ongchu-frontend-expo/SKILL.md and d:/duanpos-ongchu/.agents/skills/ponytail/SKILL.md.

TASK OBJECTIVE:
Perform a comprehensive survey of navigation layers and Apple HIG touch ergonomics across the frontend codebase:
1. Examine the 2-tier navigation structure:
   - Dãy 1 (Underline Tab Cấp 1): Height 46px, bottom border 3px Vàng Đồng Thau `#B45309`, active icon & text Đồng Thau (`weight="medium"`), inactive text Đen Gỗ Mun `#1C1917`.
   - Dãy 2 (Capsule Pills Cấp 2): Height 36px, `borderRadius: 18px`, active bg Đồng Thau `#B45309` text white `#FFFFFF`, inactive bg `#FFFFFF` with hairline border `#E7E5E4`.
   - Check where these navigation layers exist and where they are missing or non-compliant across screens (e.g. Menu screen `/thuc-don`, POS screen `/`, KDS `/kds`, Orders `/hoa-don`, Cashbook `/so-quy`, Shift `/giao-ca`, Report `/bao-cao-loi-nhuan`, Settings `/cai-dat`).
2. Audit Apple HIG touch ergonomics:
   - Check touch targets for all interactive controls (buttons, switches, checkboxes, icon buttons). Are they >= 44x44pt? (layout minSize or hitSlop).
   - Check CTA buttons (e.g., Tính Tiền, Thanh Toán, Báo Bếp, Báo Xong): Do they meet height 50-52pt, padding, radius 12-14pt?
   - Check Contextual Header actions (`<AppHeader rightCustom>`), mobile vs tablet responsive behavior (`AppRailNav` 68px vs `BottomNavBar`).
3. Document all exact file paths, line numbers, and required changes.

OUTPUT:
Write your full report to `d:/duanpos-ongchu/.agents/explorer_survey_2/survey_navigation.md` and write a structured handoff to `d:/duanpos-ongchu/.agents/explorer_survey_2/handoff.md`.
Then send a concise message to the parent orchestrator with the summary and artifact paths.

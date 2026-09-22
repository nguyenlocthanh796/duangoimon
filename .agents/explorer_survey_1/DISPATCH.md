## 2026-09-16T10:21:37Z
You are Explorer 1 (Theme Token Explorer) for the duanpos-ongchu project.
Working directory: d:/duanpos-ongchu/.agents/explorer_survey_1

MANDATORY INPUTS:
- Authoritative User Request: Read d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (under ## 2026-09-16T10:19:35Z).
- Project Rules: Read d:/duanpos-ongchu/AGENTS.md and d:/duanpos-ongchu/GEMINI.md.
- Skill reference: d:/duanpos-ongchu/.agents/skills/ongchu-frontend-expo/SKILL.md and d:/duanpos-ongchu/.agents/skills/ponytail/SKILL.md.

TASK OBJECTIVE:
Perform a comprehensive survey of all theme tokens, color definitions, and color usages across the frontend codebase:
1. Check `frontend/lib/theme/tokens.ts`, `frontend/lib/theme/colors.ts` and related theme files.
2. Search for any hardcoded hex color codes outside `frontend/lib/theme/` (especially old colors like `#0D9488`, `#F8FAFC`, `#FF6B00`, `#0F172A`, `#475569`, etc.) across `frontend/app/` (all 10 screens: `/`, `/thanh-toan`, `/kds`, `/hoa-don`, `/thuc-don`, `/cai-dat`, `/so-quy`, `/giao-ca`, `/bao-cao-loi-nhuan`, `/cfd`) and `frontend/lib/components/`.
3. Check compliance with Indochine Heritage Palette:
   - Light Canvas: Ngà Giấy Dó `theme.surface.app` (`#F9F6F0`)
   - Chữ chính: Mực Gỗ Mun `theme.text.primary` (`#1C1917` Light / `#F5F5F4` Dark)
   - Phụ đề / Caption: Xám Đá Mộc `theme.text.muted` (`#57534E` Light / `#A8A29E` Dark)
   - Đường phân cách: Hairline `theme.border.subtle` (`#E7E5E4`)
   - Điểm nhấn / Active Tab / Badge: Vàng Đồng Thau `theme.brand.accent` (`#B45309`)
   - Nút Tính Tiền / Thanh Toán / Báo Xong: Xanh Lá Mộc `theme.brand.success` (`#15803D`)
   - Hủy món / Báo động: Đỏ Chu Sa `theme.brand.danger` (`#DC2626`)
   - Card/Surface: Men Gốm `theme.surface.card` (`#FFFFFF`)
4. Document all exact file paths, line numbers, and required changes.

OUTPUT:
Write your full report to `d:/duanpos-ongchu/.agents/explorer_survey_1/survey_colors.md` and write a structured handoff to `d:/duanpos-ongchu/.agents/explorer_survey_1/handoff.md`.
Then send a concise message to the parent orchestrator with the summary and artifact paths.

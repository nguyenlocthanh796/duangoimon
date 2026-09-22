## 2026-09-17T08:46:52Z

<USER_REQUEST>
You are teamwork_preview_explorer_survey_2.
Your working directory is: d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey_2
You MUST read d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (specifically section ## 2026-09-17T08:44:44Z) before doing anything else.
Also consult skills:
- d:/duanpos-ongchu/.agents/skills/ongchu-frontend-expo/SKILL.md
- d:/duanpos-ongchu/.agents/skills/ponytail/SKILL.md

Your Task:
Investigate codebase regarding R2: Chuẩn Hóa Bảng Màu Dual-Theme Indochine & Anti-Glare:
1. Verify theme definitions in frontend/lib/theme/ (colors.ts, tokens.ts, index.tsx, etc.):
   - Light Mode: Giấy Dó #F9F6F0 (surface.app), Gỗ Mun #1C1917 (text.primary & brand.primary), Đồng Thau Phin #B45309 (brand.accent), etc.
   - Dark Mode Anti-Glare: Cà Phê #14110E (surface.app), Gỗ Gụ #1E1813 (surface.card), Trắng Ngà #F3EFEA (text.primary), Vàng Đồng Thau #B45309 (brand.primary & brand.accent - NO white #F5F5F4 brand.primary causing glare).
2. Scan all .tsx files across frontend/app and frontend/lib/components for hardcoded hex colors (e.g. #[0-9a-fA-F]{3,8}, rgba(...)):
   - Check for any lingering old palette hexes (Slate, Jade, Orange, or arbitrary colors).
   - Identify which files still have hardcoded colors that should use useTheme() tokens.
3. Check status colors (pending, cooking, ready, danger, warning) and border tokens.

Write a comprehensive, structured survey report to:
d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey_2/handoff.md
Include exact file paths, line numbers, hex values, and semantic token mappings.
When done, use send_message to report completion.
</USER_REQUEST>

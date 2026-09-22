# DISPATCH

Subagent: teamwork_preview_explorer_survey_1
Role: Typography & TextInput Explorer
Task: Investigate Typography 7-tier usage and TextInput >=16px across frontend codebase.
Path to request: d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (see ## 2026-09-17T08:44:44Z)

## 2026-09-17T08:46:52Z
You are teamwork_preview_explorer_survey_1.
Your working directory is: d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey_1
You MUST read d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (specifically section ## 2026-09-17T08:44:44Z) before doing anything else.
Also consult skills:
- d:/duanpos-ongchu/.agents/skills/ongchu-frontend-expo/SKILL.md
- d:/duanpos-ongchu/.agents/skills/ponytail/SKILL.md

Your Task:
Investigate codebase regarding R1: Chuẩn Hóa Typography 7 Cấp Cân Bằng (Apple HIG):
1. Verify typography system in frontend/lib/components/ui/AppText.tsx and frontend/lib/theme/typography.ts (if exists) or theme files:
   - Check the 7 levels: xxs (12px), xs (14px), sm (16px), md (18px), lg (22px), xl (24px), display (28px).
   - Check if variant="md" (18px) carries 85-90% of POS content (dish names, prices, invoice items, cashbook, drawer, etc.).
   - Check if main screen headers (<AppHeader>) use variant="lg" (22px bold).
2. Comprehensive scan for all TextInput components across frontend/app and frontend/lib:
   - Check if 100% of TextInput have fontSize >= 16px (to prevent iOS WebKit auto-zoom).
   - Identify any TextInput with fontSize < 16px (e.g. 11, 13, 14, 15) or missing fontSize.
3. Check for any raw <Text> usage instead of <AppText>, or any inline fontSize/lineHeight overriding <AppText>.

Write a comprehensive, structured survey report to:
d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey_1/handoff.md
Include exact file paths, line numbers, current values, and recommended changes.
When done, use send_message to report completion.

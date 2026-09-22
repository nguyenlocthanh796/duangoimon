## 2026-09-17T08:54:49Z
You are teamwork_preview_worker_m1.
Your working directory is: d:/duanpos-ongchu/.agents/teamwork_preview_worker_m1

You MUST read d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (specifically section ## 2026-09-17T08:44:44Z) and d:/duanpos-ongchu/PROJECT.md before doing anything else.
Also read the survey reports from:
- d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey_1/handoff.md
- d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey_2/handoff.md
- d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey_3/handoff.md

Consult skills:
- d:/duanpos-ongchu/.agents/skills/ongchu-frontend-expo/SKILL.md
- d:/duanpos-ongchu/.agents/skills/ponytail/SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Assigned Scope (Milestone 1):
1. Theme Engine & Tokens (`frontend/lib/theme/`):
   - `colors.ts`:
     - Set `darkTheme.brand.accent = '#B45309'` (Vàng Đồng Thau Phin Anti-Glare, matching Light mode).
     - Set `darkTheme.surface.header = '#17120E'`.
     - Set `darkTheme.brand.success = '#22C55E'`, `darkTheme.brand.danger = '#EF4444'`.
     - Fix comment at line 42: change `// Xanh Lá Mộc (Tính Tiền & Báo Xong)` to `// Xanh Lá Mộc (Status Dot & Icon Check)`.
   - `tokens.ts`:
     - Update `TYPOGRAPHY_TIERS` to include all 7 tiers: `['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'display'] as const`.
     - Update `TEXT_INPUT_FONT_SIZES = [16, 18, 22] as const` (remove 14).
   - `typography.ts`:
     - Fix `xxs` line-height on line 52 to 16px (standard Apple HIG xxs: 12px, line-height 16px).
2. Typography 7-Tier Defaults & M3 Remnants (`frontend/lib/components/ui/`):
   - `AppText.tsx`: Set default fallback `variant = 'md'` (line 63) so unspecified <AppText> automatically uses the 18px backbone.
   - `AppHeader.tsx`: line 248, change `variant="labelLarge"` to `variant="sm" weight="medium"`.
   - `BottomNavBar.tsx`:
     - line 228, change `variant="labelSmall"` to `variant="xs"`.
     - line 293, change legacy neon orange `rgba(255, 107, 0, ...)` to `isDark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(180, 83, 9, 0.12)'` (Indochine Vàng Đồng Thau active tab).
   - `Card.tsx`: line 67, change `variant="titleMedium"` to `variant="md"`.
3. Apple Warm Orange Action Thread:
   - `frontend/lib/components/pos/MobileCartBar.tsx`: line 132, change `backgroundColor: theme.brand.success` to `backgroundColor: theme.brand.accent` (Apple Warm Orange #B45309) for the TÍNH TIỀN button.
   - `frontend/lib/components/pos-home/TabletCartPane.tsx`: line 392, change `variant="default"` to `variant="accent"` for the "Tính Tiền" CTA button.
4. Hardcoded Hex Elimination (12 spots):
   - `frontend/app/bao-cao-loi-nhuan/index.tsx`: lines 736, 768: replace `#F3EFEA` with `theme.surface.header`.
   - `frontend/app/bao-cao-loi-nhuan/_components/ReportRevenueBarChart.tsx`: lines 134, 205, 206: replace `#F5F3EF`, `#44403C`, `#CBD5E1` with semantic tokens (`theme.isDark ? theme.surface.header : theme.surface.app`, `theme.text.muted`, `theme.surface.switchTrack`).
   - `frontend/app/login/index.tsx`: line 744: replace `#000` with `theme.surface.shadow`.
   - `frontend/app/login/_components/SaaSAccountForm.tsx`: lines 896, 981: replace `#000` with `theme.surface.shadow`.
   - `frontend/app/thanh-toan/_components/VietQRPaymentPane.tsx`: lines 104, 115, 116: replace `#FFFFFF` with `theme.surface.qrCanvas` and `theme.text.onBrand`.
   - `frontend/lib/components/pos/TablePickerModal.tsx`: line 268: replace `#DCFCE7` with `theme.status.readyBg`.

Verification Requirements:
- Run `cd frontend && npx tsc --noEmit` and confirm 0 errors (Exit code 0).
- Write a detailed completion report to:
  d:/duanpos-ongchu/.agents/teamwork_preview_worker_m1/handoff.md
- Use send_message to report completion when done.

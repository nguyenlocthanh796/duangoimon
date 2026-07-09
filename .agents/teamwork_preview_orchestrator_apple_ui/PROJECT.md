# Project: Apple UI Optimization

## Architecture
- The frontend is a React Native / Expo application using Expo SDK 57, React Native 0.86, expo-router v4, Tailwind CSS / NativeWind, and TypeScript.
- Safe Area View is used across screens to support iOS devices.
- Custom fonts are loaded using `expo-font` or `@expo-google-fonts/be-vietnam-pro` in `app/_layout.tsx`.
- Tailwind configuration maps default or utility fonts/colors to standard design tokens.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Font Integration | Install `@expo-google-fonts/be-vietnam-pro`, import/load font in `app/_layout.tsx`, map font family in `tailwind.config.js` | None | IN_PROGRESS |
| 2 | Sizing, Padding, Touch Targets, and Sharp Corners | Standardize touch targets (>= 44 pt), remove large corners (rounded-2xl/3xl to rounded-sm/md/<= 4px) | M1 | IN_PROGRESS |
| 3 | Responsive Layout Verification | Optimize text sizes, grid, flex, paddings/margins for iPhone and iPad, keeping core structures intact | M2 | IN_PROGRESS |
| 4 | Verification & Forensic Audit | Run TypeScript compilation check, run build/export check, and run Forensic Audit verification | M3 | PLANNED |

## Explorer Input Reports
- [Explorer 1 Report](../../teamwork_preview_explorer_apple_ui_1/analysis.md)
- [Explorer 3 Report](../../teamwork_preview_explorer_apple_ui_3/analysis.md)

## Interface Contracts
- Default Font Family: "BeVietnamPro_400Regular", "BeVietnamPro_500Medium", "BeVietnamPro_600SemiBold", "BeVietnamPro_700Bold".
- Interactive element min height/width: 44 pt (via touch target, padding, or absolute sizing).
- Corner radius limit: <= 4 pt or Tailwind utilities `rounded-sm`, `rounded-md`, or `rounded-none`.

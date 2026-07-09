## 2026-07-09T10:33:30+07:00
<USER_REQUEST>
You are a codebase implementer. Your working directory is `e:\posa\.agents\teamwork_preview_worker_m3_login_sidebar`.
Your task is to optimize the styling, typography, touch targets, and hover feedback for:
1. `app/login.tsx`
2. `lib/components/auth/LoginForm.tsx`
3. `lib/components/Sidebar.tsx`

Specific changes:
- Bolding:
  - Reduce manual bolding override (`fontWeight: '800'` or `'900'`) on headers and brands. Modify `brandName` and `phoneBrandName` in `app/login.tsx` and `"POS Pro"` in `Sidebar.tsx` to use `fontWeight: '700'` or `'600'`.
  - In `LoginForm.tsx`, reduce `welcome` font weight to `'700'` or `'600'`, `loginText` weight to `'600'`, and remove excessive weights on small labels/pills (use `'500'` or `'600'`).
- Touch Targets:
  - Ensure all clickable elements have touch targets of at least 44x44 pt.
  - In `LoginForm.tsx`, adjust the eye toggle icon `TouchableOpacity` to have padding 12 or set width/height to 44.
  - In `LoginForm.tsx`, ensure preset pills (`PresetPill`) have a `minHeight` of 44 and `minWidth: 44` (or padding vertical/horizontal that guarantees at least 44pt height/width).
  - In `Sidebar.tsx`, verify that sidebar navigation items and the logout button have touch targets >= 44 pt (they should have minHeight >= 44).
- Hover & Pointer States:
  - Add hover state styling to interactive buttons, text links, presets, and sidebar navigation items. You can use standard React Native `useState(false)` tracking for mouse hover (`onMouseEnter={() => setHovered(true)}` and `onMouseLeave={() => setHovered(false)}`) and apply a visual cue like a slightly lighter/darker background color or subtle opacity change.
- Compilation:
  - Verify that the code compiles cleanly (`npx tsc --noEmit`) and there are no syntax or type errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

</USER_REQUEST>

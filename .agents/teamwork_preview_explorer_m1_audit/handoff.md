# Handoff Report - Typography, Border Radiuses, and Touch Targets Audit

## 1. Observation
We conducted a read-only codebase audit of target files in `e:\posa\frontend`. Below are the verbatim definitions, styles, and occurrences observed:

- **Typography Definitions (`lib/theme/typography.ts`):**
  - Line 14: `h1: { fontFamily: 'BeVietnamPro_800ExtraBold', fontSize: scale(24), fontWeight: '800' as const, ... }`
  - Line 15: `h2: { fontFamily: 'BeVietnamPro_800ExtraBold', fontSize: scale(20), fontWeight: '800' as const, ... }`
  - Line 22: `price: { fontFamily: 'BeVietnamPro_800ExtraBold', fontSize: scale(17), fontWeight: '800' as const, ... }`
  - Line 23: `priceLarge: { fontFamily: 'BeVietnamPro_900Black', fontSize: scale(24), fontWeight: '900' as const, ... }`

- **Missing Font Token Typo:**
  - Standard KPI layout cards in management screens use `statValue: { ...font.h4, fontWeight: '900', ... }` (e.g. `e:\posa\frontend\app\quan-ly\audit.tsx` line 189, `bi-reports.tsx` line 203, `booking.tsx` line 246, `branches.tsx` line 188, etc.), but `font.h4` does not exist in `typography.ts`.

- **Border-Radius Definitions (`lib/theme/shape.ts`):**
  - Line 9: `radius: { sm: 4, md: 4, lg: 4, full: 4 }`
  *Hardcoded 3px radiuses were observed on progress bar components:*
  - `app/quan-ly/bi-reports.tsx` lines 82-83: `borderRadius: 3`
  - `app/quan-ly/customers.tsx` lines 99-100: `borderRadius: 3`
  - `app/quan-ly/menu-eng.tsx` lines 111-112: `borderRadius: 3`

- **Touch Targets Under 44x44 pt:**
  - Header action buttons: `height: 38` (e.g. `app/ke-toan/index.tsx` line 204) or `width: 36, height: 36` (e.g. `app/quan-ly/branches.tsx` line 185).
  - List table rows: `paddingVertical: 10` on the row wrapper (`s.tr` or `tableRow` style) yielding a target height of ~36–38 pt.
  - Filter chips and tabs: `paddingVertical` values between 3 and 7 (e.g. `app/ke-toan/index.tsx` line 212 has `paddingVertical: 6`).

- **Cursor/Hover Support:**
  - Audit files exclusively use `TouchableOpacity` with `activeOpacity` for interactive feedback. No custom hover states (`hoverStyle` / changes in background color) are implemented.

---

## 2. Logic Chain
1. **Excessive Bolding:**
   - Overriding typographic tokens (which already incorporate `fontWeight: '800'` or `BeVietnamPro_800ExtraBold`) with `fontWeight: '900'` in styles like `panelStatValue: { ...font.h1, fontWeight: '900' }` results in double-bolding/layout engine scaling issues.
   - The use of `font.h4` (which is undefined) results in no base font settings being applied.

2. **Border-Radius Harmonization:**
   - Since `shape.radius.md`, `shape.radius.lg`, and `shape.radius.full` all evaluate to `4px` in `lib/theme/shape.ts`, any component using these shape tokens is already harmonized to 4px.
   - Hardcoded `borderRadius: 3` values on progress bars deviate from this standard and should be updated to `4` (or `shape.radius.sm`).
   - Proportional values like `borderRadius: size / 2` (or FABs with `borderRadius: 28`) are circular shapes rather than block borders, so they should not be changed to 4px.

3. **Touch Targets Accessibility:**
   - Elements with heights of 36–38 pt (header buttons, table list rows) or padding-based chips (~25 pt high) fail the 44x44 pt touch target accessibility guideline, risking mis-taps on tablet/mobile screens.

4. **Cursor/Mouse Support:**
   - While React Native Web provides basic `cursor: 'pointer'` behavior for `TouchableOpacity`, the lack of hover visual style changes makes the desktop/web version of the application feel static.

---

## 3. Caveats
- No actual code modifications were made (read-only audit).
- Component imports (like `FAB` or `LoginForm`) were not deeply audited, only target files listed in the prompt.
- We assume that `shape.radius` values in `shape.ts` are intended to stay at `4` to achieve the 4px border radius harmonization.

---

## 4. Conclusion
1. **Typography**: Replace the missing `font.h4` reference in KPI stat cards with `font.bodyBold` or define `h4` in `typography.ts`. Remove `fontWeight: '900'` overrides from elements that already inherit a bold font family.
2. **Border Radius**: Change progress bar `borderRadius: 3` to `borderRadius: 4` (or `shape.radius.sm`) in `bi-reports.tsx`, `customers.tsx`, and `menu-eng.tsx`.
3. **Touch Targets**: Increase header buttons height to `44`. Increase `paddingVertical: 10` on table rows (`tr` / `tableRow` styles) to `13` or `14` to guarantee a minimum height of `44 pt`. Add `minHeight: 44` or appropriate paddings to filter chips and tabs.
4. **Cursor/Mouse**: Add hover state triggers (`onMouseEnter` / `onMouseLeave` or pressable hover states) to buttons and list rows for better desktop/tablet UX.

---

## 5. Verification Method
1. Open the target files and search for each specific style definition listed in `e:\posa\.agents\teamwork_preview_explorer_m1_audit\analysis.md` to verify file name and line numbers.
2. To test the touch target sizing, run the application web build or inspect the components using React Native Debugger / layout inspector on an emulator to confirm pixel heights.
3. Review `lib/theme/typography.ts` to confirm the absence of `font.h4`.

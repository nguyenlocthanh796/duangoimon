## 2026-07-09T03:33:30Z
Optimize the styling, typography, touch targets, and hover feedback for the management module screens:
- All screens under `app/quan-ly/*` (e.g. index.tsx, tables.tsx, menu.tsx, users.tsx, reports.tsx, booking.tsx, customers.tsx, shifts.tsx, recipes.tsx, stock.tsx, suppliers.tsx, purchase-orders.tsx, marketing.tsx, membership.tsx, promo.tsx, menu-eng.tsx, bi-reports.tsx, exec-dashboard.tsx, stations.tsx, branches.tsx, forecast.tsx, audit.tsx).

Specific changes:
- Exclusions:
  - Absolutely do NOT modify any file under `app/ban-hang/*` or sales-related components.
- Bolding:
  - In stat cards / KPI cards, look for `statValue: { ...font.h4, fontWeight: '900', ... }` (or similar font overrides) and remove the `fontWeight: '900'` override, relying on the newly-defined `font.h4` (defined as 600 weight) or `font.bodyBold`.
  - In other styles like `panelStatValue` and `detailValue` (overridden with `fontWeight: '900'`), change the weight to `700` or `600` to avoid excessive bolding.
- Border Radius:
  - Harmonize progress bar border-radiuses from `3px` to `4` (or `shape.radius.sm`) in `bi-reports.tsx`, `customers.tsx`, and `menu-eng.tsx`.
  - Do NOT change circular buttons or elements (like FABs with width 56, height 56, radius 28) since their radius is geometric.
- Touch Targets:
  - Ensure all buttons, clickable icons, filter chips, and interactive list rows have a touch target of at least 44x44 pt.
  - Header buttons like `addBtn`, `refreshBtn`, `headerBtn` (currently height 38 or width 36/height 36) -> change to `height: 44` or `width: 44, height: 44`.
  - Table/list rows (currently `paddingVertical: 10` on the row container styles `tr` or `tableRow`) -> change `paddingVertical` to `13` or `14` (to guarantee >=44pt height), or set `minHeight: 44`.
  - Filter chips / tabs (currently paddingVertical 5 to 7) -> change to `minHeight: 44` or increase padding vertical.
  - Area chips, capacity buttons in tables (currently width 44, height 40) -> change to height 44 (`width: 44, height: 44`).
- Hover & Pointer States:
  - Add hover state styling to buttons, chips, tabs, and clickable list rows using `onMouseEnter` / `onMouseLeave` state triggers and changing backgrounds/opacity.
- Compilation:
  - Verify that the code compiles cleanly (`npx tsc --noEmit`) and there are no syntax or type errors.

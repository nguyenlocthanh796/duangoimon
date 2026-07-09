# Audit Analysis - Typography, Border Radiuses, and Touch Targets

This report documents findings from a read-only investigation of target files in `e:\posa\frontend` regarding:
- Typography & Bolding Issues
- Border Radius Harmonization
- Touch Targets (<44x44 pt)
- Interactive Elements & Cursor/Touch Support

---

## 1. Target Files Audited
- `app/login.tsx`
- `lib/components/Sidebar.tsx`
- `app/ke-toan/_layout.tsx`
- `app/ke-toan/index.tsx`
- `app/ke-toan/invoices.tsx`
- All screens under `app/quan-ly/*` (24 files total including dashboard index and layout)
- `lib/theme/typography.ts`

*Exclusion Note: No files under `app/ban-hang/*` or sales-related components were analyzed.*

---

## 2. Typography & Excessive Bolding

### High Font-Weight Tokens in `lib/theme/typography.ts`
- `h1`: Uses `fontWeight: '800'` and `BeVietnamPro_800ExtraBold`.
- `h2`: Uses `fontWeight: '800'` and `BeVietnamPro_800ExtraBold`.
- `price`: Uses `fontWeight: '800'` and `BeVietnamPro_800ExtraBold`.
- `priceLarge`: Uses `fontWeight: '900'` and `BeVietnamPro_900Black`.
*(All other tokens like `h3`, `bodyBold`, `button`, `tab` use weight `700`, and `label` / `badge` use `600`.)*

### Excessive Bolding & Overrides
Throughout the audited files, there are numerous inline style overrides that apply excessive bolding (`fontWeight: '800'` or `'900'`) or manually apply `'700'` to small texts, leading to visual clutter:

1. **`app/login.tsx`**
   - Line 193: `brandName` uses `fontWeight: '800'` (font size 34).
   - Line 216: `phoneBrandName` uses `fontWeight: '800'` (font size 26).

2. **`lib/components/Sidebar.tsx`**
   - Line 147: `fontWeight: '900'` applied directly to text `"POS Pro"`.

3. **`app/ke-toan/index.tsx`**
   - Line 171: `fontWeight: '800'` on amount text (phone layout).
   - Line 260: `fontWeight: '900'` applied to `kpiValue`.

4. **`app/ke-toan/invoices.tsx`**
   - Line 180 & 210: `fontWeight: '800'` on total amount text.
   - Line 292: `fontWeight: '900'` on `statCount`.

5. **`app/quan-ly/*` (Management Screens)**
   - **Codebase Typo/Issue**: In almost all audited management screens, the KPI stat values use `statValue: { ...font.h4, fontWeight: '900', ... }` (e.g. `audit.tsx` line 189, `bi-reports.tsx` line 203, `booking.tsx` line 246, `branches.tsx` line 188, `customers.tsx` line 178, etc.). However, **`font.h4` is undefined in `typography.ts`**, causing `{ ...font.h4 }` to evaluate to `{}`. Consequently, these elements render with a hardcoded `900` weight without any font family base.
   - Overriding Heading Tokens with `900` weight:
     - `audit.tsx` line 206: `panelStatValue: { ...font.h1, fontWeight: '900' }` (overriding `font.h1`'s natural `800` weight).
     - `booking.tsx` line 264: `panelStatValue: { ...font.h1, fontWeight: '900' }`.
     - `forecast.tsx` line 185: `panelStatValue: { ...font.h1, fontWeight: '900' }`.
     - `menu-eng.tsx` line 272 & 288: `panelStatValue` and `detailValue` overridden with `fontWeight: '900'`.
     - `menu.tsx` line 270: `panelStatValue: { ...font.h2, fontWeight: '900' }`.
     - `reports.tsx` line 318: `panelStatValue: { ...font.h2, fontWeight: '900' }`.
     - `users.tsx` line 305: `panelStatValue: { ...font.h2, fontWeight: '900' }`.
   - Small texts overridden with `900` or `800` weight:
     - `menu-eng.tsx` lines 155, 164: Rank dots use `fontWeight: '900'` on `micro` text.

---

## 3. Border Radiuses & Harmonization

### Current Setup in `lib/theme/shape.ts`
The design tokens in `lib/theme/shape.ts` are defined as:
```typescript
export const shape = {
  radius: {
    sm: 4,
    md: 4,
    lg: 4,
    full: 4,
  },
};
```
This means that any layout container or button utilizing `shape.radius` tokens (`shape.radius.md`, `shape.radius.lg`, or `shape.radius.full`) is **already resolving to 4px**.

### Tailwind Classes
- **None observed**: The frontend uses React Native `StyleSheet.create` for style definitions instead of Tailwind CSS. Therefore, no Tailwind classes (like `rounded-lg`, etc.) exist in the audited files.

### Hardcoded Radiuses that deviate from 4px
The audit identified several hardcoded `borderRadius` definitions:
1. **Progress Bar Elements (deviate to 3px)**
   - `bi-reports.tsx` lines 82, 83, 101, 102: `borderRadius: 3` (on progress bar elements/bars).
   - `customers.tsx` lines 99, 100: `borderRadius: 3` (on spent progress bar).
   - `menu-eng.tsx` lines 111, 112: `borderRadius: 3` (on popularity progress bar).
   *Recommendation: Harmonize these progress bar radiuses to 4px.*

2. **Circular Elements (intentional proportional radiuses)**
   - The following represent circular dots or floating action buttons (FABs) where the border radius matches half of the width/height to make them circular:
     - `app/login.tsx` line 43: `borderRadius: size / 2` (floating background orbs).
     - Circular indicator dots (e.g. `audit.tsx` line 209: `panelRowDot` width 8/height 8/radius 4; `booking.tsx` line 110: radius 4; `membership.tsx` lines 97, 118: radius 6/5).
     - Floating Action Buttons (FABs) (e.g. `purchase-orders.tsx` line 387, `stock.tsx` line 511, `suppliers.tsx` line 378: width 56, height 56, `borderRadius: 28`).
     - Action dots in row details (e.g. `recipes.tsx` line 442, `stock.tsx` line 488, `suppliers.tsx` line 360: width 3, height 3, `borderRadius: 1.5`).
   *Recommendation: Retain these as they represent circular geometry rather than block corners.*

---

## 4. Touch Targets Under 44x44 pt

The minimum recommended touch target size is 44x44 pt. The following interactive elements are below this threshold:

### A. Header Buttons (Add / Refresh)
- `app/ke-toan/index.tsx` line 204: `addBtn` has `height: 38`.
- `app/ke-toan/invoices.tsx` line 252: `addBtn` has `height: 38`.
- `app/quan-ly/index.tsx` line 107: `refreshBtn` has `width: 36, height: 36`.
- `app/quan-ly/index.tsx` line 110: `pillBtn` (Bán hàng) has `paddingVertical: 8` and `paddingHorizontal: 12` (estimated height ~33 pt).
- `app/quan-ly/booking.tsx` line 191: `addBtn` has `height: 38`.
- `app/quan-ly/branches.tsx` line 146: `addBtn` has `width: 36, height: 36`.
- `app/quan-ly/exec-dashboard.tsx` line 129: `refreshBtn` has `width: 36, height: 36`.
- `app/quan-ly/marketing.tsx` line 143: `addBtn` has `width: 36, height: 36`.
- `app/quan-ly/membership.tsx` line 150: `addBtn` has `width: 36, height: 36`.
- `app/quan-ly/menu.tsx` line 225: `addBtn` has `height: 38`.
- `app/quan-ly/promo.tsx` line 142: `addBtn` has `height: 38`.
- `app/quan-ly/purchase-orders.tsx` line 251: `headerBtn` has `width: 36, height: 36`.
- `app/quan-ly/purchase-orders.tsx` line 254: `addBtn` has `height: 38`.
- `app/quan-ly/recipes.tsx` line 346: `headerBtn` has `width: 36, height: 36`.
- `app/quan-ly/recipes.tsx` line 349: `addBtn` has `height: 38`.
- `app/quan-ly/reports.tsx` line 147: `iconBtn` (Refresh) has `width: 36, height: 36`.
- `app/quan-ly/stations.tsx` line 147: `addBtn` has `width: 36, height: 36`.
- `app/quan-ly/stock.tsx` line 347: `headerBtn` has `width: 36, height: 36`.
- `app/quan-ly/stock.tsx` line 350: `addBtn` has `height: 38`.
- `app/quan-ly/suppliers.tsx` line 231: `headerBtn` has `width: 36, height: 36`.
- `app/quan-ly/suppliers.tsx` line 234: `addBtn` has `height: 38`.
- `app/quan-ly/tables.tsx` line 221: `addBtn` has `height: 38`.
- `app/quan-ly/users.tsx` line 249: `addBtn` has `height: 38`.

### B. Table List Rows (`tr` / `tableRow` style)
In almost all list screens, tapping a row selects/opens detail side panels. However, these rows are too thin:
- `app/ke-toan/index.tsx` line 145: `tableRow` has `paddingVertical: 11` (estimated height ~38 pt).
- `app/ke-toan/invoices.tsx` line 200: `tableRow` has `paddingVertical: 11` (estimated height ~38 pt).
- `app/quan-ly/audit.tsx`, `bi-reports.tsx`, `booking.tsx`, `branches.tsx`, `customers.tsx`, `exec-dashboard.tsx`, `forecast.tsx`, `marketing.tsx`, `membership.tsx`, `menu-eng.tsx`, `promo.tsx`, `shifts.tsx`, `stations.tsx`:
  - `tr` style defines `paddingVertical: 10`, making the row touch target height ~36–38 pt.

### C. Chips, Tabs, and Action Badges
- `app/ke-toan/index.tsx` line 212: Filter chips have `paddingVertical: 6` (estimated height ~25 pt).
- `app/ke-toan/invoices.tsx` line 122: `statusPill` is wrapped in a `TouchableOpacity` but has no `onPress` prop. It has `paddingVertical: 3` (estimated height ~16 pt).
- `app/ke-toan/invoices.tsx` line 188: `exportBtn` has `minHeight: 30` and `paddingVertical: 6`.
- `app/quan-ly/booking.tsx` line 109: Status filter row items (`panelRow` with `statusFilter`) have only horizontal padding adjustments and negative margins, height is below 44 pt.
- `app/quan-ly/booking.tsx` line 116: "Xoá bộ lọc" button has `paddingVertical: 4`.
- `app/quan-ly/booking.tsx` line 268: `panelBtn` has `paddingVertical: 8` (estimated height ~33 pt).
- `app/quan-ly/branches.tsx` line 202: `panelBtn` has `paddingVertical: 8` (estimated height ~33 pt).
- `app/quan-ly/exec-dashboard.tsx` line 171: Filter `chip` has `paddingVertical: 7` (estimated height ~27 pt).
- `app/quan-ly/forecast.tsx` line 167: Filter `chip` has `paddingVertical: 7`.
- `app/quan-ly/marketing.tsx` line 195: Filter `chip` has `paddingVertical: 7`.
- `app/quan-ly/marketing.tsx` line 205: `activeChip` has `paddingVertical: 6`.
- `app/quan-ly/membership.tsx` line 207: `panelBtn` has `paddingVertical: 8`.
- `app/quan-ly/promo.tsx` line 201: Tab buttons have `paddingVertical: 7`.
- `app/quan-ly/promo.tsx` line 208: `activeChip` has `paddingVertical: 4`.
- `app/quan-ly/purchase-orders.tsx` line 353: Status filter `chip` has `paddingVertical: 5`.
- `app/quan-ly/purchase-orders.tsx` line 370: Card `actionBtn` has `paddingVertical: 4`.
- `app/quan-ly/purchase-orders.tsx` line 377: `panelBtn` has `paddingVertical: 8`.
- `app/quan-ly/recipes.tsx` line 455: `chip` has `paddingVertical: 5`.
- `app/quan-ly/recipes.tsx` line 464: `panelBtn` has `paddingVertical: 6`.
- `app/quan-ly/reports.tsx` line 308: Filter `chip` has `paddingVertical: 7`.
- `app/quan-ly/shifts.tsx` line 255: `mobileCloseBtn` has `paddingVertical: 6`.
- `app/quan-ly/stations.tsx` line 192: `activeChip` has `paddingVertical: 3`.
- `app/quan-ly/stations.tsx` line 215: `panelBtn` has `paddingVertical: 8`.
- `app/quan-ly/stock.tsx` line 461: Category filter `chip` has `paddingVertical: 5`.
- `app/quan-ly/stock.tsx` line 496: `panelBtn` has `paddingVertical: 6`.
- `app/quan-ly/suppliers.tsx` line 368: `panelBtn` has `paddingVertical: 6`.
- `app/quan-ly/tables.tsx` line 150: area chip has `paddingVertical: 7`.
- `app/quan-ly/tables.tsx` line 177: capacity button is `width: 44, height: 40` (height under 44 pt).
- `app/quan-ly/tables.tsx` line 243 & 315: area filter chips have `height: 34`.
- `app/quan-ly/users.tsx` line 314: `panelCta` has `minHeight: 32`.

---

## 5. Interactive Elements & Cursor/Touch Support

- **Touchable Components**: Interactable elements are built using React Native's `TouchableOpacity`. This provides immediate visual feedback through opacity changes (configured via `activeOpacity={0.7}` or similar, falling back to default `0.2` if omitted).
- **Gesture Support**: `lib/components/Sidebar.tsx` utilizes `PanResponder` to allow users on touch-based devices to swipe left to dismiss the drawer.
- **Mouse Pointer / Hover States**:
  - Since the UI runs on Web/Desktop, the browser automatically maps React Native Web's `TouchableOpacity` to render a cursor change (`cursor: 'pointer'`).
  - However, there are **no hover state styling definitions** (such as variations in background color or text highlight when the mouse hovers over buttons/chips/rows) in any of the audited files. This reduces desktop/tablet usability as there's no hover pre-attentive feedback.

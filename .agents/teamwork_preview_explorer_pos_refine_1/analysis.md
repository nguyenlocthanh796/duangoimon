# Codebase Analysis: borderRadius Styling in pos.tsx

This report lists all styles in `frontend/app/ban-hang/pos.tsx` where the `borderRadius` (or related border radius properties like `borderBottomLeftRadius`, `borderTopRightRadius`) exceeds **4px**. It also provides recommendations for styling replacements to transition to a less rounded (sharp/blocky) styling.

---

## 1. Summary of Findings

- A total of **36 instances** across **35 distinct lines** were identified where `borderRadius` style parameters exceed `4px`.
- The values range from `6px` up to `36px` (e.g. circles, highly rounded pill shapes, or rounded cards/modals).
- All style attributes are defined as inline styles within the React components; there are no external CSS files or `StyleSheet.create` rule declarations containing these properties (except `StyleSheet.absoluteFill` which has no border radius).

---

## 2. Enumeration of borderRadius > 4px

| # | Line Number | Element / Component | Current Style Property | Current Value | Context / Purpose |
|---|---|---|---|---|---|
| 1 | 241 | Category tabs | `borderRadius` | `isWide ? 22 : 17` | Pill-shaped category tab |
| 2 | 284 | Product card | `borderRadius` | `16` | Main card container in the grid |
| 3 | 313 | Cart count badge | `borderRadius` | `10` | Circular badge for item count |
| 4 | 319 | Modifier badge | `borderRadius` | `6` | Badge indicating modifiers on item |
| 5 | 329 | Quick-add button | `borderRadius` | `16` | Circle button with "+" icon |
| 6 | 355 | Mobile cart back button | `borderRadius` | `20` | Circular button with arrow icon |
| 7 | 360 | Mobile cart count badge | `borderRadius` | `20` | Pill-shaped count indicator |
| 8 | 370 | Empty mobile cart icon | `borderRadius` | `36` | Circular background for basket icon |
| 9 | 382 | Mobile cart item index | `borderRadius` | `8` | Rounded index badge |
| 10 | 399 | Mobile cart stepper container | `borderRadius` | `20` | Pill-shaped border enclosing +/- |
| 11 | 425 | Mobile cart "LƯU BÀN" | `borderRadius` | `14` | Rounded primary action button |
| 12 | 430 | Mobile cart "T.TOÁN" | `borderRadius` | `14` | Rounded primary action button |
| 13 | 455 | Wide cart count badge | `borderRadius` | `20` | Pill-shaped count indicator |
| 14 | 469 | Wide cart item index | `borderRadius` | `6` | Rounded index badge |
| 15 | 478 | Wide cart remove button | `borderRadius` | `18` | Circular close button |
| 16 | 490 | Wide cart stepper container | `borderRadius` | `20` | Pill-shaped border enclosing +/- |
| 17 | 512 | Wide cart "LƯU BÀN" | `borderRadius` | `14` | Rounded action button |
| 18 | 516 | Wide cart "T.TOÁN" | `borderRadius` | `14` | Rounded action button |
| 19 | 556 | Mobile cart bar trigger | `borderRadius` | `12` | Pill-shaped trigger at bottom |
| 20 | 577 | Main header sidebar menu | `borderRadius` | `22` | Circular icon button |
| 21 | 581 | Main header back button | `borderRadius` | `22` | Circular icon button |
| 22 | 591 | Main header "Hủy bàn" | `borderRadius` | `10` | Action button in header |
| 23 | 643 | Modifier modal container | `borderRadius` | `isWide ? 24 : 0` | Rounded modal container (on wide screen) |
| 24 | 660 | Modifier modal close button | `borderRadius` | `20` | Circular header close button |
| 25 | 668 | Modifier modal qty card | `borderRadius` | `16` | Rounded section card |
| 26 | 672 | Modifier modal qty minus | `borderRadius` | `14` | Rounded stepper button |
| 27 | 677 | Modifier modal qty plus | `borderRadius` | `14` | Rounded stepper button |
| 28 | 695 | Modifier modal size button | `borderRadius` | `14` | Size option select box |
| 29 | 704 | Modifier modal size badge (Left) | `borderBottomLeftRadius` | `10` | Top-right selected status badge |
| 30 | 704 | Modifier modal size badge (Right) | `borderTopRightRadius` | `14` | Top-right selected status badge |
| 31 | 726 | Modifier modal topping button | `borderRadius` | `12` | Topping option select row |
| 32 | 733 | Modifier modal topping checkbox | `borderRadius` | `6` | Checkbox status indicator |
| 33 | 759 | Modifier modal quick note | `borderRadius` | `22` | Pill-shaped quick note option |
| 34 | 772 | Modifier modal note input | `borderRadius` | `12` | Text input border |
| 35 | 790 | Modifier modal cancel button | `borderRadius` | `14` | Action button in modal |
| 36 | 802 | Modifier modal submit button | `borderRadius` | `14` | Action button in modal |

---

## 3. Styling Replacement Recommendations

To transition from the current highly rounded styling (12px to 24px) to a professional, sharp/blocky look with a `borderRadius` limit of `4px`, the following replacements are proposed:

### Recommendation Categories

1. **Large Containers & Cards (Current: 16px - 24px)**
   * *Target elements*: Product cards (line 284), Modifier modal container (line 643), Qty stepper card (line 668).
   * *Action*: Replace with `borderRadius: 4`.
   * *Rationale*: Maintains structural bounds with a clean, sub-pixel/subtle rounded corner typical of blocky UI designs.

2. **Buttons & Actions (Current: 10px - 22px)**
   * *Target elements*: Primary buttons (lines 425, 430, 512, 516, 790, 802), Header actions (lines 591), and Quick notes (line 759).
   * *Action*: Replace with `borderRadius: 4`.
   * *Rationale*: Harmonizes call-to-actions under a uniform blocky shape.

3. **Circles & Circular Badges (Current: 10px - 36px)**
   * *Target elements*: Cart count badge (line 313), Quick-add button (line 329), Icon buttons (lines 355, 478, 577, 581, 660), Empty cart icon background (line 370), Index badges (lines 382, 469), Stepper buttons (lines 672, 677).
   * *Action*: Replace with `borderRadius: 4` (or `borderRadius: 2` for small items like checkboxes/badges to avoid looking circular).
   * *Rationale*: Transitioning these circular designs to slightly rounded squares/rectangles reinforces the sharp/blocky theme without losing visual clarity.

4. **Option Selectors & Stepper Outlines (Current: 6px - 20px)**
   * *Target elements*: Category tabs (line 241), Stepper borders (lines 399, 490), Size selectors (line 695), Size check badges (line 704), Topping selectors (line 726), Topping checkboxes (line 733), Note input (line 772).
   * *Action*: Replace with `borderRadius: 4` or `borderRadius: 2` (checkboxes/badges). For the check badge (line 704), replace `borderBottomLeftRadius: 10` and `borderTopRightRadius: 14` with `borderBottomLeftRadius: 4` and `borderTopRightRadius: 4` respectively.

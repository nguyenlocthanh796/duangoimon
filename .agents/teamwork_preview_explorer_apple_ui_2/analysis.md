# Apple UI Optimization Plan & Analysis Report

This report outlines the proposed changes to the frontend codebase in `e:\posa\frontend` to optimize it for Apple platforms (iPad/iPhone) under the key design constraints of font integration (Be Vietnam Pro), touch targets (minimum 44 pt), sharp styling (border radius <= 4px), and responsive layout optimizations.

---

## 1. Summary of Key Findings & Plan

1. **Font Integration**: The app currently loads `Inter` from `@expo-google-fonts/inter` in `app/_layout.tsx` and defines it as the stylesheet default in `lib/theme/typography.ts`. We will install `@expo-google-fonts/be-vietnam-pro`, reload it in `app/_layout.tsx`, map it to Tailwind `sans` and custom weight classes in `tailwind.config.js`, and map the specific weights in `lib/theme/typography.ts` to ensure full cross-platform compatibility (especially for Android and iOS weight rendering).
2. **Sharp Styling**: The codebase does not use Tailwind `rounded-` classes for layout boxes/cards (NativeWind exists but is not used for this). Instead, it uses a theme config (`lib/theme/shape.ts`) and direct stylesheet properties.
   - We will adjust `radius.sm`, `radius.md`, and `radius.lg` in `lib/theme/shape.ts` to be `2` and `4`.
   - We will modify **30 files** containing hardcoded `borderRadius` values greater than 4, setting them to `4` or less. We will preserve circular status indicators, bullet dots, and FABs.
3. **Touch Target Size**: Many interactive elements (tabs, search inputs, quantity +/- buttons, sidebar closer, small action buttons) have heights/widths of 30-42 pt, violating the Apple 44 pt touch target guideline. We will expand their physical size to `44 pt` or use React Native's `hitSlop` property to expand the touch area without breaking compact visuals.
4. **Responsive Scaling**: We will introduce a dynamic spacing and padding scaling system inside `lib/theme/shape.ts` to automatically scale spacing up on iPads and keep it tight on iPhones.

---

## 2. Font Integration & Typography

### Target 1: `package.json`
- **Action**: Install `@expo-google-fonts/be-vietnam-pro` and remove `@expo-google-fonts/inter`.
- **Change**:
  ```json
  // Under dependencies:
  "@expo-google-fonts/be-vietnam-pro": "^0.4.2"
  ```

### Target 2: `app/_layout.tsx` (Lines 11, 40-43)
- **Change**:
  - **Before**:
    ```typescript
    import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
    ...
    const [fontsLoaded] = useFonts({
      Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
      Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
    });
    ```
  - **After**:
    ```typescript
    import {
      useFonts,
      BeVietnamPro_400Regular,
      BeVietnamPro_500Medium,
      BeVietnamPro_600SemiBold,
      BeVietnamPro_700Bold,
      BeVietnamPro_800ExtraBold,
      BeVietnamPro_900Black,
    } from '@expo-google-fonts/be-vietnam-pro';
    ...
    const [fontsLoaded] = useFonts({
      BeVietnamPro_400Regular,
      BeVietnamPro_500Medium,
      BeVietnamPro_600SemiBold,
      BeVietnamPro_700Bold,
      BeVietnamPro_800ExtraBold,
      BeVietnamPro_900Black,
    });
    ```

### Target 3: `tailwind.config.js` (Lines 9-15)
- **Change**:
  - **Before**:
    ```javascript
      theme: {
        extend: {
          colors: {
            primary: "#F97316",
          }
        },
      },
    ```
  - **After**:
    ```javascript
      theme: {
        extend: {
          fontFamily: {
            sans: ["BeVietnamPro_400Regular"],
            "vietnam-medium": ["BeVietnamPro_500Medium"],
            "vietnam-semibold": ["BeVietnamPro_600SemiBold"],
            "vietnam-bold": ["BeVietnamPro_700Bold"],
            "vietnam-extrabold": ["BeVietnamPro_800ExtraBold"],
            "vietnam-black": ["BeVietnamPro_900Black"],
          },
          colors: {
            primary: "#F97316",
          }
        },
      },
    ```

### Target 4: `lib/theme/typography.ts` (Lines 12-36)
- **Rationale**: Direct custom font families with weights often render poorly on Android or iOS fallback. By mapping each weight to a specific font family configuration, we guarantee exact rendering.
- **Change**:
  - **Before**:
    ```typescript
    const FONT_FAMILY = 'Inter';

    export const font = {
      h1: { fontFamily: FONT_FAMILY, fontSize: scale(24), fontWeight: '800' as const, lineHeight: getLineHeight(scale(24)) },
      h2: { fontFamily: FONT_FAMILY, fontSize: scale(20), fontWeight: '800' as const, lineHeight: getLineHeight(scale(20)) },
      h3: { fontFamily: FONT_FAMILY, fontSize: scale(17), fontWeight: '700' as const, lineHeight: getLineHeight(scale(17)) },
      body:      { fontFamily: FONT_FAMILY, fontSize: scale(15), fontWeight: '500' as const, lineHeight: getLineHeight(scale(15)) },
      bodyBold:  { fontFamily: FONT_FAMILY, fontSize: scale(15), fontWeight: '700' as const, lineHeight: getLineHeight(scale(15)) },
      bodySmall: { fontFamily: FONT_FAMILY, fontSize: scale(13), fontWeight: '500' as const, lineHeight: getLineHeight(scale(13)) },
      price:       { fontFamily: FONT_FAMILY, fontSize: scale(17), fontWeight: '800' as const, lineHeight: getLineHeight(scale(17)) },
      priceLarge:  { fontFamily: FONT_FAMILY, fontSize: scale(24), fontWeight: '900' as const, lineHeight: getLineHeight(scale(24)) },
      button:     { fontFamily: FONT_FAMILY, fontSize: scale(15), fontWeight: '700' as const, lineHeight: getLineHeight(scale(15)) },
      buttonSmall:{ fontFamily: FONT_FAMILY, fontSize: scale(13), fontWeight: '700' as const, lineHeight: getLineHeight(scale(13)) },
      label:  { fontFamily: FONT_FAMILY, fontSize: scale(13), fontWeight: '600' as const, lineHeight: getLineHeight(scale(13)) },
      caption:{ fontFamily: FONT_FAMILY, fontSize: scale(12), fontWeight: '500' as const, lineHeight: getLineHeight(scale(12)) },
      micro: { fontFamily: FONT_FAMILY, fontSize: scale(11), fontWeight: '500' as const, lineHeight: getLineHeight(scale(11)) },
      tab:   { fontFamily: FONT_FAMILY, fontSize: scale(12), fontWeight: '700' as const, lineHeight: getLineHeight(scale(12)) },
      badge: { fontFamily: FONT_FAMILY, fontSize: scale(10), fontWeight: '600' as const, lineHeight: getLineHeight(scale(10)) },
    };
    ```
  - **After**:
    ```typescript
    const FONT_REGULAR = 'BeVietnamPro_400Regular';
    const FONT_MEDIUM = 'BeVietnamPro_500Medium';
    const FONT_SEMIBOLD = 'BeVietnamPro_600SemiBold';
    const FONT_BOLD = 'BeVietnamPro_700Bold';
    const FONT_EXTRABOLD = 'BeVietnamPro_800ExtraBold';
    const FONT_BLACK = 'BeVietnamPro_900Black';

    export const font = {
      h1: { fontFamily: FONT_EXTRABOLD, fontSize: scale(24), lineHeight: getLineHeight(scale(24)) },
      h2: { fontFamily: FONT_EXTRABOLD, fontSize: scale(20), lineHeight: getLineHeight(scale(20)) },
      h3: { fontFamily: FONT_BOLD, fontSize: scale(17), lineHeight: getLineHeight(scale(17)) },
      body:      { fontFamily: FONT_MEDIUM, fontSize: scale(15), lineHeight: getLineHeight(scale(15)) },
      bodyBold:  { fontFamily: FONT_BOLD, fontSize: scale(15), lineHeight: getLineHeight(scale(15)) },
      bodySmall: { fontFamily: FONT_MEDIUM, fontSize: scale(13), lineHeight: getLineHeight(scale(13)) },
      price:       { fontFamily: FONT_EXTRABOLD, fontSize: scale(17), lineHeight: getLineHeight(scale(17)) },
      priceLarge:  { fontFamily: FONT_BLACK, fontSize: scale(24), lineHeight: getLineHeight(scale(24)) },
      button:     { fontFamily: FONT_BOLD, fontSize: scale(15), lineHeight: getLineHeight(scale(15)) },
      buttonSmall:{ fontFamily: FONT_BOLD, fontSize: scale(13), lineHeight: getLineHeight(scale(13)) },
      label:  { fontFamily: FONT_SEMIBOLD, fontSize: scale(13), lineHeight: getLineHeight(scale(13)) },
      caption:{ fontFamily: FONT_MEDIUM, fontSize: scale(12), lineHeight: getLineHeight(scale(12)) },
      micro: { fontFamily: FONT_MEDIUM, fontSize: scale(11), lineHeight: getLineHeight(scale(11)) },
      tab:   { fontFamily: FONT_BOLD, fontSize: scale(12), lineHeight: getLineHeight(scale(12)) },
      badge: { fontFamily: FONT_SEMIBOLD, fontSize: scale(10), lineHeight: getLineHeight(scale(10)) },
    };
    ```

---

## 3. Sharp Border Radius Optimizations

### Theme Modifications: `lib/theme/shape.ts`
We change the standard radius parameters to be 4px or less, while retaining `full` for circles. We also scale spacing responsively for tablet vs mobile devices.
- **Change**:
  - **Before**:
    ```typescript
    export const shape = {
      spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
      },
      radius: {
        sm: 4,
        md: 8,
        lg: 12,
        full: 999,
      },
    };
    ```
  - **After**:
    ```typescript
    import { Dimensions } from 'react-native';

    const { width, height } = Dimensions.get('window');
    const maxDim = Math.max(width, height);
    const isTablet = maxDim >= 1024;

    const scaleSpacing = (size: number) => isTablet ? Math.round(size * 1.25) : size;

    export const shape = {
      spacing: {
        xs: scaleSpacing(4),
        sm: scaleSpacing(8),
        md: scaleSpacing(12),
        lg: scaleSpacing(16),
        xl: scaleSpacing(24),
      },
      radius: {
        sm: 2,
        md: 4,
        lg: 4,
        full: 999,
      },
    };
    ```

### Hardcoded `borderRadius` Code Modifies
The following exact edits are proposed to remove rounded-2xl / rounded-3xl / medium round styling and adjust to a maximum of 4px:

| File Path | Line | Before | After | Rationale |
|---|---|---|---|---|
| `app/login.tsx` | 178 | `borderRadius: 24,` | `borderRadius: 4,` | Remove round card container |
| `app/login.tsx` | 207 | `borderRadius: 24,` | `borderRadius: 4,` | Remove round card container |
| `app/ban-hang/index.tsx` | 133 | `borderRadius: 10` | `borderRadius: 4` | Sharp button |
| `app/ban-hang/kitchen.tsx` | 226 | `borderRadius: 12,` | `borderRadius: 4,` | Sharp connection status badge |
| `app/ban-hang/payment.tsx` | 175 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp card icon visual representation |
| `app/ban-hang/payment.tsx` | 186 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp QR code container |
| `app/ban-hang/payment.tsx` | 199 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp info panel box |
| `app/ban-hang/payment.tsx` | 332 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp card terminal image |
| `lib/components/Sidebar.tsx` | 145 | `borderRadius: 8` | `borderRadius: 4` | Sharp brand logo |
| `lib/components/auth/LoginForm.tsx` | 274 | `borderRadius: 12,` | `borderRadius: 4,` | Sharp login input wrapper |
| `lib/components/auth/LoginForm.tsx` | 315 | `borderRadius: 12,` | `borderRadius: 4,` | Sharp login button |
| `lib/components/auth/LoginForm.tsx` | 340 | `borderRadius: 20,` | `borderRadius: 4,` | Sharp preset account pill |
| `lib/components/auth/LoginForm.tsx` | 121 | `borderRadius={20}` | `borderRadius={4}` | Sharp preset active background gradient |
| `lib/components/management/OccupancyProgress.tsx` | 28 | `borderRadius: 6,` | `borderRadius: 2,` | Less rounded progress bar container |
| `lib/components/payment/CashSuggestions.tsx` | 40 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp cash suggestion pill |
| `lib/components/payment/PickerItem.tsx` | 12 | `borderRadius: 6,` | `borderRadius: 4,` | Sharp payment method selector |
| `lib/components/payment/SplitBillPanel.tsx` | 45 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp split amount input box |
| `lib/components/payment/SplitBillPanel.tsx` | 60 | `borderRadius: 10,` | `borderRadius: 4,` | Sharp pay split bill button |
| `lib/components/pos/CartItemRow.tsx` | 145 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp cart item card |
| `lib/components/pos/CartItemRow.tsx` | 151 | `borderRadius: 6,` | `borderRadius: 4,` | Sharp food image box |
| `lib/components/pos/CartItemRow.tsx` | 209 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp qty control area wrapper |
| `lib/components/pos/CartItemRow.tsx` | 214 | `borderRadius: 6,` | `borderRadius: 4,` | Sharp quantity minus button |
| `lib/components/pos/CartItemRow.tsx` | 241 | `borderRadius: 6,` | `borderRadius: 4,` | Sharp quantity plus button |
| `lib/components/pos/CartItemRow.tsx` | 251 | `borderRadius: 6,` | `borderRadius: 4,` | Sharp warning message box |
| `lib/components/pos/CartItemRow.tsx` | 261 | `borderRadius: 6,` | `borderRadius: 4,` | Sharp custom note text card |
| `lib/components/pos/CartMainActions.tsx` | 30 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp temporary print receipt button |
| `lib/components/pos/CartMainActions.tsx` | 49 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp send kitchen button |
| `lib/components/pos/CartMainActions.tsx` | 56 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp save table button |
| `lib/components/pos/CartMainActions.tsx` | 63 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp pay order button |
| `lib/components/pos/CartPanel.tsx` | 146 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp quick add button |
| `lib/components/pos/CartPanel.tsx` | 310 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp quick add button |
| `lib/components/pos/CartSplitActions.tsx` | 22 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp split bill button 1 |
| `lib/components/pos/CartSplitActions.tsx` | 28 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp split bill button 2 |
| `lib/components/pos/CartSplitActions.tsx` | 36 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp split bill button 3 |
| `lib/components/pos/CartSplitActions.tsx` | 43 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp split bill button 4 |
| `lib/components/pos/MobileCartBar.tsx` | 53 | `borderRadius: 5,` | `borderRadius: 4,` | Sharp item count badge |
| `lib/components/pos/MobileCartBar.tsx` | 77 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp quick save order button |
| `lib/components/pos/MobileCartBar.tsx` | 95 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp pay bottom button |
| `lib/components/pos/MoreMenu.tsx` | 26 | `borderRadius: 12,` | `borderRadius: 4,` | Sharp popup dropdown menu card |
| `lib/components/pos/MoreMenu.tsx` | 29 | `borderRadius: 8` | `borderRadius: 4` | Sharp dropdown row |
| `lib/components/pos/MoreMenu.tsx` | 30 | `borderRadius: 6,` | `borderRadius: 4,` | Sharp dropdown icon background |
| `lib/components/pos/MoveTableModal.tsx` | 46 | `borderTopLeftRadius: 16, borderTopRightRadius: 16` | `borderTopLeftRadius: 4, borderTopRightRadius: 4` | Sharp modal bottom popup |
| `lib/components/pos/MoveTableModal.tsx` | 53 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp modal search container |
| `lib/components/pos/MoveTableModal.tsx` | 71 | `borderRadius: 8` | `borderRadius: 4` | Sharp table list row |
| `lib/components/pos/MoveTableModal.tsx` | 73 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp table icon background |
| `lib/components/pos/NoteEditor.tsx` | 25 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp textarea box |
| `lib/components/pos/NoteEditor.tsx` | 28 | `borderRadius: 6,` | `borderRadius: 4,` | Sharp cancel button |
| `lib/components/pos/NoteEditor.tsx` | 31 | `borderRadius: 6,` | `borderRadius: 4,` | Sharp save button |
| `lib/components/pos/ProductCard.tsx` | 106 | `borderRadius: 6,` | `borderRadius: 4,` | Sharp product count badge |
| `lib/components/purchaseOrders/POForm.tsx` | 93 | `borderRadius: 10,` | `borderRadius: 4,` | Sharp text field |
| `lib/components/purchaseOrders/POForm.tsx` | 94 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp quantity field |
| `lib/components/purchaseOrders/POForm.tsx` | 95 | `borderRadius: 20,` | `borderRadius: 4,` | Sharp supplier pill |
| `lib/components/purchaseOrders/ReceiveModal.tsx` | 68 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp quantity field |
| `lib/components/recipes/RecipeForm.tsx` | 50 | `borderRadius: 10,` | `borderRadius: 4,` | Sharp ingredients list suggestions dropdown |
| `lib/components/recipes/RecipeForm.tsx` | 238 | `borderRadius: 10,` | `borderRadius: 4,` | Sharp cost input box |
| `lib/components/recipes/RecipeForm.tsx` | 239 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp quantity input box |
| `lib/components/ui/FormModal.tsx` | 69 | `borderRadius: 8,` | `borderRadius: 4,` | Sharp close button background |
| `lib/components/ui/FormModal.tsx` | 77 | `borderRadius: 12,` | `borderRadius: 4,` | Sharp modal cancel button |
| `lib/components/ui/FormModal.tsx` | 80 | `borderRadius: 12,` | `borderRadius: 4,` | Sharp modal save button |
| `lib/components/ui/FormModal.tsx` | 113 | `borderRadius: 12,` | `borderRadius: 4,` | Sharp modal cancel button (mobile) |
| `lib/components/ui/FormModal.tsx` | 116 | `borderRadius: 12,` | `borderRadius: 4,` | Sharp modal save button (mobile) |

---

## 4. Sizing, Padding, & Touch Target Optimizations

We must satisfy Apple's requirement for a **minimum 44 pt touch target** for interactive elements. This is achieved by either physically increasing the dimensions (height/width) or using the `hitSlop` parameter in React Native to expand the touch area.

### Category 4A: Physical Height/Width Adjustments

1. **`app/ban-hang/index.tsx` (Line 133)**: "Retry" button.
   - **Before**: `minHeight: 40`
   - **After**: `minHeight: 44, justifyContent: 'center'`
2. **`app/ban-hang/kitchen.tsx` (Line 218)**: Header menu toggle.
   - **Before**: `width: 42, height: 42`
   - **After**: `width: 44, height: 44`
3. **`lib/components/Sidebar.tsx` (Line 151)**: Menu closer.
   - **Before**: `width: 36, height: 36`
   - **After**: `width: 44, height: 44`
4. **`lib/components/ui/ScreenHeader.tsx` (Lines 71, 79)**: Navigation buttons.
   - **Before**: `width: 42, height: 42`
   - **After**: `width: 44, height: 44`
5. **`lib/components/ui/FormModal.tsx` (Line 69)**: Modal header close.
   - **Before**: `width: 32, height: 32`
   - **After**: `width: 44, height: 44`
6. **`lib/components/ui/FormModal.tsx` (Line 100)**: Full-screen back closer.
   - **Before**: `width: 38, height: 38`
   - **After**: `width: 44, height: 44`
7. **`lib/components/pos/CartPanel.tsx` (Line 296)**: More actions triple dot.
   - **Before**: `width: 42, height: 42`
   - **After**: `width: 44, height: 44`
8. **`lib/components/pos/MoveTableModal.tsx` (Line 49)**: Close button.
   - **Before**: `width: 32, height: 32, borderRadius: 16`
   - **After**: `width: 44, height: 44, borderRadius: 22` (Increase size while preserving circular shape)
9. **`lib/components/pos/MoveTableModal.tsx` (Line 53)**: Search input wrapper.
   - **Before**: `height: 40`
   - **After**: `height: 44`
10. **`lib/components/pos/AreaFilter.tsx` (Lines 24, 40)**: Area Filter tabs.
    - **Before**: ScrollView `height: 44`, tab `height: 32`
    - **After**: ScrollView `height: 56`, tab `height: 44`
11. **`lib/components/pos/CategoryTabs.tsx` (Lines 36, 54)**: Category Filter tabs.
    - **Before**: ScrollView `height: 44`, tab `height: 32`
    - **After**: ScrollView `height: 56`, tab `height: 44`

---

### Category 4B: Min-Height & Padding Adjustments for Dynamic Buttons
For items that wrap dynamic text and might be too short:

1. **`lib/components/auth/LoginForm.tsx` (Line 205)**: `rememberRow` checkbox/row wrapper.
   - **Change**: Add `minHeight: 44, justifyContent: 'center'` to style sheet.
2. **`lib/components/auth/LoginForm.tsx` (Line 338)**: `presetPill` demo account button.
   - **Change**: Add `minHeight: 44, justifyContent: 'center'` to style sheet.
3. **`lib/components/payment/CashSuggestions.tsx` (Line 40)**: Cash suggestion pills.
   - **Change**: Change styles to `paddingHorizontal: 14, minHeight: 44, justifyContent: 'center'`.
4. **`lib/components/payment/PickerItem.tsx` (Line 12)**: Payment methods selector.
   - **Change**: Change styles to `paddingHorizontal: 12, minHeight: 44, justifyContent: 'center'`.
5. **`lib/components/payment/SplitBillPanel.tsx` (Line 45)**: Decimal pad text field.
   - **Change**: Add `minHeight: 44` to the style.
6. **`lib/components/payment/SplitBillPanel.tsx` (Line 60)**: Pay split bill submit button.
   - **Change**: Change style from `paddingVertical: 12` to `minHeight: 44, justifyContent: 'center'`.
7. **`lib/components/pos/CartPanel.tsx` (Line 146, 310)**: "Thêm món ngay" helper button.
   - **Change**: Change style from `paddingVertical: 10` to `minHeight: 44, justifyContent: 'center'`.
8. **`lib/components/purchaseOrders/POForm.tsx` (Line 94)**: `inputSmall` text field.
   - **Change**: Add `minHeight: 44` to style sheet.
9. **`lib/components/purchaseOrders/ReceiveModal.tsx` (Line 68)**: `inputSmall` text field.
   - **Change**: Add `minHeight: 44` to style sheet.
10. **`lib/components/recipes/RecipeForm.tsx` (Line 239)**: `inputSmall` text field.
    - **Change**: Add `minHeight: 44` to style sheet.

---

### Category 4C: `hitSlop` Adjustments for Compact Icons & Elements
For items where expanding the physical width/height breaks layout alignment, we expand the touch area using `hitSlop`:

1. **`lib/components/pos/CartItemRow.tsx` (Line 214 & 241)**: Qty adjustment plus/minus buttons (30x30 pt).
   - **Change**: Add `hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}` to double the touch target area.
2. **`lib/components/pos/ProductCard.tsx` (Line 129)**: Product modifier options circular overlay (30x30 pt).
   - **Change**: Add `hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}`.

# Apple UI Optimization Plan — 2026-07-08

This report outlines the proposed changes to the frontend codebase (`e:\posa\frontend`) to optimize the application's user interface for Apple systems (iPhone and iPad) under the specified requirements.

---

## 1. Font Integration
**Objective**: Install `@expo-google-fonts/be-vietnam-pro`, configure loading, and update configuration.

### A. Package Installation
Run the following command in `e:\posa\frontend`:
```bash
npm install @expo-google-fonts/be-vietnam-pro
```

### B. Font Loading Config in `app/_layout.tsx`
Replace the `@expo-google-fonts/inter` loader with `@expo-google-fonts/be-vietnam-pro` and map fonts to descriptive keys.

**Edit for `app/_layout.tsx`** (around line 11 & line 40):
```typescript
// BEFORE
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';

// ...

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
  });
  // ...
}

// AFTER
import {
  useFonts,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
  BeVietnamPro_900Black,
} from '@expo-google-fonts/be-vietnam-pro';

// ...

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'BeVietnamPro-Regular': BeVietnamPro_400Regular,
    'BeVietnamPro-Medium': BeVietnamPro_500Medium,
    'BeVietnamPro-SemiBold': BeVietnamPro_600SemiBold,
    'BeVietnamPro-Bold': BeVietnamPro_700Bold,
    'BeVietnamPro-ExtraBold': BeVietnamPro_800ExtraBold,
    'BeVietnamPro-Black': BeVietnamPro_900Black,
  });
  // ...
}
```

### C. Theme Typography Configuration in `lib/theme/typography.ts`
To ensure cross-platform compatibility (especially on Android where weight synthesis does not apply to custom fonts automatically), map each text token to the specific loaded font weight.

**Edit for `lib/theme/typography.ts`** (around line 12):
```typescript
// BEFORE
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

// AFTER
const fontFamilies = {
  regular: 'BeVietnamPro-Regular',
  medium: 'BeVietnamPro-Medium',
  semiBold: 'BeVietnamPro-SemiBold',
  bold: 'BeVietnamPro-Bold',
  extraBold: 'BeVietnamPro-ExtraBold',
  black: 'BeVietnamPro-Black',
};

export const font = {
  h1: { fontFamily: fontFamilies.extraBold, fontSize: scale(24), fontWeight: '800' as const, lineHeight: getLineHeight(scale(24)) },
  h2: { fontFamily: fontFamilies.extraBold, fontSize: scale(20), fontWeight: '800' as const, lineHeight: getLineHeight(scale(20)) },
  h3: { fontFamily: fontFamilies.bold, fontSize: scale(17), fontWeight: '700' as const, lineHeight: getLineHeight(scale(17)) },

  body:      { fontFamily: fontFamilies.medium, fontSize: scale(15), fontWeight: '500' as const, lineHeight: getLineHeight(scale(15)) },
  bodyBold:  { fontFamily: fontFamilies.bold, fontSize: scale(15), fontWeight: '700' as const, lineHeight: getLineHeight(scale(15)) },
  bodySmall: { fontFamily: fontFamilies.medium, fontSize: scale(13), fontWeight: '500' as const, lineHeight: getLineHeight(scale(13)) },

  price:       { fontFamily: fontFamilies.extraBold, fontSize: scale(17), fontWeight: '800' as const, lineHeight: getLineHeight(scale(17)) },
  priceLarge:  { fontFamily: fontFamilies.black, fontSize: scale(24), fontWeight: '900' as const, lineHeight: getLineHeight(scale(24)) },

  button:     { fontFamily: fontFamilies.bold, fontSize: scale(15), fontWeight: '700' as const, lineHeight: getLineHeight(scale(15)) },
  buttonSmall:{ fontFamily: fontFamilies.bold, fontSize: scale(13), fontWeight: '700' as const, lineHeight: getLineHeight(scale(13)) },

  label:  { fontFamily: fontFamilies.semiBold, fontSize: scale(13), fontWeight: '600' as const, lineHeight: getLineHeight(scale(13)) },
  caption:{ fontFamily: fontFamilies.medium, fontSize: scale(12), fontWeight: '500' as const, lineHeight: getLineHeight(scale(12)) },

  micro: { fontFamily: fontFamilies.medium, fontSize: scale(11), fontWeight: '500' as const, lineHeight: getLineHeight(scale(11)) },
  tab:   { fontFamily: fontFamilies.bold, fontSize: scale(12), fontWeight: '700' as const, lineHeight: getLineHeight(scale(12)) },
  badge: { fontFamily: fontFamilies.semiBold, fontSize: scale(10), fontWeight: '600' as const, lineHeight: getLineHeight(scale(10)) },
};
```

### D. Tailwind Mapping in `tailwind.config.js`
Add `fontFamily` mapping to `tailwind.config.js` under `theme.extend`.

**Edit for `tailwind.config.js`** (extend theme block):
```javascript
// BEFORE
  theme: {
    extend: {
      colors: {
        primary: "#F97316",
      }
    },
  },

// AFTER
  theme: {
    extend: {
      colors: {
        primary: "#F97316",
      },
      fontFamily: {
        sans: ["BeVietnamPro-Regular", "sans-serif"],
        vietnam: ["BeVietnamPro-Regular", "sans-serif"],
        "vietnam-medium": ["BeVietnamPro-Medium", "sans-serif"],
        "vietnam-semibold": ["BeVietnamPro-SemiBold", "sans-serif"],
        "vietnam-bold": ["BeVietnamPro-Bold", "sans-serif"],
        "vietnam-extrabold": ["BeVietnamPro-ExtraBold", "sans-serif"],
        "vietnam-black": ["BeVietnamPro-Black", "sans-serif"],
      }
    },
  },
```

---

## 2. Corner Radius / Sharp Styling
**Objective**: Adjust `borderRadius` to be 4px or less. Remove rounded-2xl/rounded-3xl.

### A. Design Token Updates in `lib/theme/shape.ts`
By modifying the design tokens in `shape.ts`, all components referencing `shape.radius.md` or `shape.radius.lg` automatically fall in line with a max 4px radius.

**Edit for `lib/theme/shape.ts`** (around line 9):
```typescript
// BEFORE
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 999,
  },

// AFTER
  radius: {
    sm: 2,
    md: 4,
    lg: 4,
    full: 4, // Make standard "full" rounded items sharp/square-like or small rounded
  },
```

### B. Inline / Hardcoded Radius Updates
Several components define radius parameters directly. These should be constrained to `4` (or less):

1. **`lib/components/pos/TableCard.tsx`** (line 35):
   Change `const cardRadius = 16;` to `const cardRadius = 4;`.
2. **`lib/components/ui/FormModal.tsx`**:
   - Line 51-52: Change `borderTopLeftRadius: 24` and `borderTopRightRadius: 24` to `borderTopLeftRadius: 4` and `borderTopRightRadius: 4`.
   - Line 69: Change `borderRadius: 8` to `borderRadius: 4`.
   - Line 77 & 80: Change `borderRadius: 12` to `borderRadius: 4`.
   - Line 100: Change `borderRadius: 10` to `borderRadius: 4`.
   - Line 113 & 116: Change `borderRadius: 12` to `borderRadius: 4`.
3. **`app/login.tsx`** (lines 178, 207):
   Change `borderRadius: 24` to `borderRadius: 4`.
4. **`app/ban-hang/index.tsx`**:
   - Line 128: Change `borderRadius: 28` to `borderRadius: 4` (or remove container roundness).
   - Line 157: Change `borderRadius: 32` to `borderRadius: 4`.
   - Line 229: Change `borderRadius: 40` to `borderRadius: 4`.
5. **`lib/components/pos/MoveTableModal.tsx`** (line 49):
   Change `borderRadius: 16` to `borderRadius: 4`.

---

## 3. Touch Targets (Minimum 44 pt)
**Objective**: Ensure all interactive buttons, inputs, and tab triggers meet the Apple Human Interface Guideline of 44 pt minimum.

The following files require height/minHeight/size adjustments:

### A. General Application Pages
1. **`app/ban-hang/index.tsx`**:
   - Line 133: Change `minHeight: 40` to `minHeight: 44` (Table refresh/retry button).
   - Line 192: Change `width: 32, height: 32` to `width: 44, height: 44` (Deselect table button).
2. **`app/ban-hang/kitchen.tsx`**:
   - Line 218: Change `width: 42, height: 42` to `width: 44, height: 44` (Sidebar menu trigger).
   - Line 251: Change `width: 42, height: 42` to `width: 44, height: 44` (Sound volume/toggle button).
   - Line 260: Change `width: 42, height: 42` to `width: 44, height: 44` (Refresh button).
3. **`app/ban-hang/payment.tsx`**:
   - Line 413: Change `width: 42, height: 42` to `width: 44, height: 44` (Back button).
   - Line 420: Change `height: 42` to `height: 44` (Print/receipt container).
4. **`app/ke-toan/index.tsx`**:
   - Line 243: Change `height: 38` to `height: 44` (`addBtn` style).
   - Line 263: Change `minHeight: 38` to `minHeight: 44` (`kpiCta` style).
5. **`app/ke-toan/invoices.tsx`**:
   - Line 279: Change `height: 38` to `height: 44` (`addBtn` style).
   - Line 310: Change `minHeight: 30` to `minHeight: 44` (`exportBtn` style).

### B. Management Pages (`app/quan-ly/...`)
1. **`app/quan-ly/booking.tsx`** (line 242), **`app/quan-ly/menu.tsx`** (line 261), **`app/quan-ly/promo.tsx`** (line 191), **`app/quan-ly/purchase-orders.tsx`** (line 343), **`app/quan-ly/recipes.tsx`** (line 444), **`app/quan-ly/stock.tsx`** (line 448), **`app/quan-ly/suppliers.tsx`** (line 336), **`app/quan-ly/tables.tsx`** (line 434), **`app/quan-ly/users.tsx`** (line 296):
   Change `height: 38` to `height: 44` for all primary `addBtn` styles.
2. **`app/quan-ly/audit.tsx`** (line 186), **`app/quan-ly/branches.tsx`** (line 185), **`app/quan-ly/exec-dashboard.tsx`** (line 163), **`app/quan-ly/index.tsx`** (line 229), **`app/quan-ly/purchase-orders.tsx`** (line 345), **`app/quan-ly/recipes.tsx`** (line 446), **`app/quan-ly/stock.tsx`** (line 450), **`app/quan-ly/suppliers.tsx`** (line 338):
   Change `width: 36, height: 36` to `width: 44, height: 44` for header action buttons (`addBtn` / `refreshBtn` / `headerBtn`).
3. **`app/quan-ly/recipes.tsx`** (line 454), **`app/quan-ly/stock.tsx`** (line 460), **`app/quan-ly/suppliers.tsx`** (line 347):
   Change search input box `height: 36` to `height: 44`.
4. **`app/quan-ly/reports.tsx`**:
   - Line 305: Change `width: 36, height: 36` to `width: 44, height: 44` (`iconBtn`).
   - Line 332: Change `width: 32, height: 32` to `width: 44, height: 44` (Refresh icon container).
5. **`app/quan-ly/tables.tsx`**:
   - Line 243 & 315: Change area filtering tabs `height: 34` to `height: 44`.
6. **`app/quan-ly/users.tsx`**:
   - Line 314: Change `minHeight: 32` to `minHeight: 44` (`panelCta`).

### C. Shared Components (`lib/components/...`)
1. **`lib/components/Sidebar.tsx`** (line 151):
   Change close menu button size from `width: 36, height: 36` to `width: 44, height: 44`.
2. **`lib/components/pos/AreaFilter.tsx`** (line 40):
   Change Area filtering button `height: 32` to `height: 44`.
3. **`lib/components/pos/CartItemRow.tsx`**:
   - Line 208: Change quantity selector container `height: 34` to `height: 44`.
   - Line 214 & 241: Change Qty decrement/increment button `width: 30, height: 30` to `width: 44, height: 44`.
   - Line 228: Change Qty text input `height: 30` to `height: 44`.
4. **`lib/components/pos/CartPanel.tsx`** (line 296):
   Change more menu trigger button size from `width: 42, height: 42` to `width: 44, height: 44`.
5. **`lib/components/pos/CategoryTabs.tsx`** (line 54):
   Change Category tabs `height: 32` to `height: 44`.
6. **`lib/components/pos/MoveTableModal.tsx`** (line 49):
   Change close button size from `width: 32, height: 32` to `width: 44, height: 44`.
7. **`lib/components/pos/OrderHeader.tsx`**:
   - Line 41: Change Menu trigger button size from `width: 42, height: 42` to `width: 44, height: 44`.
   - Line 46: Change Back button size from `width: 42, height: 42` to `width: 44, height: 44`.
   - Line 60: Change Delete order button size from `width: 42, height: 42` to `width: 44, height: 44`.
8. **`lib/components/pos/TableScreenHeader.tsx`**:
   - Line 43 & 60: Change buttons size from `width: 42, height: 42` to `width: 44, height: 44`.
   - Line 70 & 82: Change quick action button `height: 42` to `height: 44`.
9. **`lib/components/ui/FormModal.tsx`**:
   - Line 69: Change close button size from `width: 32, height: 32` to `width: 44, height: 44`.
   - Line 100: Change close button size from `width: 38, height: 38` to `width: 44, height: 44`.
10. **`lib/components/ui/ScreenHeader.tsx`** (lines 72, 80):
    Change Back and Menu button styles `height: 42` to `height: 44`.

---

## 4. Responsive Optimization
**Objective**: Introduce responsive scaling for spacing/padding.

We propose making `spacing` tokens in `lib/theme/shape.ts` dynamic based on the device category (iPad/tablet vs iPhone/mobile), scaling standard layout elements gracefully.

**Edit for `lib/theme/shape.ts`**:
```typescript
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const maxDim = Math.max(width, height);

// Determine if device is a tablet (e.g. iPad) based on dimensions
const isTablet = maxDim >= 1024;
const spacingScale = isTablet ? 1.3 : 1.0;

export const shape = {
  spacing: {
    xs: Math.round(4 * spacingScale),
    sm: Math.round(8 * spacingScale),
    md: Math.round(12 * spacingScale),
    lg: Math.round(16 * spacingScale),
    xl: Math.round(24 * spacingScale),
  },
  radius: {
    sm: 2,
    md: 4,
    lg: 4,
    full: 4,
  },
};
```
This scales all gutters and paddings dynamically across the screen widths while keeping corner radius elements sharp (<= 4px) and touch targets accessible (>= 44pt).

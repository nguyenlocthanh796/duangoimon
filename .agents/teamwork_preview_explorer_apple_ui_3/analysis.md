# Apple UI Optimizations Analysis & Plan

This report outlines the proposed changes to e:\posa\frontend to optimize the codebase for Apple UI standards. The requirements cover:
1. **Font Integration**: Load and configure `@expo-google-fonts/be-vietnam-pro` in React Native and Tailwind CSS.
2. **Sizing, Padding, Touch Targets**: Ensure minimum interactive touch targets are 44 pt (width and height).
3. **Less Rounded / Sharp Corners**: Adjust general components' corner radius to be 4px or less, removing large rounded classes/styles.
4. **Responsive Optimization**: Ensure layout parameters dynamically adjust for iPad and iPhone.

---

## 1. Font Integration

### Dependency Installation (`package.json`)
We need to install `@expo-google-fonts/be-vietnam-pro`.
- **Target File**: `e:\posa\frontend\package.json`
- **Location**: Line 6 (under `"dependencies"`)
- **Action**: Add `"@expo-google-fonts/be-vietnam-pro": "^0.4.2"`.

### Font Loading (`app/_layout.tsx`)
Load the Be Vietnam Pro font variants in the root layout.
- **Target File**: `e:\posa\frontend\app\_layout.tsx`
- **Location**: Line 11 (imports) and Line 40 (font loader configuration)
- **Proposed Edit**:
```tsx
// Before (Line 11):
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';

// After (Line 11):
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
  BeVietnamPro_900Black
} from '@expo-google-fonts/be-vietnam-pro';
```
```tsx
// Before (Line 39-43):
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
  });

// After (Line 39-43):
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    BeVietnamPro_800ExtraBold,
    BeVietnamPro_900Black,
  });
```

### Tailwind Config (`tailwind.config.js`)
Map the newly loaded Google Font variants to Tailwind utility classes.
- **Target File**: `e:\posa\frontend\tailwind.config.js`
- **Location**: Theme extend block
- **Proposed Edit**:
```javascript
// Before (Line 9-15):
  theme: {
    extend: {
      colors: {
        primary: "#F97316",
      }
    },
  },

// After (Line 9-15):
  theme: {
    extend: {
      colors: {
        primary: "#F97316",
      },
      fontFamily: {
        sans: ["BeVietnamPro_400Regular", "sans-serif"],
        vietnam: ["BeVietnamPro_400Regular"],
        "vietnam-medium": ["BeVietnamPro_500Medium"],
        "vietnam-semibold": ["BeVietnamPro_600SemiBold"],
        "vietnam-bold": ["BeVietnamPro_700Bold"],
        "vietnam-extrabold": ["BeVietnamPro_800ExtraBold"],
        "vietnam-black": ["BeVietnamPro_900Black"],
      }
    },
  },
```

### Theme Typography Integration (`lib/theme/typography.ts`)
To make the app typography use Be Vietnam Pro on both iOS and Android (handling weights reliably), we map each styling token to its specific loaded font family.
- **Target File**: `e:\posa\frontend\lib\theme\typography.ts`
- **Proposed Edit**:
```typescript
// Replace lines 12-36 with:
export const font = {
  h1: { fontFamily: 'BeVietnamPro_800ExtraBold', fontSize: scale(24), fontWeight: '800' as const, lineHeight: getLineHeight(scale(24)) },
  h2: { fontFamily: 'BeVietnamPro_800ExtraBold', fontSize: scale(20), fontWeight: '800' as const, lineHeight: getLineHeight(scale(20)) },
  h3: { fontFamily: 'BeVietnamPro_700Bold', fontSize: scale(17), fontWeight: '700' as const, lineHeight: getLineHeight(scale(17)) },

  body:      { fontFamily: 'BeVietnamPro_500Medium', fontSize: scale(15), fontWeight: '500' as const, lineHeight: getLineHeight(scale(15)) },
  bodyBold:  { fontFamily: 'BeVietnamPro_700Bold', fontSize: scale(15), fontWeight: '700' as const, lineHeight: getLineHeight(scale(15)) },
  bodySmall: { fontFamily: 'BeVietnamPro_500Medium', fontSize: scale(13), fontWeight: '500' as const, lineHeight: getLineHeight(scale(13)) },

  price:       { fontFamily: 'BeVietnamPro_800ExtraBold', fontSize: scale(17), fontWeight: '800' as const, lineHeight: getLineHeight(scale(17)) },
  priceLarge:  { fontFamily: 'BeVietnamPro_900Black', fontSize: scale(24), fontWeight: '900' as const, lineHeight: getLineHeight(scale(24)) },

  button:     { fontFamily: 'BeVietnamPro_700Bold', fontSize: scale(15), fontWeight: '700' as const, lineHeight: getLineHeight(scale(15)) },
  buttonSmall:{ fontFamily: 'BeVietnamPro_700Bold', fontSize: scale(13), fontWeight: '700' as const, lineHeight: getLineHeight(scale(13)) },

  label:  { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: scale(13), fontWeight: '600' as const, lineHeight: getLineHeight(scale(13)) },
  caption:{ fontFamily: 'BeVietnamPro_500Medium', fontSize: scale(12), fontWeight: '500' as const, lineHeight: getLineHeight(scale(12)) },

  micro: { fontFamily: 'BeVietnamPro_500Medium', fontSize: scale(11), fontWeight: '500' as const, lineHeight: getLineHeight(scale(11)) },
  tab:   { fontFamily: 'BeVietnamPro_700Bold', fontSize: scale(12), fontWeight: '700' as const, lineHeight: getLineHeight(scale(12)) },
  badge: { fontFamily: 'BeVietnamPro_600SemiBold', fontSize: scale(10), fontWeight: '600' as const, lineHeight: getLineHeight(scale(10)) },
};
```

---

## 2. Corner Radius Adjustment (4px or Less)

Instead of CSS `rounded-2xl` classes, the app mostly relies on theme shapes or inline `StyleSheet` values. We will adjust the theme constants and then fix files that define explicit values larger than 4.

### Theme Radius Definition (`lib/theme/shape.ts`)
- **Target File**: `e:\posa\frontend\lib\theme\shape.ts`
- **Proposed Edit**:
```typescript
// Before (Line 9-14):
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 999,
  },

// After (Line 9-14):
  radius: {
    sm: 4,
    md: 4,  // Clamped to 4px
    lg: 4,  // Clamped to 4px
    full: 999,
  },
```

### Hardcoded Border Radii in App Files
The following files define hardcoded values larger than 4px that should be changed to `4`:

1. **`app/ban-hang/index.tsx`**
   - Line 133: `borderRadius: 10` -> change to `4` (Refresh/Retry button).
2. **`app/ban-hang/kitchen.tsx`**
   - Line 226: `borderRadius: 12` -> change to `4` (Status badge).
3. **`app/ban-hang/payment.tsx`**
   - Lines 175, 186, 199, 332: `borderRadius: 8` -> change to `4` (Cash detail box, QR container).
4. **`app/login.tsx`**
   - Lines 178, 207: `borderRadius: 24` -> change to `4` (Login card container for iPad & iPhone).
5. **`lib/components/auth/LoginForm.tsx`**
   - Line 121: `borderRadius={20}` -> change to `4`.
   - Line 274: `borderRadius: 12` -> change to `4` (Input wrappers).
   - Line 315: `borderRadius: 12` -> change to `4` (Login button).
   - Line 340: `borderRadius: 20` -> change to `4` (Quick login preset pills).
6. **`lib/components/ke-toan/InvoiceFormContent.tsx`**
   - Line 107: `borderTopLeftRadius: 20, borderTopRightRadius: 20` -> change to `4` (Sheet header).
7. **`lib/components/payment/CashSuggestions.tsx`**
   - Line 40: `borderRadius: 8` -> change to `4`.
8. **`lib/components/payment/SplitBillPanel.tsx`**
   - Line 45: `borderRadius: 8` -> change to `4`.
   - Line 60: `borderRadius: 10` -> change to `4`.
9. **`lib/components/pos/CartItemRow.tsx`**
   - Lines 95, 107, 115, 126, 145, 209: `borderRadius: 8` -> change to `4`.
   - Lines 151, 156, 214, 241, 251, 261: `borderRadius: 6` -> change to `4`.
10. **`lib/components/pos/CartMainActions.tsx`**
    - Lines 30, 49, 56, 63: `borderRadius: 8` -> change to `4`.
11. **`lib/components/pos/CartPanel.tsx`**
    - Lines 146, 296, 310: `borderRadius: 8` -> change to `4`.
12. **`lib/components/pos/CartSplitActions.tsx`**
    - Lines 22, 28, 36, 43: `borderRadius: 8` -> change to `4`.
13. **`lib/components/pos/MobileCartBar.tsx`**
    - Line 53: `borderRadius: 5` -> change to `4`.
    - Lines 77, 95: `borderRadius: 8` -> change to `4`.
14. **`lib/components/pos/MoreMenu.tsx`**
    - Line 26: `borderRadius: 12` -> change to `4` (Dropdown menu card).
    - Lines 29, 37, 45, 53, 61: `borderRadius: 8` -> change to `4`.
    - Lines 30, 38, 46, 54, 62: `borderRadius: 6` -> change to `4`.
15. **`lib/components/pos/MoveTableModal.tsx`**
    - Line 46: `borderTopLeftRadius: 16, borderTopRightRadius: 16` -> change to `4`.
    - Lines 53, 71, 73: `borderRadius: 8` -> change to `4`.
16. **`lib/components/pos/NoteEditor.tsx`**
    - Line 17: `borderTopLeftRadius: 16, borderTopRightRadius: 16` -> change to `4`.
    - Line 25: `borderRadius: 8` -> change to `4`.
    - Lines 28, 31: `borderRadius: 6` -> change to `4`.
17. **`lib/components/pos/ProductCard.tsx`**
    - Line 106: `borderRadius: 6` -> change to `4`.
18. **`lib/components/pos/TableCard.tsx`**
    - Line 35: `cardRadius = 16` -> change to `4`.
19. **`lib/components/purchaseOrders/POForm.tsx`**
    - Line 93: `borderRadius: 10` -> change to `4`.
    - Line 94: `borderRadius: 8` -> change to `4`.
20. **`lib/components/purchaseOrders/ReceiveModal.tsx`**
    - Line 68: `borderRadius: 8` -> change to `4`.
21. **`lib/components/recipes/RecipeForm.tsx`**
    - Line 50: `borderRadius: 10` -> change to `4`.
    - Line 238: `borderRadius: 10` -> change to `4`.
    - Line 239: `borderRadius: 8` -> change to `4`.
22. **`lib/components/Sidebar.tsx`**
    - Line 145: `borderRadius: 8` -> change to `4`.
23. **`lib/components/ui/FormModal.tsx`**
    - Lines 51, 52: `borderTopLeftRadius: 24, borderTopRightRadius: 24` -> change to `4`.
    - Line 69: `borderRadius: 8` -> change to `4`.
    - Lines 77, 80, 113, 116: `borderRadius: 12` -> change to `4`.
    - Line 100: `borderRadius: 10` -> change to `4`.
24. **`lib/components/ui/SkeletonBox.tsx`**
    - Line 10: `borderRadius = 8` -> change to `4`.

---

## 3. Touch Target Optimizations (Minimum 44 pt)

We identified several interactive components that have a height/width of less than 44 pt. We propose either physically increasing their sizes, or utilizing `hitSlop` to meet Apple standards:

### `lib/components/pos/AreaFilter.tsx`
The scroll view container has height 44, but the buttons inside have height 32.
- **Proposed Edit**: Change ScrollView height to `56` and button height to `44`.
```tsx
// ScrollView style (Line 18-25):
// Change height: 44 to height: 56

// ScrollView contentContainerStyle (Line 26-30):
// Change paddingVertical: 6 to paddingVertical: 6

// TouchableOpacity style (Line 38-45):
// Change height: 32 to height: 44
```

### `lib/components/pos/CategoryTabs.tsx`
Identical issue to `AreaFilter.tsx`.
- **Proposed Edit**: Change ScrollView height to `56` and button height to `44`.
```tsx
// ScrollView style (Line 30-37):
// Change height: 44 to height: 56

// TouchableOpacity style (Line 52-59):
// Change height: 32 to height: 44
```

### `lib/components/payment/CashInputPanel.tsx`
- **Proposed Edit**: Change height of suggestion buttons (Line 42) from `38` to `44`.

### `lib/components/pos/CartItemRow.tsx`
The quantity selection wrapper height is `34`, and buttons inside are `30`.
- **Proposed Edit**: Update quantity selection wrapper to `height: 44`, wrapper width to `120`, and button dimensions to `40` (and `borderRadius` to `4` for both).
```tsx
// Line 205-217:
          {!isCancelled && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              width: 120, height: 44, backgroundColor: colors.surface.disabled, borderWidth: 1,
              borderColor: colors.border.default, padding: 2, borderRadius: 4,
            }}>
              <TouchableOpacity
                onPress={() => handleQtyChange(-1)}
                disabled={item.qty <= 1}
                style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: item.qty <= 1 ? 'transparent' : colors.surface.card, alignItems: 'center', justifyContent: 'center', borderWidth: item.qty <= 1 ? 0 : 1, borderColor: colors.border.default }}
              >
```
```tsx
// Line 239-245:
              <TouchableOpacity
                onPress={() => handleQtyChange(1)}
                style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: colors.brand.primaryBg, borderWidth: 1, borderColor: colors.border.brand, alignItems: 'center', justifyContent: 'center' }}
              >
```

### `lib/components/pos/ProductCard.tsx`
Options button (top right) is `30x30`.
- **Proposed Edit**: Add `hitSlop={7}` to the options `TouchableOpacity` (Line 116) to achieve a 44x44 touch target.
```tsx
// Line 116-122:
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onPress();
          }}
          hitSlop={7}
          activeOpacity={0.7}
```

### `lib/components/pos/TableScreenHeader.tsx`
Header icon buttons are `42x42`.
- **Proposed Edit**: Change style (Lines 43, 60, 70, 82) from `width: 42, height: 42` (or `height: 42`) to `width: 44, height: 44` (or `height: 44`).

### `lib/components/pos/OrderHeader.tsx`
Header buttons are `42x42`.
- **Proposed Edit**: Change style (Lines 41, 46, 60) from `width: 42, height: 42` to `width: 44, height: 44`.

### `app/ban-hang/payment.tsx`
- **Proposed Edit**: Change back button (Line 413) from `width: 42, height: 42` to `width: 44, height: 44`.

### `app/ban-hang/kitchen.tsx`
- **Proposed Edit**: Change top buttons (Lines 218, 251, 260) from `width: 42, height: 42` to `width: 44, height: 44`.

### `app/ban-hang/index.tsx`
- **Proposed Edit**:
  - Change refresh button (Line 133) from `minHeight: 40` to `minHeight: 44`.
  - Add `hitSlop={6}` to back button (Line 192) or change its style from `width: 32, height: 32` to `width: 44, height: 44`.

### `lib/components/auth/LoginForm.tsx`
- **Proposed Edit**:
  - Add `minHeight: 44, justifyContent: 'center'` to remember row styles (Line 304).
  - Wrap forgot password touchable in styles with `minHeight: 44, justifyContent: 'center'` or add vertical padding.

---

## 4. Responsive Layout Optimizations

### Sizing Factor Calculation (`lib/theme/typography.ts`)
Static size computation can cause inconsistencies on landscape/portrait view switches.
- **Proposed Edit**: Ensure `scaleFactor` relies on iPad OS classification directly for Apple devices instead of only window dimensions.
```typescript
// Replace lines 8-9:
const isIPad = Platform.OS === 'ios' && Platform.isPad;
const scaleFactor = isIPad ? 1.35 : 1.08;
export const scale = (size: number) => Math.round(size * scaleFactor);
```

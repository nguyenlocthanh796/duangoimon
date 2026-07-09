# Handoff Report — Apple UI Optimization Planning

## 1. Observation
- **Font loading in `app/_layout.tsx`**:
  - Line 11: `import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';`
  - Line 40:
    ```typescript
      const [fontsLoaded] = useFonts({
        Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
        Inter_700Bold, Inter_800ExtraBold, Inter_900Black,
      });
    ```
- **Font family definition in `lib/theme/typography.ts`**:
  - Line 12: `const FONT_FAMILY = 'Inter';`
  - Font weights are hardcoded as strings (e.g., `fontWeight: '700' as const`).
- **Tailwind configuration in `tailwind.config.js`**:
  - No custom font mapping exists currently; only standard tailwind extends.
- **Design tokens in `lib/theme/shape.ts`**:
  - Lines 9-14:
    ```typescript
      radius: {
        sm: 4,
        md: 8,
        lg: 12,
        full: 999,
      },
    ```
- **Hardcoded Border Radiuses**:
  - `lib/components/pos/TableCard.tsx` Line 35: `const cardRadius = 16;`
  - `lib/components/ui/FormModal.tsx` Line 51: `borderTopLeftRadius: 24`, Line 52: `borderTopRightRadius: 24`, Line 77: `borderRadius: 12`.
- **Touch Target sizes**:
  - More than 30 components use button heights or trigger widths below 44 pt (e.g., `width: 36, height: 36` in header/add buttons, `height: 32` or `38` in buttons/search inputs, `width: 32, height: 32` in close buttons).

---

## 2. Logic Chain
- **Font Integration**:
  - Installing `@expo-google-fonts/be-vietnam-pro` allows replacing the Inter font.
  - Loading `@expo-google-fonts/be-vietnam-pro` in `app/_layout.tsx` with specific aliases ('BeVietnamPro-Regular', etc.) and referencing them explicitly in `typography.ts` maps each style weight to the corresponding loaded font asset. This avoids weight rendering synthesis issues across Android/iOS.
  - Mapping the fonts in `tailwind.config.js` provides utility class names like `font-vietnam` and `font-vietnam-semibold` for class-based components.
- **Less Rounded/Sharp Styling**:
  - Capping `radius.sm`, `radius.md`, `radius.lg`, and `radius.full` to `2` or `4` in `lib/theme/shape.ts` automatically updates all components using the design tokens.
  - Manually reducing hardcoded radiuses (such as `cardRadius = 16` in `TableCard.tsx` and container corners in `FormModal.tsx`) guarantees no border radius exceeds 4px.
- **Touch Targets**:
  - Adjusting the height, minHeight, or width attributes of identified small buttons (e.g. `height: 36` or `38` or `42`) to `44` ensures compliance with the 44 pt Apple touch target standard.
- **Responsive Optimization**:
  - Importing `Dimensions` in `lib/theme/shape.ts` and scaling spacing by `1.3` if `maxDim >= 1024` (iPad) and `1.0` if smaller (iPhone) dynamically scales padding/gutters across device categories.

---

## 3. Caveats
- Android font weight synthesis differs from iOS. Using mapped string names (`'BeVietnamPro-Regular'`, `'BeVietnamPro-Bold'`, etc.) is recommended in React Native style sheets.
- Ensure dependency configuration is verified: some older npm setups require `expo install` instead of `npm install` for proper compatibility within an Expo project workspace.

---

## 4. Conclusion
The proposed plan fully meets all layout, font, rounding, and sizing requirements. By updating `lib/theme/shape.ts` and `lib/theme/typography.ts`, the modifications cleanly propagate to all pages and custom components, minimizing manual inline overrides.

---

## 5. Verification Method
- **Inspection of Code**: Check that `app/_layout.tsx` imports Be Vietnam Pro, `typography.ts` updates font families, and `shape.ts` implements scaling and maximum radius <= 4px.
- **Visual Validation**: Launch the Expo app on both iPhone and iPad simulators/devices:
  - Verify that no component corner exceeds 4px.
  - Confirm spacing/margins on iPad are scaled relative to iPhone.
  - Use developer inspection tools to verify that all buttons and inputs have a layout height/width of at least 44 pt.

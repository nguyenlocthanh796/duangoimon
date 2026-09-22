# 🎨 BẢNG DESIGN TOKENS & TYPOGRAPHY CHO ONGCHU LEAN POS

## 1. MÃ MÀU CHỦ ĐẠO DUAL-THEME

```typescript
// frontend/lib/theme/colors.ts
export const LightTheme = {
  surface: {
    app: '#F8FAFC',        // Slate-50 Canvas
    card: '#FFFFFF',       // Pure White Card
    header: '#F1F5F9',     // Slate-100 Sub-header
  },
  border: {
    default: '#E2E8F0',    // Slate-200 Border
    focus: '#0D9488',      // Teal-600 Focus
  },
  text: {
    primary: '#0F172A',    // Slate-900 High Contrast Text
    muted: '#475569',      // Slate-600 Muted Text
  },
  brand: {
    primary: '#0D9488',    // Jade Emerald Green
    primaryBg: '#CCFBF1',  // Teal-100 Light Badge
    success: '#10B981',    // Emerald-500
    danger: '#EF4444',     // Red-500
  },
};

export const DarkTheme = {
  surface: {
    app: '#0B0F19',        // Deep Obsidian Dark
    card: '#141E30',       // Navy Glass Card
    header: '#1B273E',     // Navy Slate Sub-header
  },
  border: {
    default: '#2A3B54',    // Dark Border
    focus: '#14B8A6',      // Teal-500 Focus
  },
  text: {
    primary: '#FFFFFF',    // Pure White Text
    muted: '#94A3B8',      // Slate-400 Muted Text
  },
  brand: {
    primary: '#14B8A6',    // Bright Jade Emerald
    primaryBg: '#042F2E',  // Teal-950 Dark Badge
    success: '#10B981',    // Emerald-500
    danger: '#EF4444',     // Red-500
  },
};
```

## 2. THANG ĐO TYPOGRAPHY 4 CẤP BẬC

```typescript
// frontend/lib/theme/typography.ts
export const Typography = {
  xs: {
    mobile: { fontSize: 13, lineHeight: 18 },
    tablet: { fontSize: 14, lineHeight: 19 },
  },
  sm: {
    mobile: { fontSize: 15, lineHeight: 22 },
    tablet: { fontSize: 16, lineHeight: 23 },
  },
  md: {
    mobile: { fontSize: 17, lineHeight: 24 },
    tablet: { fontSize: 18, lineHeight: 25 },
  },
  lg: {
    mobile: { fontSize: 22, lineHeight: 32 },
    tablet: { fontSize: 25, lineHeight: 35 },
  },
};
```

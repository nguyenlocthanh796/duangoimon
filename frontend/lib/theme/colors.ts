// Consistent color palette
export const palette = {
  orange: {
    500: '#F97316', // Primary Orange
    600: '#EA580C',
  },
  stone: {
    50:  '#FAFAFA', // App background
    100: '#F5F5F5', // Card background / disabled
    300: '#E5E5E5', // Border
    500: '#737373', // Muted text
    700: '#404040', // Body text
    900: '#171717', // Primary text
  },
  red:     { 100: '#FEE2E2', 300: '#FECACA', 600: '#DC2626', 800: '#991B1B' },
  green:   { 50: '#F0FDF4', 100: '#F0FDF4', 250: '#BBF7D0', 300: '#86EFAC', 350: '#6EE7B7', 600: '#16A34A', 800: '#166534' },
  amber:   { 200: '#FDE68A', 600: '#D97706', 800: '#92400E' },
  slate:   { 900: '#0F172A' },
  black:   '#000000',
  white:   '#FFFFFF',
};

// Semantic tokens
export const colors = {
  brand: {
    primary:       palette.orange[500],
    primaryHover:  palette.orange[600],
    primaryBg:     '#FFF7ED',
  },
  surface: {
    app:      palette.stone[50],
    card:     palette.white,
    header:   palette.white,
    disabled: palette.stone[100],
    overlay:  'rgba(0,0,0,0.5)',
    danger:   '#FEF2F2',
    invert:   '#0F172A',
    glowOrange: 'rgba(249,115,22,0.12)',
    glowBlue:   'rgba(59,130,246,0.08)',
    glowBrand:  'rgba(249,115,22,0.15)',
    cardDark: '#1E293B',
    darkOverlay: 'rgba(0,0,0,0.3)',
    input:    '#1E293B',
    avatar:   '#F1F5F9',
    sidebarIcon: '#F1F5F9',
    fab:      '#F97316',
    modal:    '#FFFFFF',
  },
  text: {
    primary:     palette.stone[900],
    secondary:   palette.stone[700],
    body:        palette.stone[700],
    muted:       palette.stone[500],
    placeholder: palette.stone[500],
    inverse:     palette.white,
    brand:       palette.orange[500],
    brandDark:   palette.orange[600],
    brandLight:  'rgba(255,255,255,0.75)',
    danger:      palette.red[600],
    success:     palette.green[600],
    badge:       palette.orange[500],
    label:       palette.stone[900],
  },
  border: {
    default:  palette.stone[300],
    brand:    palette.orange[500],
    strong:   palette.stone[300],
    danger:   '#FECACA',
    focus:    palette.orange[500],
    success:  '#BBF7D0',
    light:    '#F0F0F0',
    glass:    'rgba(255,255,255,0.1)',
    inputDark: '#334155',
    track:    '#E2E8F0',
  },
  icon: {
    default: palette.stone[700],
    muted:   palette.stone[500],
    brand:   palette.orange[500],
    inverse: palette.white,
    danger:  palette.red[600],
  },
  status: {
    available:  palette.green[600],
    occupied:   palette.orange[500],
    success:    palette.green[600],
    successBg:  '#F0FDF4',
    danger:     palette.red[600],
    dangerBg:   '#FEF2F2',
    warning:    palette.amber[600],
    warningBg:  '#FFFBEB',
    info:       '#3B82F6',
  },
  gradient: {
    primary: [palette.orange[500], palette.orange[600]],
  },
  track: {
    on: palette.green[600],
    off: '#CBD5E1',
  },
};

// Legacy flat COLORS (for backward compatibility)
export const COLORS = {
  primary:       colors.brand.primary,
  success:       colors.status.available,
  danger:        colors.text.danger,
  bg:            colors.surface.app,
  card:          colors.surface.card,
  text:          colors.text.primary,
  muted:         colors.text.muted,
  border:        colors.border.default,
};

export const formatPrice = (price: number) => {
  return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

export const formatPriceFull = (price: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

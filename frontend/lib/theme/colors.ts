// ─── Orange Flat Palette ─────────────────────────────────────
export const palette = {
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316', // Primary Orange
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  stone: {
    50: '#FAFAFA', // App background
    100: '#F5F5F5', // Card background / disabled
    300: '#E5E5E5', // Border
    500: '#737373', // Muted text
    700: '#404040', // Body text
    900: '#171717', // Primary text
  },
  red: { 50: '#FEF2F2', 100: '#FEE2E2', 300: '#FECACA', 600: '#DC2626', 800: '#991B1B' },
  green: {
    50: '#F0FDF4',
    100: '#F0FDF4',
    250: '#BBF7D0',
    300: '#86EFAC',
    350: '#6EE7B7',
    600: '#16A34A',
    800: '#166534',
  },
  amber: { 200: '#FDE68A', 600: '#D97706', 800: '#92400E' },
  blue: { 100: '#DBEAFE', 600: '#2563EB' },
  slate: { 900: '#0F172A' },
  black: '#000000',
  white: '#FFFFFF',
};

// ─── Semantic tokens ─────────────────────────────────────────
export const colors = {
  brand: {
    primary: palette.orange[500],
    primaryHover: palette.orange[600],
    primaryLight: palette.orange[100],
    primaryBg: '#FFF7ED',
    primaryDark: palette.orange[700],
  },
  surface: {
    app: palette.stone[50],
    card: palette.white,
    header: palette.white,
    disabled: palette.stone[100],
    overlay: 'rgba(0,0,0,0.5)',
    danger: '#FEF2F2',
    invert: '#0F172A',
    avatar: '#F1F5F9',
    sidebarIcon: '#F1F5F9',
    fab: '#F97316',
    modal: '#FFFFFF',
    tableHeader: '#FFF7ED',
    tableRowAlt: '#FAFAFA',
    tableRowHover: '#FFF7ED',
  },
  text: {
    primary: palette.stone[900],
    secondary: palette.stone[700],
    body: palette.stone[700],
    muted: palette.stone[500],
    placeholder: palette.stone[500],
    inverse: palette.white,
    brand: palette.orange[500],
    brandDark: palette.orange[600],
    brandLight: 'rgba(255,255,255,0.75)',
    danger: palette.red[600],
    success: palette.green[600],
    badge: palette.orange[500],
    label: palette.stone[900],
    tableHeader: palette.orange[600],
  },
  border: {
    default: palette.stone[300],
    brand: palette.orange[500],
    strong: palette.stone[300],
    danger: '#FECACA',
    focus: palette.orange[500],
    success: '#BBF7D0',
    light: '#F0F0F0',
    track: '#E2E8F0',
    table: '#E5E5E5',
  },
  icon: {
    default: palette.stone[700],
    muted: palette.stone[500],
    brand: palette.orange[500],
    inverse: palette.white,
    danger: palette.red[600],
  },
  status: {
    available: palette.green[600],
    occupied: palette.orange[500],
    success: palette.green[600],
    successBg: '#F0FDF4',
    danger: palette.red[600],
    dangerBg: '#FEF2F2',
    warning: palette.amber[600],
    warningBg: '#FFFBEB',
    info: palette.blue[600],
  },
  badge: {
    success: { bg: '#E8F5E9', text: '#2E7D32' },
    warning: { bg: '#FFF8E1', text: '#F57F17' },
    danger: { bg: '#FFEBEE', text: '#C62828' },
    info: { bg: '#E3F2FD', text: '#1565C0' },
    neutral: { bg: '#F3F4F6', text: '#64748B' },
  },
  chart: {
    line: '#F97316',
    lineAlt: '#3B82F6',
    revenue: '#16A34A',
    cost: '#DC2626',
    profit: '#2563EB',
    bar: ['#F97316', '#3B82F6', '#16A34A', '#F59E0B', '#8B5CF6', '#EC4899'],
  },
  severity: {
    critical: '#DC2626',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    success: '#10B981',
    muted: '#64748B',
  },
  // Flat — minimal use of gradients, kept for subtle accents
  gradient: {
    primary: [palette.orange[500], palette.orange[600]],
    header: ['#F97316', '#EA580C'],
    headerLight: ['#FF8A50', '#F97316'],
  },
  track: {
    on: palette.green[600],
    off: '#CBD5E1',
  },
};

// ─── ThemeColors type (for dark/light switching) ───────────
export type ThemeColors = typeof colors;

// Legacy flat COLORS (for backward compatibility)
export const COLORS = {
  primary: colors.brand.primary,
  success: colors.status.available,
  danger: colors.text.danger,
  bg: colors.surface.app,
  card: colors.surface.card,
  text: colors.text.primary,
  muted: colors.text.muted,
  border: colors.border.default,
};

// ─── Dark Mode ──────────────────────────────────────────────
export const paletteDark = {
  orange: { 50: '#1C1917', 100: '#2D1B00', 200: '#3D2200', 300: '#5C3300', 400: '#7A4400', 500: '#F97316', 600: '#EA580C', 700: '#C2410C', 800: '#9A3412', 900: '#7C2D12' },
  slate: {
    50: '#0F172A',    // App background
    100: '#1E293B',   // Card background
    200: '#334155',   // Elevated surface
    300: '#475569',   // Border
    500: '#94A3B8',   // Muted text
    700: '#CBD5E1',   // Body text
    900: '#F1F5F9',   // Primary text
  },
  red: { 50: '#450A0A', 100: '#450A0A', 300: '#7F1D1D', 600: '#EF4444', 800: '#FECACA' },
  green: { 50: '#052E16', 100: '#064E3B', 250: '#166534', 300: '#16A34A', 350: '#059669', 600: '#22C55E', 800: '#BBF7D0' },
  amber: { 200: '#78350F', 600: '#F59E0B', 800: '#FDE68A' },
  blue: { 100: '#1E3A5F', 600: '#60A5FA' },
};

export const colorsDark: typeof colors = {
  brand: {
    primary: paletteDark.orange[500],
    primaryHover: paletteDark.orange[600],
    primaryLight: paletteDark.orange[200],
    primaryBg: '#1C1917',
    primaryDark: paletteDark.orange[700],
  },
  surface: {
    app: paletteDark.slate[50],
    card: paletteDark.slate[100],
    header: paletteDark.slate[100],
    disabled: paletteDark.slate[200],
    overlay: 'rgba(0,0,0,0.7)',
    danger: '#450A0A',
    invert: '#F8FAFC',
    avatar: '#334155',
    sidebarIcon: '#334155',
    fab: '#F97316',
    modal: '#1E293B',
    tableHeader: '#1C1917',
    tableRowAlt: '#1E293B',
    tableRowHover: '#2D1B00',
  },
  text: {
    primary: paletteDark.slate[900],
    secondary: paletteDark.slate[700],
    body: paletteDark.slate[700],
    muted: paletteDark.slate[500],
    placeholder: paletteDark.slate[500],
    inverse: '#0F172A',
    brand: paletteDark.orange[500],
    brandDark: paletteDark.orange[600],
    brandLight: 'rgba(15,23,42,0.75)',
    danger: paletteDark.red[600],
    success: paletteDark.green[600],
    badge: paletteDark.orange[500],
    label: paletteDark.slate[900],
    tableHeader: paletteDark.orange[500],
  },
  border: {
    default: paletteDark.slate[300],
    brand: paletteDark.orange[500],
    strong: paletteDark.slate[300],
    danger: '#7F1D1D',
    focus: paletteDark.orange[500],
    success: '#166534',
    light: '#334155',
    track: '#475569',
    table: '#334155',
  },
  icon: {
    default: paletteDark.slate[700],
    muted: paletteDark.slate[500],
    brand: paletteDark.orange[500],
    inverse: '#0F172A',
    danger: paletteDark.red[600],
  },
  status: {
    available: paletteDark.green[600],
    occupied: paletteDark.orange[500],
    success: paletteDark.green[600],
    successBg: '#052E16',
    danger: paletteDark.red[600],
    dangerBg: '#450A0A',
    warning: paletteDark.amber[600],
    warningBg: '#78350F',
    info: paletteDark.blue[600],
  },
  severity: {
    critical: '#EF4444',
    danger: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',
    success: '#34D399',
    muted: '#64748B',
  },
  gradient: {
    primary: [paletteDark.orange[500], paletteDark.orange[600]],
    header: ['#EA580C', '#C2410C'],
    headerLight: ['#F97316', '#EA580C'],
  },
  track: {
    on: paletteDark.green[600],
    off: '#475569',
  },
};

import { m3LightColors, m3DarkColors } from './m3/colors';
import { m3Shapes } from './m3/shapes';

export const lightTheme = {
  isDark: false,
  m3: m3LightColors,
  shapes: m3Shapes,
  surface: {
    app: '#F9F6F0',        // Ngà Giấy Dó êm dịu, triệt tiêu ánh sáng chói, chống mỏi mắt
    card: '#FFFFFF',       // Trắng Men Gốm sạch sẽ
    glassCard: 'rgba(255, 255, 255, 0.92)', // Frosted Acrylic Card
    header: '#FFFFFF',     // Clean White Header (hoặc #F5EFE6 cho thanh phân cách 8px)
    glassHeader: 'rgba(255, 255, 255, 0.96)', // Frosted Translucent Header
    glassDock: 'rgba(255, 255, 255, 0.97)',   // High-Contrast Dock
    input: '#FFFFFF',
    modal: '#FFFFFF',
    backdrop: 'rgba(28, 25, 23, 0.65)',       // Warm Stone Dim Overlay
    switchTrack: '#E7E5E4',
    switchTrackDanger: '#FECACA',
    qrCanvas: '#FFFFFF',
    shadow: '#000000',
  },
  text: {
    primary: '#1C1917',    // Mực Gỗ Mun / Coffee Roast (15.8:1 AAA contrast)
    muted: '#44403C',      // Xám Đá Mộc Đậm Stone 700 (8.5:1 AAA contrast sắc nét)
    subtle: '#57534E',     // Xám Khói Trầm Stone 600 (7.2:1 AAA contrast)
    inverse: '#FFFFFF',
    onBrand: '#FFFFFF',    // Chữ trắng trên nút Đen Gỗ Mun
  },
  border: {
    default: '#D6D3D1',    // Viền nét mảnh Stone 300
    subtle: '#E7E5E4',     // Đường kẻ Hairline Warm Stone 200
    glassBorder: 'rgba(28, 25, 23, 0.08)', // 1px Frame Border
    active: '#1C1917',     // Đen Gỗ Mun Active Border
    glassGlow: 'rgba(28, 25, 23, 0.15)',
  },
  brand: {
    primary: '#1C1917',    // Màu thương hiệu Đen Gỗ Mun (Clean Ink Typography & Standard Button)
    primaryLight: '#44403C',
    primaryBg: 'rgba(28, 25, 23, 0.06)',  // Soft Neutral Tint
    accent: '#B45309',     // Vàng Đồng Thau Phin / Hổ Phách (Active Tab & Badge)
    success: '#15803D',    // Xanh Lá Mộc (Status Dot & Icon Check)
    warning: '#D97706',    // Vàng Hổ Phách VIP
    danger: '#DC2626',     // Đỏ Chu Sa / Sơn Mài (Hủy Món & Cảnh Báo)
    kdsWait: '#D97706',    // KDS Chờ lâu
    purple: '#7E22CE',     // Quẹt thẻ
    cyan: '#0284C7',       // Đang nấu
  },
  status: {
    pendingBg: '#FFFBEB',
    pendingText: '#B45309',
    pendingBorder: '#FDE68A',
    cookingBg: '#F0F9FF',
    cookingText: '#0284C7',
    cookingBorder: '#BAE6FD',
    readyBg: '#ECFDF5',
    readyText: '#15803D',
    readyBorder: '#A7F3D0',
    dangerBg: '#FEF2F2',
    dangerText: '#DC2626',
    dangerBorder: '#FECACA',
    warningBg: '#FFFBEB',
    warningText: '#B45309',
    warningBorder: '#FDE68A',
  },
};

export const darkTheme = {
  isDark: true,
  m3: m3DarkColors,
  shapes: m3Shapes,
  surface: {
    app: '#14110E',        // Nâu Cà Phê Trầm Dịu Mắt (triệt tiêu chói lóa ban đêm)
    card: '#1E1813',       // Gỗ Gụ Đen Ấm Nổi Khối
    glassCard: 'rgba(30, 24, 19, 0.90)',  // Frosted Glass Card
    header: '#17120E',     // Thanh tiêu đề trầm ấm
    glassHeader: 'rgba(25, 20, 16, 0.92)', // Frosted Glass Header
    glassDock: 'rgba(25, 20, 16, 0.95)',   // Floating Glass Dock
    input: '#28201A',
    modal: '#1E1813',
    backdrop: 'rgba(0, 0, 0, 0.75)',       // Obsidian Deep Dim Overlay
    switchTrack: '#44403C',
    switchTrackDanger: '#7F1D1D',
    qrCanvas: '#FFFFFF',
    shadow: '#000000',
  },
  text: {
    primary: '#F3EFEA',    // Trắng Ngà Gốm Sứ Dịu Mắt (15:1 AAA, không chói)
    muted: '#A8A29E',      // Xám Mộc Nhạt
    subtle: '#78716C',     // Xám Khói Trầm
    inverse: '#14110E',    // Fixed contrast in dark mode
    onBrand: '#FFFFFF',    // Chữ trắng trên nút Vàng Đồng Thau
  },
  border: {
    default: '#382E25',    // Solid Dark Crisp Mộc
    subtle: 'rgba(243, 239, 234, 0.12)', // Subtle Hairline ngà mờ
    glassBorder: 'rgba(243, 239, 234, 0.15)', // 1px Highlight Reflection Edge
    active: '#F59E0B',     // Vàng Đồng Active Border
    glassGlow: 'rgba(245, 158, 11, 0.18)',
  },
  brand: {
    primary: '#B45309',    // Vàng Đồng Thau Phin (Ấm áp, sang trọng Indochine, TRIỆT TIÊU CHÓI LÓA)
    primaryLight: '#D97706',
    primaryBg: 'rgba(180, 83, 9, 0.18)',
    accent: '#B45309',     // Vàng Đồng Thau Phin (Anti-Glare, matching Light mode)
    success: '#22C55E',    // Xanh Lá Chuối Non Sáng (Chỉ dùng cho icon trạng thái)
    warning: '#F59E0B',    // Vàng Hổ Phách Dark
    danger: '#EF4444',     // Đỏ Chu Sa Dịu Mắt
    kdsWait: '#F59E0B',    // Apple Bright Gold KDS Alert
    purple: '#C084FC',     // Quẹt thẻ Dark
    cyan: '#38BDF8',       // Đang nấu Dark
  },
  status: {
    pendingBg: 'rgba(245, 158, 11, 0.15)',
    pendingText: '#F59E0B',
    pendingBorder: 'rgba(245, 158, 11, 0.30)',
    cookingBg: 'rgba(56, 189, 248, 0.15)',
    cookingText: '#38BDF8',
    cookingBorder: 'rgba(56, 189, 248, 0.30)',
    readyBg: 'rgba(22, 163, 74, 0.18)',
    readyText: '#22C55E',
    readyBorder: 'rgba(34, 197, 94, 0.30)',
    dangerBg: 'rgba(220, 38, 38, 0.15)',
    dangerText: '#EF4444',
    dangerBorder: 'rgba(239, 68, 68, 0.30)',
    warningBg: 'rgba(245, 158, 11, 0.15)',
    warningText: '#F59E0B',
    warningBorder: 'rgba(245, 158, 11, 0.30)',
  },
};

export const oledTheme: ThemeType = {
  ...darkTheme,
  surface: {
    ...darkTheme.surface,
    app: '#000000',        // Pure OLED Pitch Black
    card: '#000000',       // Seamless Black Tile
    glassCard: 'rgba(10, 10, 10, 0.90)',
    header: '#000000',
    glassHeader: 'rgba(10, 10, 10, 0.90)',
    glassDock: 'rgba(0, 0, 0, 0.95)',
    modal: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.85)',
  },
  border: {
    ...darkTheme.border,
    default: '#222222',
    subtle: 'rgba(255, 255, 255, 0.12)',
  },
  text: {
    ...darkTheme.text,
    primary: '#FFFFFF',
  },
};

export type ThemeType = typeof lightTheme;
export type ThemeColors = ThemeType;
export type SurfaceColors = typeof lightTheme.surface;
export type TextColors = typeof lightTheme.text;
export type BorderColors = typeof lightTheme.border;
export type BrandColors = typeof lightTheme.brand;
export type StatusColors = typeof lightTheme.status;



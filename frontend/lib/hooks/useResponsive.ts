import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type Breakpoint = 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop' | 'desktop-large';

export interface ResponsiveInfo {
  isWide: boolean;           // >= 744 — has master-detail or split panel
  isMobile: boolean;         // < 744 — iPhone / Android phone
  isTablet: boolean;         // 744–1279 — iPad / Tablet
  isTabletPortrait: boolean; // 744–1023 — iPad Portrait
  isTabletLandscape: boolean;// 1024–1279 — iPad Landscape (60/40 Split)
  isDesktop: boolean;        // >= 1280 — Web / MacBook (60/40 Split)
  isDesktopLarge: boolean;   // >= 1600 — Màn hình 24-inch (1920x1080) / 27-inch
  isLandscape: boolean;      // width > height
  width: number;
  height: number;
  breakpoint: Breakpoint;
  masterWidth: number;       // left panel in Master-Detail
  detailWidth: number;       // right panel in Master-Detail
  gutter: number;
  hPad: number;
  pad: { screen: number; section: number; card: number; gap: number };
  safeBottom: number;
  safeTop: number;
  columns: (minItemWidth?: number) => number;
  productColumns: number;
  tableColumns: number;
}

const TABLET_PORTRAIT_MIN = 744;
const TABLET_LANDSCAPE_MIN = 1024;
const DESKTOP_MIN = 1280;
const DESKTOP_LARGE_MIN = 1600;

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  let breakpoint: Breakpoint;
  if (width >= DESKTOP_LARGE_MIN) breakpoint = 'desktop-large';
  else if (width >= DESKTOP_MIN) breakpoint = 'desktop';
  else if (width >= TABLET_LANDSCAPE_MIN) breakpoint = 'tablet-landscape';
  else if (width >= TABLET_PORTRAIT_MIN) breakpoint = 'tablet-portrait';
  else breakpoint = 'mobile';

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet-portrait' || breakpoint === 'tablet-landscape';
  const isTabletPortrait = breakpoint === 'tablet-portrait';
  const isTabletLandscape = breakpoint === 'tablet-landscape';
  const isDesktop = breakpoint === 'desktop' || breakpoint === 'desktop-large';
  const isDesktopLarge = breakpoint === 'desktop-large';
  const isWide = width >= TABLET_LANDSCAPE_MIN; // Master-Detail 60/40 chỉ kích hoạt từ 1024px trở lên!

  // Master-Detail panel widths
  let masterWidth = width;
  let detailWidth = 0;
  if (isWide) {
    if (isDesktopLarge) {
      // Màn hình 24-inch (>=1600px/1920px): Giỏ hàng công thái học 480px, Thực đơn 1440px (dàn 6-7 cột sắc nét)
      detailWidth = Math.min(520, Math.max(460, Math.round(width * 0.26)));
      masterWidth = width - detailWidth;
    } else if (isDesktop) {
      // Desktop Web (1280-1599px): Giỏ hàng 420px
      detailWidth = Math.min(440, Math.max(380, Math.round(width * 0.28)));
      masterWidth = width - detailWidth;
    } else {
      // Tablet Landscape (1024-1279px): Tỷ lệ 60/40 chuẩn iPad
      masterWidth = Math.round(width * 0.60);
      detailWidth = width - masterWidth;
    }
  }

  const gutter = isWide ? 12 : 8;
  const hPad = isDesktop ? 24 : isTabletLandscape ? 16 : isTabletPortrait ? 12 : 8;

  const pad = {
    screen: isDesktop ? 32 : isWide ? 24 : 16,
    section: isDesktop ? 24 : isWide ? 18 : 12,
    card: isDesktop ? 20 : isWide ? 16 : 12,
    gap: isDesktop ? 16 : isTabletLandscape ? 12 : isTabletPortrait ? 10 : 8,
  };

  const columns = (minItemWidth = 140) => {
    if (isMobile) return 2;
    const availableWidth = masterWidth - hPad * 2;
    return Math.max(2, Math.floor(availableWidth / (minItemWidth + gutter)));
  };

  // Co giãn cột thông minh theo bề rộng thực tế của Master Workspace
  // Món ăn: Mobile 2 cột | Tablet Dọc 3 cột | Tablet Ngang 3-4 cột | Desktop Web chuẩn 4-5 cột (thẻ món to rõ, không bị nén)
  const productColumns = isDesktopLarge
    ? Math.min(5, Math.max(4, Math.floor((masterWidth - hPad * 2) / 225)))
    : isDesktop
    ? Math.min(5, Math.max(4, Math.floor((masterWidth - hPad * 2) / 215)))
    : isTabletLandscape
    ? Math.min(4, Math.max(3, Math.floor((masterWidth - hPad * 2) / 195)))
    : isTabletPortrait
    ? 3
    : 2;

  // Bàn ăn: Mobile 2 cột | Tablet Dọc 3-4 cột | Tablet Ngang 4-5 cột | Desktop Web chuẩn 5-6 cột
  const tableColumns = isDesktopLarge
    ? Math.min(6, Math.max(5, Math.floor((masterWidth - hPad * 2) / 190)))
    : isDesktop
    ? Math.min(6, Math.max(5, Math.floor((masterWidth - hPad * 2) / 185)))
    : isTabletLandscape
    ? Math.min(5, Math.max(4, Math.floor((masterWidth - hPad * 2) / 180)))
    : isTabletPortrait
    ? 4
    : 2;

  return {
    isWide,
    isMobile,
    isTablet,
    isTabletPortrait,
    isTabletLandscape,
    isDesktop,
    isDesktopLarge,
    isLandscape,
    width,
    height,
    breakpoint,
    masterWidth,
    detailWidth,
    gutter,
    hPad,
    pad,
    safeBottom: insets.bottom,
    safeTop: insets.top,
    columns,
    productColumns,
    tableColumns,
  };
}

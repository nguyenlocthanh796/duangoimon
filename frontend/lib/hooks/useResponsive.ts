import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type Breakpoint = 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';

export interface ResponsiveInfo {
  isWide: boolean;           // >= 768 — has persistent sidebar
  isTablet: boolean;         // 768–1279
  isTabletPortrait: boolean; // 768–1023 — sidebar icon-only (64px)
  isTabletLandscape: boolean;// 1024–1279 — sidebar full (240px)
  isLandscape: boolean;      // width > height
  width: number;
  height: number;
  breakpoint: Breakpoint;
  containerWidth: number;    // usable width excluding sidebar
  gutter: number;
  hPad: number;
  pad: { screen: number; section: number; card: number; gap: number };
  safeBottom: number;
  sidebarWidth: number;      // 0 | 64 | 240
  columns: (minItemWidth: number) => number;
}

// iPad mini / iPad 9th gen portrait = 768pt
// iPad landscape = 1024pt+
// iPhone max = 430pt
const TABLET_PORTRAIT_MIN = 768;
const TABLET_LANDSCAPE_MIN = 1024;
const DESKTOP_MIN = 1280;

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;

  let breakpoint: Breakpoint;
  if (width >= DESKTOP_MIN) breakpoint = 'desktop';
  else if (width >= TABLET_LANDSCAPE_MIN) breakpoint = 'tablet-landscape';
  else if (width >= TABLET_PORTRAIT_MIN) breakpoint = 'tablet-portrait';
  else breakpoint = 'mobile';

  const isWide = breakpoint !== 'mobile';
  const isTablet = breakpoint === 'tablet-portrait' || breakpoint === 'tablet-landscape';
  const isTabletPortrait = breakpoint === 'tablet-portrait';
  const isTabletLandscape = breakpoint === 'tablet-landscape' || breakpoint === 'desktop';

  // Sidebar width by breakpoint
  // - mobile: 0 (drawer overlay)
  // - tablet-portrait: 64px (icon-only)
  // - tablet-landscape/desktop: 240px (full label)
  const sidebarWidth = isTabletPortrait ? 64 : isTabletLandscape ? 240 : 0;

  // Usable content width after sidebar
  const containerWidth = isWide ? width - sidebarWidth : width;

  // Scale spacing with width
  const gutter = isWide ? Math.max(8, Math.min(16, width * 0.01)) : 10;
  const hPad = isWide ? 16 : 12;

  // Unified responsive padding tokens (phone smaller, iPad roomier)
  const pad = {
    screen: isWide ? 24 : 12,
    section: isWide ? 16 : 12,
    card: isWide ? 16 : 12,
    gap: isWide ? 12 : 8,
  };

  const columns = (minItemWidth: number) =>
    !isWide ? 1 : Math.max(2, calcGridCols(containerWidth, minItemWidth, hPad, gutter));

  return {
    isWide,
    isTablet,
    isTabletPortrait,
    isTabletLandscape,
    isLandscape,
    width,
    height,
    breakpoint,
    containerWidth,
    gutter,
    hPad,
    pad,
    safeBottom: insets.bottom,
    sidebarWidth,
    columns,
  };
}

/** Calc numCols given containerWidth, min card width, and min clamp */
export function calcGridCols(
  containerWidth: number,
  minItemWidth: number,
  hPad: number,
  gutter: number
): number {
  return Math.max(2, Math.floor((containerWidth - hPad * 2) / (minItemWidth + gutter)));
}

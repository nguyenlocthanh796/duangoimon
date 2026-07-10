import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type Breakpoint = 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';

export interface ResponsiveInfo {
  isWide: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  width: number;
  height: number;
  breakpoint: Breakpoint;
  containerWidth: number; // usable width for left panel (65% on wide, 100% on narrow)
  gutter: number;
  hPad: number;
  safeBottom: number;
  columns: (minItemWidth: number) => number;
}

const MIN_TABLE_WIDTH = 140;

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWide = width > 768;
  const isLandscape = width > height;

  let breakpoint: Breakpoint;
  if (width > 1200) breakpoint = 'desktop';
  else if (width >= 1024) breakpoint = 'tablet-landscape';
  else if (width > 768) breakpoint = 'tablet-portrait';
  else breakpoint = 'mobile';

  const isTablet = breakpoint === 'tablet-portrait' || breakpoint === 'tablet-landscape';
  const containerWidth = isWide ? width * 0.65 : width;

  // Scale spacing with width
  const gutter = isWide ? Math.max(8, Math.min(16, width * 0.01)) : 10;
  const hPad = isWide ? 16 : 4;

  const columns = (minItemWidth: number) => 
    !isWide ? 1 : Math.max(2, calcGridCols(containerWidth, minItemWidth, hPad, gutter));

  return { 
    isWide, 
    isTablet,
    isLandscape,
    width, 
    height, 
    breakpoint, 
    containerWidth, 
    gutter, 
    hPad,
    safeBottom: insets.bottom,
    columns
  };
}

/** Calc numCols given containerWidth, min card width, and min clamp */
export function calcGridCols(containerWidth: number, minItemWidth: number, hPad: number, gutter: number): number {
  return Math.max(2, Math.floor((containerWidth - hPad * 2) / minItemWidth));
}

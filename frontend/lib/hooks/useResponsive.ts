import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';

export interface ResponsiveInfo {
  isWide: boolean;
  width: number;
  height: number;
  breakpoint: Breakpoint;
  containerWidth: number; // usable width for left panel (65% on wide, 100% on narrow)
  gutter: number;
  hPad: number;
}

const MIN_TABLE_WIDTH = 140;

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const isWide = width > 768;

  let breakpoint: Breakpoint;
  if (width > 1200) breakpoint = 'desktop';
  else if (width >= 1024) breakpoint = 'tablet-landscape';
  else if (width > 768) breakpoint = 'tablet-portrait';
  else breakpoint = 'mobile';

  const containerWidth = isWide ? width * 0.65 : width;

  // Scale spacing with width
  const gutter = isWide ? Math.max(8, Math.min(16, width * 0.01)) : 10;
  const hPad = isWide ? 16 : 4;

  return { isWide, width, height, breakpoint, containerWidth, gutter, hPad };
}

/** Calc numCols given containerWidth, min card width, and min clamp */
export function calcGridCols(containerWidth: number, minItemWidth: number, hPad: number, gutter: number): number {
  return Math.max(2, Math.floor((containerWidth - hPad * 2) / minItemWidth));
}

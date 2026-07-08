import { Dimensions } from 'react-native';
import { Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
const maxDim = Math.max(width, height);

// Consistent scaling - increased for larger touch targets
const scaleFactor = maxDim >= 1024 ? 1.35 : 1.08;
export const scale = (size: number) => Math.round(size * scaleFactor);
const getLineHeight = (size: number) => Math.round(size * 1.3);

const FONT_FAMILY = 'Inter';

export const font = {
  h1: { fontFamily: FONT_FAMILY, fontSize: scale(24), fontWeight: '800' as const, lineHeight: getLineHeight(scale(24)) },
  h2: { fontFamily: FONT_FAMILY, fontSize: scale(20), fontWeight: '800' as const, lineHeight: getLineHeight(scale(20)) },
  h3: { fontFamily: FONT_FAMILY, fontSize: scale(17), fontWeight: '700' as const, lineHeight: getLineHeight(scale(17)) },

  body:      { fontFamily: FONT_FAMILY, fontSize: scale(15), fontWeight: '500' as const, lineHeight: getLineHeight(scale(15)) },
  bodyBold:  { fontFamily: FONT_FAMILY, fontSize: scale(15), fontWeight: '700' as const, lineHeight: getLineHeight(scale(15)) },
  bodySmall: { fontFamily: FONT_FAMILY, fontSize: scale(13), fontWeight: '500' as const, lineHeight: getLineHeight(scale(13)) },

  price:       { fontFamily: FONT_FAMILY, fontSize: scale(17), fontWeight: '800' as const, lineHeight: getLineHeight(scale(17)) },
  priceLarge:  { fontFamily: FONT_FAMILY, fontSize: scale(24), fontWeight: '900' as const, lineHeight: getLineHeight(scale(24)) },

  button:     { fontFamily: FONT_FAMILY, fontSize: scale(15), fontWeight: '700' as const, lineHeight: getLineHeight(scale(15)) },
  buttonSmall:{ fontFamily: FONT_FAMILY, fontSize: scale(13), fontWeight: '700' as const, lineHeight: getLineHeight(scale(13)) },

  label:  { fontFamily: FONT_FAMILY, fontSize: scale(13), fontWeight: '600' as const, lineHeight: getLineHeight(scale(13)) },
  caption:{ fontFamily: FONT_FAMILY, fontSize: scale(12), fontWeight: '500' as const, lineHeight: getLineHeight(scale(12)) },

  // Additional tokens used by components
  micro: { fontFamily: FONT_FAMILY, fontSize: scale(11), fontWeight: '500' as const, lineHeight: getLineHeight(scale(11)) },
  tab:   { fontFamily: FONT_FAMILY, fontSize: scale(12), fontWeight: '700' as const, lineHeight: getLineHeight(scale(12)) },
  badge: { fontFamily: FONT_FAMILY, fontSize: scale(10), fontWeight: '600' as const, lineHeight: getLineHeight(scale(10)) },
};

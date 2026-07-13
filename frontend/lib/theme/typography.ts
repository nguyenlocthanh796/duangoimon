import { Dimensions } from 'react-native';
import { Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
const maxDim = Math.max(width, height);

// Consistent scaling - adjusted to be more suitable (smaller) for iPhone and iPad
const scaleFactor = maxDim >= 1024 ? 1.15 : 1.0;
export const scale = (size: number) => Math.round(size * scaleFactor);
const getLineHeight = (size: number) => Math.round(size * 1.35);

const FONT = 'BeVietnamPro';

export const font = {
  h1: {
    fontFamily: `${FONT}_700Bold`,
    fontSize: scale(24),
    fontWeight: '700' as const,
    lineHeight: getLineHeight(scale(24)),
  },
  h2: {
    fontFamily: `${FONT}_700Bold`,
    fontSize: scale(20),
    fontWeight: '700' as const,
    lineHeight: getLineHeight(scale(20)),
  },
  h3: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(18),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(18)),
  },
  h4: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(15),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(15)),
  },

  body: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(16),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(16)),
  },
  bodyBold: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(16),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(16)),
  },
  bodySmall: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(14),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(14)),
  },

  price: {
    fontFamily: `${FONT}_700Bold`,
    fontSize: scale(18),
    fontWeight: '700' as const,
    lineHeight: getLineHeight(scale(18)),
  },
  priceLarge: {
    fontFamily: `${FONT}_800ExtraBold`,
    fontSize: scale(24),
    fontWeight: '800' as const,
    lineHeight: getLineHeight(scale(24)),
  },

  button: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(16),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(16)),
  },
  buttonSmall: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(14),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(14)),
  },

  label: {
    fontFamily: `${FONT}_500Medium`,
    fontSize: scale(14),
    fontWeight: '500' as const,
    lineHeight: getLineHeight(scale(14)),
  },
  caption: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(13),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(13)),
  },

  // Additional tokens used by components
  micro: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(11),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(11)),
  },
  tab: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(13),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(13)),
  },
  badge: {
    fontFamily: `${FONT}_500Medium`,
    fontSize: scale(11),
    fontWeight: '500' as const,
    lineHeight: getLineHeight(scale(11)),
  },

  // Compact table fonts
  tableHeader: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(11),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(11)),
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  tableCell: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(13),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(13)),
  },
  tableCellBold: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(13),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(13)),
  },
};

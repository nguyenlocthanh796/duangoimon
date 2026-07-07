import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const maxDim = Math.max(width, height);

// Consistent scaling
const scaleFactor = maxDim >= 1024 ? 1.25 : 1.0;
export const scale = (size: number) => Math.round(size * scaleFactor);
const getLineHeight = (size: number) => Math.round(size * 1.3);

export const font = {
  h1: { fontSize: scale(22), fontWeight: '800' as const, lineHeight: getLineHeight(scale(22)) },
  h2: { fontSize: scale(18), fontWeight: '800' as const, lineHeight: getLineHeight(scale(18)) },
  h3: { fontSize: scale(15), fontWeight: '700' as const, lineHeight: getLineHeight(scale(15)) },
  
  body:      { fontSize: scale(14), fontWeight: '500' as const, lineHeight: getLineHeight(scale(14)) },
  bodyBold:  { fontSize: scale(14), fontWeight: '700' as const, lineHeight: getLineHeight(scale(14)) },
  bodySmall: { fontSize: scale(12), fontWeight: '500' as const, lineHeight: getLineHeight(scale(12)) },
  
  price:       { fontSize: scale(15), fontWeight: '800' as const, lineHeight: getLineHeight(scale(15)) },
  priceLarge:  { fontSize: scale(24), fontWeight: '900' as const, lineHeight: getLineHeight(scale(24)) },
  
  button:     { fontSize: scale(14), fontWeight: '700' as const, lineHeight: getLineHeight(scale(14)) },
  buttonSmall:{ fontSize: scale(12), fontWeight: '700' as const, lineHeight: getLineHeight(scale(12)) },
  
  label:  { fontSize: scale(12), fontWeight: '600' as const, lineHeight: getLineHeight(scale(12)) },
  caption:{ fontSize: scale(11), fontWeight: '500' as const, lineHeight: getLineHeight(scale(11)) },
  
  // Additional tokens used by components
  micro: { fontSize: scale(10), fontWeight: '500' as const, lineHeight: getLineHeight(scale(10)) },
  tab:   { fontSize: scale(11), fontWeight: '700' as const, lineHeight: getLineHeight(scale(11)) },
  badge: { fontSize: scale(10), fontWeight: '600' as const, lineHeight: getLineHeight(scale(10)) },
};

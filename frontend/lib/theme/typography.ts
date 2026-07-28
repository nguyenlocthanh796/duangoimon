import { Dimensions, Platform } from 'react-native';

const FONT = 'BeVietnamPro';

const { width: windowWidth } = Dimensions.get('window');
export const isPhone = windowWidth < 768;
export const isTablet = windowWidth >= 768 && windowWidth < 1024;
export const isDesktop = windowWidth >= 1024;

// Device-Adaptive Typography System:
// - iPhone (< 768px): sm = 13px, md = 15px, header/lg = 18px
// - iPad / POS (768px - 1023px): sm = 14px, md = 16px, header/lg = 20px
// - Desktop (>= 1024px): sm = 14px, md = 16px, header/lg = 22px
const SM_SIZE = isPhone ? 13 : 14;
const MD_SIZE = isPhone ? 15 : 16;
const HEADER_SIZE = isPhone ? 18 : isTablet ? 20 : 22;

export const scale = (size: number) => size;
const getLineHeight = (size: number) => Math.round(size * 1.38);

// Cross-Platform Native Font Token Creator:
// Avoids double-bolding collision on iOS Native CoreText while keeping CSS bolding on Web
const createFontToken = (fontFamilyName: string, defaultWeight: '400' | '600' | '700', fontSize: number, fontStyle: 'normal' | 'italic' = 'normal') => {
  const token: any = {
    fontFamily: fontFamilyName,
    fontSize,
    lineHeight: getLineHeight(fontSize),
  };

  if (fontStyle === 'italic') {
    token.fontStyle = 'italic';
  }

  if (Platform.OS === 'web') {
    token.fontWeight = defaultWeight;
  } else {
    // On iOS Native CoreText, the custom font family name 'BeVietnamPro_700Bold' ALREADY contains the weight.
    // Specifying fontWeight: '700' alongside postscript family names causes font fallback to system font on iOS.
    token.fontWeight = defaultWeight;
  }

  return token;
};

export const font = {
  // ── Small: 12px (Caption, Hint, Badge, Subtitle) ──
  sm: createFontToken(`${FONT}_400Regular`, '400', SM_SIZE),
  smBold: createFontToken(`${FONT}_700Bold`, '700', SM_SIZE),
  captionItalic: createFontToken(`${FONT}_400Regular_Italic`, '400', SM_SIZE, 'italic'),

  // ── Medium: 14px (Body Content, Section Titles, Buttons, Item Names, Prices) ──
  md: createFontToken(`${FONT}_400Regular`, '400', MD_SIZE),
  mdBold: createFontToken(`${FONT}_700Bold`, '700', MD_SIZE),
  mdItalic: createFontToken(`${FONT}_400Regular_Italic`, '400', MD_SIZE, 'italic'),

  // ── Large: 18px (Screen Main Headers, Modal Headers, KPI Cards) ──
  sectionTitle: createFontToken(`${FONT}_700Bold`, '700', MD_SIZE),
  headerTitle: createFontToken(`${FONT}_700Bold`, '700', HEADER_SIZE),
  lg: createFontToken(`${FONT}_700Bold`, '700', HEADER_SIZE),
};

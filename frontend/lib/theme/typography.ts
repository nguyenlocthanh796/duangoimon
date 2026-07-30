import { Platform } from 'react-native';

const FONT = 'BeVietnamPro';

// Fixed scale: 12 / 14 / 16 / 18 — aligned with iOS HIG (Caption 2/11pt→12, Footnote 13pt→14, Callout 16pt, Headline 17pt→18)
const XS_SIZE = 12;
const SM_SIZE = 14;
const MD_SIZE = 16;
const HEADER_SIZE = 18;

export const scale = (size: number) => size;
const getLineHeight = (size: number) => Math.round(size * 1.38);

const createFontToken = (
  fontFamilyName: string,
  defaultWeight: '400' | '600' | '700',
  fontSize: number,
  fontStyle: 'normal' | 'italic' = 'normal',
) => {
  const token: any = {
    fontFamily: fontFamilyName,
    fontSize,
    lineHeight: getLineHeight(fontSize),
  };
  if (fontStyle === 'italic') token.fontStyle = 'italic';
  if (Platform.OS === 'web') token.fontWeight = defaultWeight;
  else token.fontWeight = defaultWeight;
  return token;
};

export const font = {
  // ── xs: 12px — tiny badge, tag, subtle label (≈ iOS Caption 2/11pt) ──
  xs: createFontToken(`${FONT}_400Regular`, '400', XS_SIZE),
  xsBold: createFontToken(`${FONT}_700Bold`, '700', XS_SIZE),

  // ── sm: 14px — caption, hint, badge, note, notification ──
  sm: createFontToken(`${FONT}_400Regular`, '400', SM_SIZE),
  smBold: createFontToken(`${FONT}_700Bold`, '700', SM_SIZE),
  captionItalic: createFontToken(`${FONT}_400Regular_Italic`, '400', SM_SIZE, 'italic'),

  // ── md: 16px — body text, labels, data, names, prices ──
  md: createFontToken(`${FONT}_400Regular`, '400', MD_SIZE),
  mdBold: createFontToken(`${FONT}_700Bold`, '700', MD_SIZE),
  mdItalic: createFontToken(`${FONT}_400Regular_Italic`, '400', MD_SIZE, 'italic'),

  // ── lg: 18px — screen headers, section titles, KPI totals ──
  sectionTitle: createFontToken(`${FONT}_700Bold`, '700', MD_SIZE),  // 16 bold (section group title)
  headerTitle: createFontToken(`${FONT}_700Bold`, '700', HEADER_SIZE), // 18 bold
  lg: createFontToken(`${FONT}_700Bold`, '700', HEADER_SIZE),         // alias
};

import React from 'react';
import { Text, TextProps, TextStyle, Platform } from 'react-native';
import { useTheme } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { m3Typography, M3TypographyVariant } from '../../theme/m3/typography';
import { getResponsiveFont } from '../../theme/typography';

export type M3SemanticColor =
  | 'onSurface'
  | 'onSurfaceVariant'
  | 'primary'
  | 'onPrimary'
  | 'primaryContainer'
  | 'onPrimaryContainer'
  | 'secondary'
  | 'onSecondary'
  | 'tertiary'
  | 'onTertiary'
  | 'error'
  | 'onError'
  | 'success'
  | 'onSuccess'
  // Legacy aliases for backward compatibility
  | 'muted'
  | 'subtle'
  | 'brand'
  | 'danger'
  | 'warning'
  | 'accent'
  | 'onBrand';

export type AppTextVariant =
  | M3TypographyVariant
  | 'xxs'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'display';

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  weight?: 'normal' | 'medium' | 'bold';
  italic?: boolean;
  tabularNums?: boolean;
  color?: M3SemanticColor | (string & {});
  children: React.ReactNode;
}

const extractTextContent = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  if (React.isValidElement(node) && (node.props as any)?.children) {
    return extractTextContent((node.props as any).children);
  }
  return '';
};

export const AppText: React.FC<AppTextProps> = ({
  variant = 'md',
  weight,
  italic = false,
  tabularNums,
  color,
  style,
  children,
  allowFontScaling = false,
  maxFontSizeMultiplier = 1.15,
  ...props
}) => {
  const { theme } = useTheme();
  const { isMobile, isDesktop } = useResponsive();
  const legacyFontTokens = getResponsiveFont(isMobile, isDesktop);

  const webFontFamily = Platform.OS === 'web' ? "'Inter', 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" : undefined;

  const getFontToken = (): TextStyle => {
    // 1. Nếu dùng trực tiếp M3 Variant chuẩn
    if (variant in m3Typography) {
      const baseM3 = m3Typography[variant as M3TypographyVariant];
      let customWeight: TextStyle['fontWeight'] = baseM3.fontWeight;
      if (weight === 'normal') customWeight = '400';
      else if (weight === 'medium') customWeight = '500';
      else if (weight === 'bold') customWeight = '600';

      return {
        ...baseM3,
        fontWeight: customWeight,
        fontFamily: webFontFamily,
      };
    }

    // 2. 7-Tier Harmonic POS Scale (12, 14, 16, 18, 22, 28, 36)
    switch (variant) {
      case 'xxs':
        if (weight === 'bold') return legacyFontTokens.xxsBold; // 12/16 weight 600
        if (weight === 'medium') return legacyFontTokens.xxsMedium; // 12/16 weight 500
        return legacyFontTokens.xxs; // 12/16 weight 400
      case 'xs':
        if (weight === 'bold') return legacyFontTokens.xsBold; // 14/20 weight 600
        if (weight === 'medium') return legacyFontTokens.xsMedium; // 14/20 weight 500
        return legacyFontTokens.xs; // 14/20 weight 400
      case 'sm':
        if (weight === 'bold') return legacyFontTokens.smBold; // 16/22 weight 600
        if (weight === 'medium') return legacyFontTokens.smMedium; // 16/22 weight 500
        return legacyFontTokens.sm; // 16/22 weight 400
      case 'md':
        if (weight === 'bold') return legacyFontTokens.mdBold; // 18/26 weight 600
        if (weight === 'medium') return legacyFontTokens.mdMedium; // 18/26 weight 500
        return legacyFontTokens.md; // 18/26 weight 400 (Tên món, Giá tiền 18px)
      case 'lg':
        if (weight === 'bold') return legacyFontTokens.lgBold; // 22/28 weight 600
        if (weight === 'normal') return legacyFontTokens.lgRegular; // 22/28 weight 400
        return legacyFontTokens.lg; // 22/28 weight 500
      case 'xl':
        if (weight === 'normal') return legacyFontTokens.xlRegular; // 28/36 weight 400
        if (weight === 'bold') return legacyFontTokens.xlBold; // 28/36 weight 600
        return legacyFontTokens.xl; // 28/36 weight 500
      case 'display':
        if (weight === 'bold') return legacyFontTokens.displayBold; // 36/44 weight 600
        if (weight === 'medium') return legacyFontTokens.displayMedium; // 36/44 weight 500
        return legacyFontTokens.display; // 36/44 weight 400
      default:
        return legacyFontTokens.md;
    }
  };

  const sanitizeStyle = (s: TextStyle | (TextStyle | undefined)[] | undefined): any => {
    if (!s) return undefined;
    if (Array.isArray(s)) return s.map(sanitizeStyle);
    if (typeof s === 'object') {
      if ('fontSize' in s || 'lineHeight' in s || 'fontWeight' in s) {
        const { fontSize: _fs, lineHeight: _lh, fontWeight: _fw, ...rest } = s as TextStyle;
        return rest;
      }
    }
    return s;
  };

  const resolvedColor = (() => {
    if (!color) return theme.text.primary;
    switch (color) {
      // M3 Color Roles
      case 'onSurface':
        return theme.text.primary;
      case 'onSurfaceVariant':
      case 'muted':
        return theme.text.muted;
      case 'subtle':
        return theme.text.subtle;
      case 'primary':
      case 'brand':
        return theme.brand.primary;
      case 'onPrimary':
      case 'onBrand':
        return theme.text.onBrand;
      case 'secondary':
        return theme.text.muted;
      case 'tertiary':
      case 'accent':
        return theme.brand.accent;
      case 'error':
      case 'danger':
        return theme.brand.danger;
      case 'success':
        return theme.brand.success;
      case 'warning':
        return theme.brand.warning;
      default:
        return color;
    }
  })();

  const textContent = tabularNums === undefined ? extractTextContent(children) : '';
  const isTabular =
    tabularNums !== undefined
      ? tabularNums
      : textContent.length > 0 &&
        /\d/.test(textContent) &&
        (/[đ₫%]/i.test(textContent) ||
          /^[-+]?\s*[xX]?\s*\d+([.,]\d+)*\s*([xX]|đ|k|vnd|%|món|phần|bàn|ca|ly|chai|gói)?$/i.test(textContent.trim()) ||
          /\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(textContent) ||
          /\b(HD|BILL|ORD|INV|DH|KDS|CHỜ|BAN|BÀN|CA|VOUCHER|MÃ|SL)[-_\s\x23:]?\d+/i.test(textContent) ||
          /(?:giá|tiền|tổng|chiết khấu|thuế|thuế vat|phần|món|bàn|ca|vnd|vnđ|\bk\b|phút|giây|\bh\b|số lượng)/i.test(textContent));

  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        getFontToken(),
        { color: resolvedColor },
        italic ? { fontStyle: 'italic' } : undefined,
        isTabular ? { fontVariant: ['tabular-nums'] } : undefined,
        Platform.OS === 'android' && isTabular ? { paddingRight: 3 } : undefined,
        sanitizeStyle(style as any),
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};


import React from 'react';
import { Text, TextProps } from 'react-native';
import { font, colors } from '../../theme';

interface AppTextProps extends TextProps {
  variant?: 'xs' | 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'bold';
  italic?: boolean;
  color?: string;
  children: React.ReactNode;
}

/**
 * AppText — Mobile & iPad Native typography system.
 * Strict 4 Font Sizes Design System (iOS HIG aligned):
 * - xs = 12px (Tiny: Badge, tag, subtle label ≈ iOS Caption 2)
 * - sm = 14px (Small: Caption, Note, Badge ≈ iOS Footnote)
 * - md = 16px (Medium: Body, Labels, Items, Prices ≈ iOS Callout)
 * - lg = 18px (Large: EXCLUSIVE for Screen Header Title & Modal Title ONLY ≈ iOS Headline)
 * Bold allowed ONLY for: filter chip active, section header, KPI total.
 */
export default function AppText({
  variant = 'md',
  weight = 'normal',
  italic = false,
  color = colors.text.primary,
  style,
  children,
  allowFontScaling = false,
  maxFontSizeMultiplier = 1.15,
  ...props
}: AppTextProps) {
  const getFontToken = () => {
    switch (variant) {
      case 'xs':
        return weight === 'bold' ? font.xsBold : font.xs;
      case 'sm':
        if (italic) return font.captionItalic;
        return weight === 'bold' ? font.smBold : font.sm;
      case 'md':
        if (italic) return font.mdItalic;
        return weight === 'bold' ? font.mdBold : font.md;
      case 'lg':
        return font.lg;
      default:
        return font.md;
    }
  };

  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[getFontToken(), { color }, italic ? { fontStyle: 'italic' } : undefined, style]}
      {...props}
    >
      {children}
    </Text>
  );
}

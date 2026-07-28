import React from 'react';
import { Text, TextProps } from 'react-native';
import { font, colors } from '../../theme';

interface AppTextProps extends TextProps {
  variant?: 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'bold';
  italic?: boolean;
  color?: string;
  children: React.ReactNode;
}

/**
 * AppText — Mobile & iPad Native typography system.
 * Strict 3 Font Sizes Design System:
 * - sm = 13px (Small: Caption, Hint, Badge)
 * - md = 16px (Medium: Body, Title, Button, Item Name, Price, Card Titles, KPI Metrics)
 * - lg = 18px (Large: EXCLUSIVE for Screen Header Title & Modal Title ONLY)
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

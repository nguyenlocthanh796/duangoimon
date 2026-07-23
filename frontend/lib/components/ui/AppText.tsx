import React from 'react';
import { Text, TextProps } from 'react-native';
import { font, colors } from '../../theme';

interface AppTextProps extends TextProps {
  variant?: 'sm' | 'md' | 'lg';
  weight?: 'normal' | 'bold';
  color?: string;
  children: React.ReactNode;
}

/**
 * AppText — 3-size typography system.
 *
 *   sm = 13pt (iPad 16) — labels, badges, timestamps, ghi chú
 *   md = 16pt (iPad 20) — body, buttons, product names, cart items
 *   lg = 24pt (iPad 30) — totals, stat numbers, page titles
 *
 * Triết lý: nhấn mạnh bằng MÀU + NỀN. Không hardcode fontSize.
 */
export default function AppText({
  variant = 'md',
  weight = 'normal',
  color = colors.text.primary,
  style,
  children,
  ...props
}: AppTextProps) {
  const getFontToken = () => {
    switch (variant) {
      case 'sm':
        return weight === 'bold' ? font.smBold : font.sm;
      case 'md':
        return weight === 'bold' ? font.mdBold : font.md;
      case 'lg':
        return font.lg;
      default:
        return font.md;
    }
  };

  return (
    <Text style={[getFontToken(), { color }, style]} {...props}>
      {children}
    </Text>
  );
}

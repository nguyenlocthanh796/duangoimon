import React from 'react';
import { Text, TextProps } from 'react-native';
import { font, colors } from '../../theme';

interface AppTextProps extends TextProps {
  variant?: 'small' | 'base' | 'medium' | 'large';
  weight?: 'normal' | 'bold';
  color?: string;
  children: React.ReactNode;
}

/**
 * AppText ensures typography strictly adheres to the 4-tier minimal scale.
 * NEVER hardcode fontSize in the app. Use variant instead.
 * 
 * - small: 12px (caption, micro, badge, tableHeader)
 * - base: 14px (bodySmall, tableCell)
 * - medium: 16px (body, button)
 * - large: 20px (sectionTitle, pageTitle, statNumber)
 */
export default function AppText({
  variant = 'base',
  weight = 'normal',
  color = colors.text.primary,
  style,
  children,
  ...props
}: AppTextProps) {
  
  const getFontToken = () => {
    switch (variant) {
      case 'small':
        return weight === 'bold' ? font.badge : font.caption;
      case 'base':
        return weight === 'bold' ? font.tableCellBold : font.bodySmall;
      case 'medium':
        return weight === 'bold' ? font.bodyBold : font.body;
      case 'large':
        return font.sectionTitle; // Large is usually bold by default
      default:
        return font.bodySmall;
    }
  };

  return (
    <Text style={[getFontToken(), { color }, style]} {...props}>
      {children}
    </Text>
  );
}

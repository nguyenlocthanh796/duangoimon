import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';

interface SectionBlockProps {
  children: React.ReactNode;
  /** Bật/tắt padding mặc định (12 trên Mobile, 16 trên iPad). Mặc định: true */
  padding?: boolean;
  /** Custom style thêm nếu cần */
  style?: ViewStyle | ViewStyle[];
}

export default function SectionBlock({ children, padding = true, style }: SectionBlockProps) {
  const { isWide } = useResponsive();

  // Chuẩn hóa lề nội dung theo SKILL: 12px cho iPhone, 16px cho iPad
  const padH = padding ? (isWide ? 16 : 12) : 0;
  
  return (
    <View style={[styles.block, { paddingHorizontal: padH }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#FFFFFF', // Phẳng 100%, trắng tinh khiết
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: 12, // Khoảng cách dòng trên dưới chuẩn
    borderRadius: 0, // Cấm bo góc
    // Xóa toàn bộ shadow
    shadowColor: 'transparent',
    elevation: 0,
    boxShadow: 'none' as any, // Ép bỏ shadow trên Web
  },
});

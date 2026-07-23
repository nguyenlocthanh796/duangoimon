import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';

interface SectionBlockProps {
  children: React.ReactNode;
  /** Bật/tắt padding mặc định. Mặc định: true */
  padding?: boolean;
  /** Custom style thêm nếu cần */
  style?: ViewStyle | ViewStyle[];
}

export default function SectionBlock({ children, padding = true, style }: SectionBlockProps) {
  const { pad } = useResponsive();

  // Chuẩn hóa lề nội dung theo responsive tokens
  const padH = padding ? pad.section : 0;
  
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

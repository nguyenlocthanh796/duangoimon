import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';

export interface ProductGlassFooterProps {
  name: string;
  price: number;
  isOutOfStock?: boolean;
}

export const ProductGlassFooter: React.FC<ProductGlassFooterProps> = ({
  name,
  price,
  isOutOfStock = false,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View
      pointerEvents="none"
      style={[
        s.glassFooter,
        {
          backgroundColor: isOutOfStock
            ? isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(241, 245, 249, 0.95)'
            : isDark
            ? 'rgba(11, 15, 25, 0.82)'
            : 'rgba(255, 255, 255, 0.88)',
          borderTopColor: isOutOfStock
            ? theme.brand.danger
            : isDark
            ? 'rgba(255, 255, 255, 0.15)'
            : 'rgba(255, 255, 255, 0.90)',
        },
      ]}
    >
      {/* Tên món hiển thị 2 dòng súc tích, tránh bị cắt cụt chữ */}
      <AppText
        variant="md"
        weight="medium"
        numberOfLines={2}
        ellipsizeMode="tail"
        color={isOutOfStock ? theme.text.muted : theme.text.primary}
        style={[s.dishName, isOutOfStock && { textDecorationLine: 'line-through' }]}
      >
        {name}
      </AppText>

      {/* Hàng giá tiền */}
      <AppText
        variant="md"
        weight="bold"
        color={isOutOfStock ? theme.brand.danger : theme.text.primary}
        tabularNums
        numberOfLines={1}
      >
        {isOutOfStock ? 'Tạm Hết Món' : `${(Number.isFinite(price) ? price : 0).toLocaleString('vi-VN')} đ`}
      </AppText>
    </View>
  );
};

const s = StyleSheet.create({
  glassFooter: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    minHeight: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    zIndex: 20,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.06)',
        } as any)
      : { elevation: 3 }),
  },
  dishName: {
    textAlign: 'center',
    paddingHorizontal: 2,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';
import { useRouter } from 'expo-router';

interface OrderHeaderProps {
  tableName: string;
  itemsCount: number;
  productsCount: number;
  isWide: boolean;
  onClose?: () => void;
  onOpenSidebar: () => void;
}

export default function OrderHeader({ tableName, itemsCount, productsCount, isWide, onClose, onOpenSidebar }: OrderHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onClose) onClose();
    else router.back();
  };

  return (
    <View style={{
      paddingHorizontal: 12, paddingVertical: 12,
      backgroundColor: colors.surface.header,
      borderBottomWidth: 1, borderBottomColor: colors.border.default,
      flexDirection: 'row', alignItems: 'center',
      boxShadow: '0px 1px 3px rgba(0,0,0,0.15)',
      elevation: 2,
      minHeight: isWide ? 56 : 48,
    }}>
      {isWide && (
        <TouchableOpacity onPress={onOpenSidebar} style={{ width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
          <Icon name="menu" size={18} color={colors.icon.default} />
        </TouchableOpacity>
      )}
      {!onClose && (
        <TouchableOpacity onPress={handleBack} style={{ width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow-left" size={18} color={colors.icon.default} />
        </TouchableOpacity>
      )}
      <View style={{ marginHorizontal: 8, flex: 1 }}>
        <Text style={{ ...(isWide ? font.h3 : font.body), color: colors.text.primary }} numberOfLines={1}>
          {tableName || 'Bàn ăn'}
        </Text>
        <Text style={{ ...font.caption, color: colors.text.muted }}>
          {productsCount} món · {itemsCount} đã chọn
        </Text>
      </View>
      {onClose && (
        <TouchableOpacity onPress={handleBack}
          style={{ width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.danger, borderWidth: 1, borderColor: colors.border.danger, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={colors.icon.danger} />
        </TouchableOpacity>
      )}
    </View>
  );
}

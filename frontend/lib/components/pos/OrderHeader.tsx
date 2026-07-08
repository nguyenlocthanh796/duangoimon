import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, palette } from '../../theme';
import { shape } from '../../theme/shape';
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
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onClose) onClose();
    else router.back();
  };

  return (
    <View style={{
      paddingTop: insets.top + 8,
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surface.header,
      borderBottomWidth: 1, borderBottomColor: colors.border.default,
      flexDirection: 'row', alignItems: 'center',
      shadowColor: palette.slate[900], shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06, shadowRadius: 4,
      elevation: 2,
      zIndex: 10,
    }}>
      {isWide && (
        <TouchableOpacity onPress={onOpenSidebar} style={{ width: 42, height: 42, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
          <Icon name="menu" size={20} color={colors.icon.default} />
        </TouchableOpacity>
      )}
      {!onClose && (
        <TouchableOpacity onPress={handleBack} style={{ width: 42, height: 42, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow-left" size={20} color={colors.icon.default} />
        </TouchableOpacity>
      )}
      <View style={{ marginHorizontal: 8, flex: 1 }}>
        <Text style={{ ...font.h3, color: colors.text.primary }} numberOfLines={1}>
          {tableName || 'Bàn ăn'}
        </Text>
        <Text style={{ ...font.caption, color: colors.text.muted, marginTop: 2 }}>
          {productsCount} món · {itemsCount} đã chọn
        </Text>
      </View>
      {onClose && (
        <TouchableOpacity onPress={handleBack}
          style={{ width: 42, height: 42, borderRadius: shape.radius.md, backgroundColor: colors.surface.danger, borderWidth: 1, borderColor: colors.border.danger, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={20} color={colors.icon.danger} />
        </TouchableOpacity>
      )}
    </View>
  );
}

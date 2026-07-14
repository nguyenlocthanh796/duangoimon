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

export default function OrderHeader({
  tableName,
  itemsCount,
  productsCount,
  isWide,
  onClose,
  onOpenSidebar,
}: OrderHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const btnSize = isWide ? 40 : 36;
  const iconSize = isWide ? 20 : 18;
  const paddingV = isWide ? 10 : 8;

  const handleBack = () => {
    if (onClose) onClose();
    else router.back();
  };

  return (
    <View
      style={{
        paddingTop: insets.top + paddingV,
        paddingBottom: paddingV + 4,
        paddingHorizontal: isWide ? 16 : 12,
        backgroundColor: colors.surface.header,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
        flexDirection: 'row',
        alignItems: 'center',
        boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
        zIndex: 10,
      }}
    >
      {isWide && (
        <TouchableOpacity
          onPress={onOpenSidebar}
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: shape.radius.md,
            backgroundColor: colors.surface.disabled,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 6,
          }}
        >
          <Icon name="menu" size={iconSize} color={colors.icon.default} />
        </TouchableOpacity>
      )}
      {!onClose && (
        <TouchableOpacity
          onPress={handleBack}
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: shape.radius.md,
            backgroundColor: colors.surface.disabled,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="arrow-left" size={iconSize} color={colors.icon.default} />
        </TouchableOpacity>
      )}
      <View style={{ marginHorizontal: 8, flex: 1, justifyContent: 'center' }}>
        <Text
          style={{ ...(isWide ? font.sectionTitle : font.bodyBold), color: colors.text.primary }}
          numberOfLines={1}
        >
          {tableName || 'Bàn ăn'}
        </Text>
        <Text style={{ ...font.badge, color: colors.text.muted, marginTop: 1 }}>
          {productsCount} món · {itemsCount} đã chọn
        </Text>
      </View>
      {onClose && (
        <TouchableOpacity
          onPress={handleBack}
          style={{
            width: btnSize,
            height: btnSize,
            borderRadius: shape.radius.md,
            backgroundColor: colors.surface.danger,
            borderWidth: 1,
            borderColor: colors.border.danger,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" size={iconSize} color={colors.icon.danger} />
        </TouchableOpacity>
      )}
    </View>
  );
}

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, palette } from '../../theme';
import { shape } from '../../theme/shape';
import { useRouter } from 'expo-router';
import UnifiedHeader from '../ui/UnifiedHeader';

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

  const handleBack = () => {
    if (onClose) onClose();
    else router.back();
  };

  return (
    <UnifiedHeader
      title={tableName || 'Bàn ăn'}
      subtitle={`${productsCount} món · ${itemsCount} đã chọn`}
      onMenuPress={!onClose ? onOpenSidebar : undefined}
      onBackPress={onClose ? handleBack : handleBack}
      hideMenu={false}
      right={
        onClose ? (
          <TouchableOpacity
            onPress={handleBack}
            style={{
              width: btnSize,
              height: btnSize,
              borderRadius: 8,
              backgroundColor: colors.surface.danger,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="close" size={iconSize} color={colors.text.danger} />
          </TouchableOpacity>
        ) : null
      }
    />
  );
}

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, palette } from '../../theme';
import { shape } from '../../theme/shape';
import { useRouter } from 'expo-router';
import UnifiedHeader from '../ui/UnifiedHeader';
import { haptic } from '../../haptic';

interface OrderHeaderProps {
  tableName: string;
  itemsCount: number;
  productsCount: number;
  isWide: boolean;
  onClose?: () => void;
  onOpenSidebar: () => void;
  onSendToKitchen?: () => void;
  hasUnsentItems?: boolean;
}

export default function OrderHeader({
  tableName,
  itemsCount,
  productsCount,
  isWide,
  onClose,
  onOpenSidebar,
  onSendToKitchen,
  hasUnsentItems = false,
}: OrderHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const btnSize = isWide ? 40 : 36;
  const iconSize = isWide ? 20 : 18;

  const handleBack = () => {
    if (onClose) onClose();
    else router.back();
  };

  const rightActions = hasUnsentItems && onSendToKitchen ? (
    <TouchableOpacity
      onPress={() => {
        haptic.impact('medium');
        onSendToKitchen();
      }}
      activeOpacity={0.7}
      style={{
        height: 32,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FDBA74',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Icon name="chef-hat" size={16} color="#EA580C" />
      <Text style={{ fontFamily: 'BeVietnamPro_700Bold', fontSize: 14, fontWeight: '700', color: '#EA580C' }}>
        Gửi bếp
      </Text>
    </TouchableOpacity>
  ) : undefined;

  return (
    <UnifiedHeader
      title={tableName || 'Bàn ăn'}
      subtitle={`${productsCount} món · ${itemsCount} đã chọn`}
      onMenuPress={!onClose ? onOpenSidebar : undefined}
      onBackPress={handleBack}
      hideMenu={false}
      right={rightActions}
    />
  );
}

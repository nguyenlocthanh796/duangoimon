import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, formatPrice } from '../../theme';
import { shape } from '../../theme/shape';

interface MobileCartBarProps {
  itemCount: number;
  total: number;
  onPress: () => void;
  onSendToKitchen: () => void;
  onSave: () => void;
  onPay: () => void;
  submitting: boolean;
  hasUnsentItems?: boolean;
}

export default function MobileCartBar({
  itemCount,
  total,
  onPress,
  onSendToKitchen,
  onSave,
  onPay,
  submitting,
  hasUnsentItems = false,
}: MobileCartBarProps) {
  const insets = useSafeAreaInsets();
  const hasItems = itemCount > 0;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface.card,
        paddingBottom: insets.bottom,
        ...shape.shadow.top,
        zIndex: 100,
      }}
    >
      {/* ROW 1: Mini-cart info bar — luôn hiển thị */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!hasItems}
        style={{
          height: 44,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          backgroundColor: colors.surface.miniCartBg,
          borderTopWidth: 1,
          borderTopColor: colors.border.default,
        }}
      >
        <MaterialCommunityIcons
          name="shopping"
          size={20}
          color={hasItems ? colors.text.primary : colors.text.placeholder}
          style={{ marginRight: 8 }}
        />
        <Text
          style={{
            flex: 1,
            ...font.sm,
            color: hasItems ? colors.text.primary : colors.text.placeholder,
          }}
        >
          {hasItems ? `${itemCount} món đã chọn` : 'Chưa có món nào'}
        </Text>
        {hasItems && (
          <Text
            style={{
              ...font.mdBold,
              color: colors.brand.primary,
            }}
          >
            {formatPrice(total)}
          </Text>
        )}
      </TouchableOpacity>

      {/* ROW 2: Action buttons */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 8,
          backgroundColor: colors.surface.card,
          borderTopWidth: 1,
          borderTopColor: colors.border.default,
        }}
      >
        {/* Gửi Bếp */}
        <TouchableOpacity
          onPress={onSendToKitchen}
          disabled={!hasUnsentItems || submitting}
          style={{
            flex: 1,
            height: 52,
            borderRadius: shape.radius.md,
            backgroundColor: hasUnsentItems ? colors.surface.card : colors.surface.disabled,
            borderWidth: 1.5,
            borderColor: hasUnsentItems ? colors.brand.primary : colors.border.default,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              ...font.mdBold,
              color: hasUnsentItems ? colors.brand.primary : colors.text.placeholder,
            }}
          >
            Gửi Bếp
          </Text>
        </TouchableOpacity>

        {/* Lưu HĐ */}
        <TouchableOpacity
          onPress={onSave}
          disabled={submitting}
          style={{
            flex: 1,
            height: 52,
            borderRadius: shape.radius.md,
            backgroundColor: colors.surface.card,
            borderWidth: 1.5,
            borderColor: colors.border.default,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              ...font.mdBold,
              color: colors.text.secondary,
            }}
          >
            Lưu HĐ
          </Text>
        </TouchableOpacity>

        {/* THANH TOÁN → hiển thị số tiền */}
        <TouchableOpacity
          onPress={onPay}
          disabled={submitting}
          style={{
            flex: 1.8,
            height: 52,
            borderRadius: shape.radius.md,
            backgroundColor: colors.brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 4,
          }}
        >
          <Text
            style={{
              color: colors.text.inverse,
              ...font.mdBold,
            }}
          >
            {hasItems ? formatPrice(total) : 'Thanh toán'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

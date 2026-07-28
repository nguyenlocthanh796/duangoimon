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
        paddingBottom: 6,
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
          height: 34,
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
          size={16}
          color={hasItems ? colors.text.primary : colors.text.placeholder}
          style={{ marginRight: 6 }}
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
          paddingVertical: 8,
          gap: 8,
          backgroundColor: colors.surface.card,
          borderTopWidth: 1,
          borderTopColor: colors.border.default,
        }}
      >
        {/* Gửi Bếp */}
        <TouchableOpacity
          onPress={onSendToKitchen}
          delayPressIn={0}
          activeOpacity={0.7}
          disabled={!hasUnsentItems || submitting}
          style={{
            flex: 1,
            height: 50,
            borderRadius: shape.radius.md,
            backgroundColor: hasUnsentItems ? colors.brand.primaryBg : colors.surface.disabled,
            borderWidth: 1.5,
            borderColor: hasUnsentItems ? colors.border.brand : colors.border.default,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              ...font.mdBold,
              color: hasUnsentItems ? colors.text.brand : colors.text.muted,
              fontSize: 14,
            }}
          >
            GỬI BẾP
          </Text>
        </TouchableOpacity>

        {/* Lưu HĐ */}
        <TouchableOpacity
          onPress={onSave}
          delayPressIn={0}
          activeOpacity={0.7}
          disabled={submitting}
          style={{
            flex: 1,
            height: 50,
            borderRadius: shape.radius.md,
            backgroundColor: colors.brand.primaryBg,
            borderWidth: 1.5,
            borderColor: colors.border.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              ...font.mdBold,
              color: colors.text.brand,
              fontSize: 14,
            }}
          >
            LƯU HĐ
          </Text>
        </TouchableOpacity>

        {/* THANH TOÁN */}
        <TouchableOpacity
          onPress={onPay}
          delayPressIn={0}
          activeOpacity={0.85}
          disabled={submitting}
          style={{
            flex: 1.5,
            height: 50,
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
              fontSize: 14,
            }}
          >
            THANH TOÁN
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

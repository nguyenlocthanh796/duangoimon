import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, COLORS, font, formatPrice } from '../../theme';
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
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface.card,
        borderTopWidth: 1,
        borderTopColor: colors.border.default,
        paddingHorizontal: 12,
        paddingVertical: 10,
        boxShadow: '0 -2px 3px rgba(0,0,0,0.15)',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View>
          <MaterialIcons name="shopping-bag" size={30} color={colors.icon.default} />
          <View
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              backgroundColor: COLORS.primary,
              width: 22,
              height: 22,
              borderRadius: 5,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.surface.card,
            }}
          >
            <Text style={{ ...font.badge, color: colors.text.inverse }}>{itemCount}</Text>
          </View>
        </View>
        <View>
          <Text style={{ ...font.buttonSmall, color: colors.text.muted }}>Tổng tiền</Text>
          <Text style={{ ...font.bodyBold, color: COLORS.primary }}>{formatPrice(total)}</Text>
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={onSendToKitchen}
          disabled={!hasUnsentItems || submitting}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 0,
            height: 48,
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
              ...font.button,
              color: hasUnsentItems ? colors.text.brand : colors.text.muted,
            }}
          >
            Gửi Bếp
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSave}
          disabled={submitting}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 0,
            height: 48,
            borderRadius: shape.radius.md,
            backgroundColor: colors.brand.primaryBg,
            borderWidth: 1.5,
            borderColor: colors.border.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ ...font.button, color: colors.text.brand }}>Lưu HĐ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPay}
          disabled={submitting}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 0,
            height: 48,
            borderRadius: shape.radius.md,
            backgroundColor: colors.brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 4,
          }}
        >
          <Text style={{ ...font.button, color: colors.text.inverse }}>Thanh toán</Text>
          <MaterialIcons name="keyboard-arrow-up" size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

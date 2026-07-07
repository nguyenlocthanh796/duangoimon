import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, COLORS, font, formatPrice } from '../../theme';

interface MobileCartBarProps {
  itemCount: number;
  total: number;
  onPress: () => void;
  onSave: () => void;
  onPay: () => void;
  submitting: boolean;
}

export default function MobileCartBar({ itemCount, total, onPress, onSave, onPay, submitting }: MobileCartBarProps) {

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
        paddingHorizontal: 8,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 8,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View>
          <MaterialIcons name="shopping-bag" size={28} color={colors.icon.default} />
          <View
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              backgroundColor: COLORS.primary,
              width: 20,
              height: 20,
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.surface.card,
            }}
          >
            <Text style={{ color: colors.text.inverse, fontSize: 10, fontWeight: '700' }}>{itemCount}</Text>
          </View>
        </View>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text.muted }}>Tổng tiền</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary }}>{formatPrice(total)}</Text>
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={onSave}
          disabled={submitting}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 4,
            backgroundColor: colors.brand.primaryBg,
            borderWidth: 1.5,
            borderColor: colors.border.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.brand }}>Lưu HĐ</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPay}
          disabled={submitting}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 4,
            backgroundColor: colors.brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.inverse }}>Thanh toán</Text>
          <MaterialIcons name="keyboard-arrow-up" size={18} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

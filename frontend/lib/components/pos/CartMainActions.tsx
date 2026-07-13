import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import { MaterialIcons } from '@expo/vector-icons';
import { haptic } from '../../haptic';

interface CartMainActionsProps {
  hasUnsentItems: boolean;
  submitting: boolean;
  canBulkToggle: boolean;
  onSendToKitchen: () => void;
  onSaveTable: () => void;
  onPay: () => void;
  onPrintTemporary?: () => void;
  onBulkToggle: () => void;
  bulkToggleLabel: string;
}

export default function CartMainActions({
  hasUnsentItems,
  submitting,
  canBulkToggle,
  onSendToKitchen,
  onSaveTable,
  onPay,
  onPrintTemporary,
  onBulkToggle,
  bulkToggleLabel,
}: CartMainActionsProps) {
  return (
    <View style={{ gap: 10 }}>
      {/* Temporary Print Button */}
      {onPrintTemporary && (
        <TouchableOpacity
          onPress={onPrintTemporary}
          style={{
            height: 46,
            borderRadius: shape.radius.md,
            backgroundColor: colors.surface.disabled,
            borderWidth: 1,
            borderColor: colors.border.default,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <MaterialIcons name="print" size={18} color={colors.text.secondary} />
          <Text style={{ ...font.buttonSmall, color: colors.text.secondary }}>IN TẠM TÍNH</Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={() => { haptic.impact('light'); onSendToKitchen(); }}
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
              ...font.buttonSmall,
              color: hasUnsentItems ? colors.text.brand : colors.text.muted,
            }}
          >
            GỬI BẾP
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { haptic.impact('light'); onSaveTable(); }}
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
          <Text style={{ ...font.buttonSmall, color: colors.text.brand }}>LƯU HĐ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { haptic.impact('medium'); onPay(); }}
          disabled={submitting}
          style={{
            flex: 1.5,
            height: 50,
            borderRadius: shape.radius.md,
            backgroundColor: colors.brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
          }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Text style={{ ...font.button, color: colors.text.inverse }}>THANH TOÁN</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

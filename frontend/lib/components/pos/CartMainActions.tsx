import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptic } from '../../haptic';
import AppText from '../ui/AppText';

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
    <View style={{ gap: shape.spacing.sm }}>
      {/* Temporary Print Button */}
      {onPrintTemporary && (
        <TouchableOpacity
          onPress={onPrintTemporary}
          style={{
            height: shape.spacing.sp12,
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
          <MaterialCommunityIcons name="printer" size={18} color={colors.text.secondary} />
          <AppText variant="md" color={colors.text.secondary}>IN TẠM TÍNH</AppText>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: 'row', gap: shape.spacing.sm }}>
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
          <AppText
            variant="md"
            color={hasUnsentItems ? colors.text.brand : colors.text.muted}
          >
            GỬI BẾP
          </AppText>
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
          <AppText variant="md" color={colors.text.brand}>LƯU HĐ</AppText>
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
            <AppText variant="md" weight="bold" color={colors.text.inverse}>THANH TOÁN</AppText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

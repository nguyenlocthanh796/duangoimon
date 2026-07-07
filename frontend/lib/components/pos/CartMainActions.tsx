import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';

interface CartMainActionsProps {
  hasUnsentItems: boolean;
  submitting: boolean;
  canBulkToggle: boolean;
  onSendToKitchen: () => void;
  onSaveTable: () => void;
  onPay: () => void;
  onBulkToggle: () => void;
  bulkToggleLabel: string;
}

export default function CartMainActions({
  hasUnsentItems, submitting, canBulkToggle,
  onSendToKitchen, onSaveTable, onPay, onBulkToggle, bulkToggleLabel,
}: CartMainActionsProps) {
  return (
    <View style={{ gap: 8 }}>
      {/* Bulk toggle */}
      {canBulkToggle && (
        <TouchableOpacity
          onPress={onBulkToggle}
          style={{ paddingVertical: 8, borderRadius: 6, backgroundColor: colors.surface.disabled, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.brand }}>
            {bulkToggleLabel}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={onSendToKitchen}
          disabled={!hasUnsentItems || submitting}
          style={{ flex: 1, height: 44, borderRadius: 6, backgroundColor: hasUnsentItems ? colors.brand.primaryBg : colors.surface.disabled, borderWidth: 1.5, borderColor: hasUnsentItems ? colors.border.brand : colors.border.default, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: hasUnsentItems ? colors.text.brand : colors.text.muted }}>GỬI BẾP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSaveTable}
          disabled={submitting}
          style={{ flex: 1, height: 44, borderRadius: 6, backgroundColor: colors.brand.primaryBg, borderWidth: 1.5, borderColor: colors.border.brand, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.brand }}>LƯU HĐ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onPay}
          disabled={submitting}
          style={{ flex: 1.5, height: 44, borderRadius: 6, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}
        >
          {submitting ? <ActivityIndicator size="small" color={colors.text.inverse} /> : <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.inverse }}>THANH TOÁN</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

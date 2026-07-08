import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';
import { MaterialIcons } from '@expo/vector-icons';

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
  hasUnsentItems, submitting, canBulkToggle,
  onSendToKitchen, onSaveTable, onPay, onPrintTemporary, onBulkToggle, bulkToggleLabel,
}: CartMainActionsProps) {
  return (
    <View style={{ gap: 10 }}>
      {/* Temporary Print Button */}
      {onPrintTemporary && (
        <TouchableOpacity
          onPress={onPrintTemporary}
          style={{
            height: 46,
            borderRadius: 8,
            backgroundColor: colors.surface.disabled,
            borderWidth: 1,
            borderColor: colors.border.default,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8
          }}
        >
          <MaterialIcons name="print" size={18} color={colors.text.secondary} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.secondary }}>IN TẠM TÍNH</Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={onSendToKitchen}
          disabled={!hasUnsentItems || submitting}
          style={{ flex: 1, height: 50, borderRadius: 8, backgroundColor: hasUnsentItems ? colors.brand.primaryBg : colors.surface.disabled, borderWidth: 1.5, borderColor: hasUnsentItems ? colors.border.brand : colors.border.default, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: hasUnsentItems ? colors.text.brand : colors.text.muted }}>GỬI BẾP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSaveTable}
          disabled={submitting}
          style={{ flex: 1, height: 50, borderRadius: 8, backgroundColor: colors.brand.primaryBg, borderWidth: 1.5, borderColor: colors.border.brand, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.brand }}>LƯU HĐ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onPay}
          disabled={submitting}
          style={{ flex: 1.5, height: 50, borderRadius: 8, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
        >
          {submitting ? <ActivityIndicator size="small" color={colors.text.inverse} /> : <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text.inverse }}>THANH TOÁN</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

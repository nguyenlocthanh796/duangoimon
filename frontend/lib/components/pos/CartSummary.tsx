import React from 'react';
import { View, Text } from 'react-native';
import { colors, font, formatPrice } from '../../theme';

interface CartSummaryProps {
  total: number;
  serviceChargePercent: number;
  serviceCharge: number;
  vatAmount?: number;
  grandTotal: number;
}

export default function CartSummary({ total, serviceChargePercent, serviceCharge, vatAmount, grandTotal }: CartSummaryProps) {
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ ...font.bodySmall, color: colors.text.secondary }}>Tạm tính</Text>
        <Text style={{ ...font.bodyBold, color: colors.text.primary }}>{formatPrice(total)}</Text>
      </View>
      {vatAmount !== undefined && vatAmount > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ ...font.bodySmall, color: colors.text.secondary }}>Thuế VAT (đã gồm)</Text>
          <Text style={{ ...font.bodySmall, color: colors.text.secondary }}>{formatPrice(vatAmount)}</Text>
        </View>
      )}
      {serviceCharge > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ ...font.bodySmall, color: colors.text.secondary }}>Phí service ({serviceChargePercent}%)</Text>
          <Text style={{ ...font.bodySmall, color: colors.text.secondary }}>{formatPrice(serviceCharge)}</Text>
        </View>
      )}
      <View style={{ height: 1, backgroundColor: colors.border.light, marginVertical: 2 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ ...font.bodyBold, color: colors.text.primary }}>Tổng cộng</Text>
        <Text style={{ ...font.price, color: colors.text.primary }}>{formatPrice(grandTotal)}</Text>
      </View>
    </View>
  );
}

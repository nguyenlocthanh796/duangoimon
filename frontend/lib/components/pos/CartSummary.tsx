import React from 'react';
import { View, Text } from 'react-native';
import { colors, formatPrice } from '../../theme/colors';

interface CartSummaryProps {
  total: number;
  serviceChargePercent: number;
  serviceCharge: number;
  grandTotal: number;
}

export default function CartSummary({ total, serviceChargePercent, serviceCharge, grandTotal }: CartSummaryProps) {
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: colors.text.secondary }}>Tạm tính</Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary }}>{formatPrice(total)}</Text>
      </View>
      {serviceCharge > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.text.secondary }}>Phí service ({serviceChargePercent}%)</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.secondary }}>{formatPrice(serviceCharge)}</Text>
        </View>
      )}
      <View style={{ height: 1, backgroundColor: colors.border.light, marginVertical: 2 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text.primary }}>Tổng cộng</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary }}>{formatPrice(grandTotal)}</Text>
      </View>
    </View>
  );
}

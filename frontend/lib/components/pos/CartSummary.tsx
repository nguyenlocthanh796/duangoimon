import React from 'react';
import { View } from 'react-native';
import { colors, formatPrice } from '../../theme';
import AppText from '../ui/AppText';

interface CartSummaryProps {
  total: number;
  serviceChargePercent: number;
  serviceCharge: number;
  vatAmount?: number;
  grandTotal: number;
}

export default function CartSummary({
  total,
  serviceChargePercent,
  serviceCharge,
  vatAmount,
  grandTotal,
}: CartSummaryProps) {
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="md" color={colors.text.secondary}>Tạm tính</AppText>
        <AppText variant="md" weight="bold" color={colors.text.primary}>{formatPrice(total)}</AppText>
      </View>
      {vatAmount !== undefined && vatAmount > 0 && (
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <AppText variant="md" color={colors.text.secondary}>Thuế VAT (đã gồm)</AppText>
          <AppText variant="md" color={colors.text.secondary}>
            {formatPrice(vatAmount)}
          </AppText>
        </View>
      )}
      {serviceCharge > 0 && (
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <AppText variant="md" color={colors.text.secondary}>
            Phí service ({serviceChargePercent}%)
          </AppText>
          <AppText variant="md" color={colors.text.secondary}>
            {formatPrice(serviceCharge)}
          </AppText>
        </View>
      )}
      <View style={{ height: 1, backgroundColor: colors.border.light, marginVertical: 2 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="md" weight="bold" color={colors.text.primary}>Tổng cộng</AppText>
        <AppText variant="lg" weight="bold" color={colors.text.primary}>{formatPrice(grandTotal)}</AppText>
      </View>
    </View>
  );
}

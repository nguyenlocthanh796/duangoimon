import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { AppText } from '../../../lib/components/ui/AppText';
import { CartItem } from '../../../lib/store/usePOSStore';

interface PaymentOrderSummaryProps {
  cart: CartItem[];
  totalQty: number;
  isWide?: boolean;
  expandOrderItems?: boolean;
  onToggleExpand?: () => void;
  subTotal?: number;
  discountAmount?: number;
  pointsDiscount?: number;
  serviceFeeAmount?: number;
  serviceFeeRate?: number;
  flatSurcharge?: number;
  surchargeLabel?: string;
  vatAmount?: number;
  vatRate?: number;
  finalTotal?: number;
}

export const PaymentOrderSummary: React.FC<PaymentOrderSummaryProps> = ({
  cart,
  totalQty,
  isWide = false,
  expandOrderItems = false,
  onToggleExpand,
  subTotal,
  discountAmount = 0,
  pointsDiscount = 0,
  serviceFeeAmount = 0,
  serviceFeeRate = 0,
  flatSurcharge = 0,
  surchargeLabel,
  vatAmount = 0,
  vatRate = 0,
  finalTotal,
}) => {
  const { theme } = useTheme();

  const renderFinancialRows = () => {
    if (subTotal === undefined) return null;
    return (
      <View style={{ gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
          <AppText variant="sm" color={theme.text.muted}>Tạm tính tiền món:</AppText>
          <AppText variant="md" weight="normal" color={theme.text.primary} tabularNums>
            {subTotal.toLocaleString('vi-VN')} đ
          </AppText>
        </View>

        {discountAmount > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
            <AppText variant="sm" color={theme.brand.danger}>Chiết khấu giảm giá:</AppText>
            <AppText variant="md" weight="normal" color={theme.brand.danger} tabularNums>
              -{discountAmount.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
        )}

        {pointsDiscount > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
            <AppText variant="sm" color={theme.brand.success}>Điểm tích lũy CRM:</AppText>
            <AppText variant="md" weight="normal" color={theme.brand.success} tabularNums>
              -{pointsDiscount.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
        )}

        {serviceFeeAmount > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
            <AppText variant="sm" color={theme.text.muted}>
              Phí dịch vụ / Phụ thu{serviceFeeRate > 0 ? ` (${serviceFeeRate}%)` : surchargeLabel ? ` (${surchargeLabel})` : ''}:
            </AppText>
            <AppText variant="md" weight="normal" color={theme.text.primary} tabularNums>
              +{serviceFeeAmount.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
        )}

        {vatAmount > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
            <AppText variant="sm" color={theme.text.muted}>
              Thuế VAT ({vatRate}%):
            </AppText>
            <AppText variant="md" weight="normal" color={theme.text.primary} tabularNums>
              +{vatAmount.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
        )}

        {finalTotal !== undefined && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginTop: 4, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle }}>
            <AppText variant="md" weight="medium" color={theme.text.primary}>Tổng cộng:</AppText>
            <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
              {finalTotal.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
        )}
      </View>
    );
  };

  if (isWide) {
    return (
      <View style={[s.seamlessSummaryList, { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border.subtle }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 4 }}>
          <Icon name="receipt" size={18} color={theme.brand.primary} />
          <AppText variant="md" weight="medium" color={theme.text.primary}>
            Chi tiết hóa đơn ({cart.length} món · {totalQty} phần)
          </AppText>
        </View>
        <View style={{ gap: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle }}>
          {cart.map((c, idx) => {
            const itemName = c?.item?.name || (c as any)?.name || 'Món ăn';
            const unitPrice = Number(c?.unitPrice || (c as any)?.price || 0);
            const qty = Number(c?.qty || 1);
            return (
              <View key={c?.cartItemId || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
                <AppText variant="md" color={theme.text.primary} numberOfLines={2} ellipsizeMode="tail" style={{ flex: 1, paddingRight: 8 }}>
                  {qty}x {itemName}
                </AppText>
                <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
                  {(unitPrice * qty).toLocaleString('vi-VN')} đ
                </AppText>
              </View>
            );
          })}
        </View>
        {renderFinancialRows()}
      </View>
    );
  }

  return (
    <View
      style={[
        s.seamlessSummaryList,
        {
          backgroundColor: theme.surface.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border.subtle,
          borderRadius: 0,
          borderWidth: 0,
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={expandOrderItems ? 'Thu gọn chi tiết món' : 'Xem chi tiết món'}
        onPress={() => {
          if (Platform.OS !== 'web') {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
          }
          if (onToggleExpand) onToggleExpand();
        }}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="receipt" size={16} color={theme.brand.primary} />
          <AppText variant="sm" weight="medium" color={theme.text.primary}>
            Chi tiết món ({cart.length} món · {totalQty} phần)
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AppText variant="xs" color={theme.text.muted}>
            {expandOrderItems ? 'Thu gọn' : 'Xem'}
          </AppText>
          <Icon
            name={expandOrderItems ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.text.muted}
          />
        </View>
      </TouchableOpacity>

      {expandOrderItems && (
        <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle }}>
          {cart.map((c, idx) => {
            const itemName = c?.item?.name || (c as any)?.name || 'Món ăn';
            const unitPrice = Number(c?.unitPrice || (c as any)?.price || 0);
            const qty = Number(c?.qty || 1);
            const size = typeof c?.selectedSize === 'object' ? (c?.selectedSize as any)?.name : c?.selectedSize;
            const toppings = c?.selectedToppings?.map((t: any) => (typeof t === 'object' ? t?.name : t)).filter(Boolean).join(', ');
            return (
              <View
                key={c?.cartItemId || idx}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 7,
                  paddingHorizontal: 4,
                  borderBottomWidth: idx < cart.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: theme.border.subtle,
                }}
              >
                <View style={{ flex: 1, paddingRight: 8, gap: 2 }}>
                  <AppText variant="md" weight="normal" color={theme.text.primary} numberOfLines={2} ellipsizeMode="tail">
                    {qty}x {itemName}
                  </AppText>
                  {(size || toppings) ? (
                    <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                      {[size ? (String(size).toLowerCase().startsWith('size') ? String(size) : `Size ${size}`) : null, toppings].filter(Boolean).join(' · ')}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
                  {(unitPrice * qty).toLocaleString('vi-VN')} đ
                </AppText>
              </View>
            );
          })}
          {renderFinancialRows()}
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  seamlessSummaryList: {
    paddingVertical: 8,
    marginVertical: 4,
  },
});

export default PaymentOrderSummary;

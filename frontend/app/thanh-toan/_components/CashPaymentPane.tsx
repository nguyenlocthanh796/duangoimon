import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { AppText } from '../../../lib/components/ui/AppText';

import { SmartPreset } from '../../../lib/utils/cashPresets';

interface CashPaymentPaneProps {
  cashGiven: number;
  changeAmount: number;
  totalAmount: number;
  fixedPresets: SmartPreset[];
  onSelectPreset: (amt: number) => void;
  onAddCash: (addedAmt: number) => void;
}

export const CashPaymentPane: React.FC<CashPaymentPaneProps> = ({
  cashGiven,
  changeAmount,
  totalAmount,
  fixedPresets,
  onSelectPreset,
  onAddCash,
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      {/* 1. CHỈ SỐ TÀI CHÍNH PHẲNG LIỀN MẠCH (SEAMLESS FINANCIAL STRIP 100% DE-BOXING) */}
      <View
        style={[
          s.seamlessFinancialRow,
          {
            backgroundColor: theme.surface.card,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: theme.border.subtle,
            paddingHorizontal: 16,
            paddingVertical: 12,
          },
        ]}
      >
        {/* Bên trái: Tiền khách đưa */}
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Khách đưa đúng số tiền hóa đơn"
          onPress={() => onSelectPreset(totalAmount)}
          style={s.seamlessCol}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <Icon name="cash" size={16} color={theme.brand.primary} />
            <AppText variant="xs" color={theme.text.muted}>Khách đưa:</AppText>
          </View>
          <AppText variant="xl" weight="medium" color={theme.brand.primary} tabularNums>
            {cashGiven.toLocaleString('vi-VN')} đ
          </AppText>
        </TouchableOpacity>

        {/* Đường hairline dọc phân cách giữa 2 cột */}
        <View style={[s.verticalHairline, { backgroundColor: theme.border.subtle }]} />

        {/* Bên phải: Tiền thối lại hoặc tiền thiếu */}
        <View style={s.seamlessCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <Icon
              name={
                cashGiven < totalAmount
                  ? 'alert-circle-outline'
                  : changeAmount > 0
                  ? 'cash-refund'
                  : 'check-circle-outline'
              }
              size={16}
              color={
                cashGiven < totalAmount
                  ? theme.brand.danger
                  : changeAmount > 0
                  ? theme.brand.success
                  : theme.text.muted
              }
            />
            <AppText
              variant="xs"
              color={
                cashGiven < totalAmount
                  ? theme.brand.danger
                  : changeAmount > 0
                  ? theme.brand.success
                  : theme.text.muted
              }
            >
              {cashGiven < totalAmount ? 'Còn thiếu:' : 'Tiền thừa:'}
            </AppText>
          </View>
          <AppText
            variant="xl"
            weight="medium"
            color={
              cashGiven < totalAmount
                ? theme.brand.danger
                : changeAmount > 0
                ? theme.brand.success
                : theme.text.muted
            }
            tabularNums
          >
            {cashGiven < totalAmount
              ? `${(totalAmount - cashGiven).toLocaleString('vi-VN')} đ`
              : `${changeAmount.toLocaleString('vi-VN')} đ`}
          </AppText>
        </View>
      </View>

      {/* 2. LƯỚI GẠCH XÚC GIÁC MỆNH GIÁ (100% 1-CHẠM, 52PX) */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={s.sectionHeader}>
          <AppText variant="xs" weight="bold" color={theme.text.muted}>
            GỢI Ý MỆNH GIÁ TIỀN MẶT
          </AppText>
        </View>

        <View style={s.fixedGridContainer}>
          {fixedPresets.map((p) => {
            const isSelected =
              p.type === 'exact'
                ? cashGiven === totalAmount
                : p.type === 'set' && cashGiven === p.value;

            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Chọn mệnh giá ${p.label}`}
                onPress={() => {
                  if (p.type === 'exact') onSelectPreset(totalAmount);
                  else if (p.type === 'set') onSelectPreset(p.value);
                  else if (p.type === 'add') onAddCash(p.value);
                }}
                style={[
                  s.fixedGridBtn,
                  {
                    backgroundColor: isSelected ? theme.status.warningBg : theme.surface.card,
                    borderWidth: isSelected ? 1.5 : StyleSheet.hairlineWidth,
                    borderColor: isSelected ? theme.brand.accent : theme.border.subtle,
                  },
                ]}
              >
                <AppText
                  variant="md"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={isSelected ? theme.brand.accent : theme.text.primary}
                  tabularNums
                >
                  {p.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  seamlessFinancialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
  },
  seamlessCol: {
    flex: 1,
  },
  verticalHairline: {
    width: StyleSheet.hairlineWidth,
    height: 42,
    marginHorizontal: 12,
  },
  sectionHeader: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  fixedGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fixedGridBtn: {
    width: '31.6%',
    borderRadius: 10,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  miniAddBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 10,
  },
});

export default CashPaymentPane;

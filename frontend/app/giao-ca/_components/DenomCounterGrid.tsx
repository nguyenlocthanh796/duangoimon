import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { AppText } from '../../../lib/components/ui/AppText';
import { formatCurrency } from '../../../lib/utils/format';

export const CASH_DENOMINATIONS = [
  500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000,
];

export interface DenomCounterGridProps {
  denomCounts: Record<number, number>;
  onUpdate: (denom: number, delta: number) => void;
  isClosed: boolean;
  isDesktopLarge?: boolean;
}

export const DenomCounterGrid: React.FC<DenomCounterGridProps> = ({
  denomCounts,
  onUpdate,
  isClosed,
  isDesktopLarge,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[s.gridContainer, isDesktopLarge && s.gridDesktop]}>
      {CASH_DENOMINATIONS.map((denom) => {
        const count = denomCounts[denom] || 0;
        const lineTotal = denom * count;
        return (
          <View
            key={denom}
            style={[
              s.rowItem,
              isDesktopLarge && [
                s.rowItemDesktop,
                {
                  borderColor: count > 0 ? theme.brand.primary : theme.border.subtle,
                  backgroundColor: count > 0 ? theme.brand.primaryBg : theme.surface.card,
                },
              ],
              {
                backgroundColor: theme.surface.card,
                borderBottomColor: theme.border.subtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            {/* Cột Mệnh Giá & Thành Tiền */}
            <View style={s.infoCol}>
              <AppText
                variant="md"
                weight={count > 0 ? 'medium' : 'normal'}
                color={theme.text.primary}
                tabularNums
              >
                {formatCurrency(denom)} đ
              </AppText>
              <AppText
                variant="xs"
                color={count > 0 ? theme.brand.primary : theme.text.muted}
                tabularNums
                style={s.subTotalText}
              >
                = {formatCurrency(lineTotal)} đ
              </AppText>
            </View>

            {/* Cột Bộ Đếm Stepper Touch Target 44x44pt */}
            <View style={s.stepperRow}>
              {/* Nút Giảm (-) */}
              <TouchableOpacity
                disabled={isClosed || count <= 0}
                onPress={() => onUpdate(denom, -1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  s.stepBtn,
                  {
                    backgroundColor: count > 0 ? theme.surface.header : theme.surface.app,
                    opacity: count > 0 ? 1 : 0.35,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: count > 0 ? theme.border.subtle : 'transparent',
                  },
                ]}
              >
                <Icon name="minus" size={18} color={count > 0 ? theme.text.primary : theme.text.muted} />
              </TouchableOpacity>

              {/* Huy hiệu số tờ */}
              <View style={s.badgeBox}>
                <AppText
                  variant="md"
                  weight={count > 0 ? 'medium' : 'normal'}
                  color={count > 0 ? theme.brand.primary : theme.text.primary}
                  tabularNums
                >
                  {count}
                </AppText>
              </View>

              {/* Nút Tăng (+) */}
              <TouchableOpacity
                disabled={isClosed}
                onPress={() => onUpdate(denom, 1)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  s.stepBtn,
                  {
                    backgroundColor: theme.brand.primaryBg,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.brand.primary,
                  },
                ]}
              >
                <Icon name="plus" size={18} color={theme.brand.primary} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  gridContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
  gridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    borderTopWidth: 0,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowItemDesktop: {
    width: '48.8%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  infoCol: {
    flex: 1,
    paddingRight: 8,
  },
  subTotalText: {
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBox: {
    minWidth: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

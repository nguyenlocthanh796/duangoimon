import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';

export interface TableCardCenterProps {
  name?: string;
  totalAmount?: number;
  isOccupied: boolean;
  isEmpty: boolean;
  isReserved: boolean;
  isPrePrinted?: boolean;
  elapsedMin?: number;
  activeItemCount: number;
  note?: string;
}

export const TableCardCenter: React.FC<TableCardCenterProps> = ({
  name = '',
  totalAmount = 0,
  isOccupied,
  isEmpty,
  isReserved,
  isPrePrinted,
  activeItemCount,
  note,
}) => {
  const { theme, isDark } = useTheme();

  const isPositive = typeof totalAmount === 'number' && Number.isFinite(totalAmount) && totalAmount > 0;

  const nameColor = isPrePrinted
    ? theme.brand.warning
    : theme.text.primary;

  const priceColor = isPrePrinted
    ? theme.brand.warning
    : theme.text.primary;

  return (
    <View style={s.centerSection}>
      {/* 🌟 1. TÊN BÀN TO RÕ RÀNG Ở CHÍNH GIỮA */}
      <AppText
        variant={name.length > 11 ? 'sm' : name.length > 8 ? 'md' : 'lg'}
        weight="bold"
        color={nameColor}
        numberOfLines={1}
        style={s.heroTableName}
      >
        {name}
      </AppText>

      {/* 🌟 2. SỐ TIỀN THAY THẾ VỊ TRÍ THỜI GIAN (HOẶC CHIP BÀN TRỐNG) */}
      <View style={s.valueRow}>
        {isOccupied || isPrePrinted ? (
          isPositive ? (
            <AppText
              variant="md"
              weight="bold"
              color={priceColor}
              tabularNums
              numberOfLines={1}
              style={s.heroPriceText}
            >
              {totalAmount.toLocaleString('vi-VN')} đ
            </AppText>
          ) : (
            <AppText variant="xs" color={theme.text.muted}>
              Chưa gọi món
            </AppText>
          )
        ) : isEmpty ? (
          <View style={[s.vacantChip, { backgroundColor: theme.status.readyBg }]}>
            <View style={[s.vacantDot, { backgroundColor: theme.brand.success }]} />
            <AppText variant="xs" weight="medium" color={theme.brand.success}>
              Bàn trống
            </AppText>
          </View>
        ) : (
          <View style={s.infoRow}>
            <Icon name="calendar-clock" size={13} color={theme.brand.warning} />
            <AppText variant="xs" color={theme.brand.warning} numberOfLines={1}>
              {note || 'Chờ khách nhận'}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  centerSection: {
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  heroTableName: {
    letterSpacing: -0.3,
    marginBottom: 2,
    textAlign: 'center',
  },
  valueRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
  },
  heroPriceText: {
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vacantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vacantDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

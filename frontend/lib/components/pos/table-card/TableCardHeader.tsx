import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';

export interface TableCardHeaderProps {
  name: string;
  area?: string;
  guestCount?: number;
  capacity: number;
  isOccupied: boolean;
  isReserved?: boolean;
  isPrePrinted?: boolean;
  activeItemCount?: number;
}

export const TableCardHeader: React.FC<TableCardHeaderProps> = ({
  name,
  area,
  capacity,
  isOccupied,
  isReserved,
  isPrePrinted,
  activeItemCount = 0,
}) => {
  const { theme, isDark } = useTheme();

  const nameColor = isPrePrinted
    ? theme.brand.warning
    : theme.text.primary;

  return (
    <View style={s.topRow}>
      {/* Phụ Đề Khu Vực & Sức Chứa */}
      <View style={s.subMeta}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1} tabularNums>
          {area ? `${area.replace(/^Tầng\s+/, '')} · ` : ''}{capacity} chỗ
        </AppText>
      </View>

      {/* Badge Trạng Thái Bên Phải */}
      {isPrePrinted ? (
        <View style={[s.statusBadge, { backgroundColor: theme.status.warningBg }]}>
          <AppText variant="xxs" weight="bold" color={theme.brand.warning}>
            IN BILL
          </AppText>
        </View>
      ) : isOccupied ? (
        activeItemCount > 0 ? (
          <View style={[s.statusBadge, { backgroundColor: theme.brand.accent }]}>
            <AppText variant="xxs" weight="bold" color={theme.text.onBrand} tabularNums>
              {activeItemCount} MÓN
            </AppText>
          </View>
        ) : (
          <View style={[s.statusDotBadge, { backgroundColor: theme.brand.accent }]} />
        )
      ) : isReserved ? (
        <View style={[s.statusBadge, { backgroundColor: isDark ? 'rgba(126, 34, 206, 0.20)' : 'rgba(126, 34, 206, 0.08)' }]}>
          <AppText variant="xxs" weight="bold" color={theme.brand.purple}>
            ĐÃ ĐẶT
          </AppText>
        </View>
      ) : (
        <View style={[s.vacantDot, { backgroundColor: theme.border.subtle }]} />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  subMeta: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusDotBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  vacantDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
});

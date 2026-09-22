import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';

export interface TableCardFooterProps {
  totalAmount?: number;
  isOccupied: boolean;
  isEmpty?: boolean;
  isReserved: boolean;
  isPrePrinted?: boolean;
  elapsedMin?: number;
}

export const TableCardFooter: React.FC<TableCardFooterProps> = ({
  totalAmount = 0,
  isOccupied,
  isEmpty,
  isReserved,
  isPrePrinted,
  elapsedMin = 0,
}) => {
  const { theme, isDark } = useTheme();

  const isLongServing = elapsedMin >= 60;
  const timerColor = isPrePrinted
    ? theme.brand.warning
    : isLongServing
    ? theme.brand.danger
    : theme.brand.accent;

  const formatElapsed = (min: number) => {
    if (min <= 0) return 'Đang ngồi';
    if (min < 60) return `${min} phút`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}p` : `${h}h`;
  };

  return (
    <View style={s.bottomSection}>
      {isOccupied || isPrePrinted ? (
        <View style={s.footerRow}>
          {/* Bên trái: Thời gian / Trạng thái (Text thuần tối giản, không icon) */}
          <AppText
            variant="xs"
            weight="medium"
            color={timerColor}
            tabularNums
            numberOfLines={1}
            style={s.leftMeta}
          >
            {isPrePrinted ? 'Chờ thanh toán' : formatElapsed(elapsedMin)}
          </AppText>

          {/* Bên phải: Chi tiết (Cân bằng thị giác đối xứng) */}
          <AppText variant="xs" weight="normal" color={theme.text.muted} style={s.rightAction}>
            {isPrePrinted ? 'Thu tiền' : 'Chi tiết'}
          </AppText>
        </View>
      ) : isReserved ? (
        <View style={s.footerRow}>
          <AppText variant="xs" color={theme.brand.warning} weight="medium" style={s.leftMeta}>
            Khách đã đặt trước
          </AppText>
          <AppText variant="xs" color={theme.text.muted} weight="normal" style={s.rightAction}>
            Nhận bàn
          </AppText>
        </View>
      ) : (
        <View style={s.footerRow}>
          {/* Bên trái: Sẵn sàng */}
          <AppText variant="xs" color={theme.text.muted} weight="normal" style={s.leftMeta}>
            Sẵn sàng
          </AppText>

          {/* Bên phải: + Mở bàn */}
          <AppText variant="xs" weight="medium" color={theme.brand.primary} style={s.rightAction}>
            + Mở bàn
          </AppText>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  bottomSection: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.20)',
    paddingTop: 5,
    marginTop: 3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftMeta: {
    flex: 1,
    textAlign: 'left',
  },
  rightAction: {
    flexShrink: 0,
    textAlign: 'right',
  },
});

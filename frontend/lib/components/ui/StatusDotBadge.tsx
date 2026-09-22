import React, { memo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { AppText } from './AppText';

export type StatusType =
  | 'pending'
  | 'cooking'
  | 'ready'
  | 'served'
  | 'cancelled'
  | 'voided'
  | 'trong'
  | 'co_khach'
  | 'dat_truoc'
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'active'
  | 'inactive'
  | 'on_shift'
  | 'off_shift'
  | 'open'
  | 'closed'
  | 'balanced'
  | 'difference'
  | 'paid'
  | 'unpaid'
  | 'debt'
  | 'refunded'
  | 'da_thanh_toan'
  | 'chua_thanh_toan'
  | 'ghi_no'
  | 'over'
  | 'short'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | (string & {});

export interface StatusDotBadgeProps {
  status?: StatusType;
  label?: string;
  dotOnly?: boolean;
  showDot?: boolean;
  size?: 'sm' | 'md';
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface ResolvedStatusConfig {
  bg: string;
  text: string;
  border: string;
  dot: string;
  defaultLabel: string;
}

/**
 * 👑 StatusDotBadge - Huy Hiệu & Chấm Tròn Trạng Thái Đa Năng Chuẩn AGENTS.md
 * - Tự động ánh xạ màu nền, viền và chữ theo theme.status.* và theme.brand.*.
 * - Hỗ trợ đầy đủ: Đơn hàng, KDS, Bàn ăn, Kho hàng, Nhân sự, Giao ca két tiền.
 * - Hỗ trợ 2 chế độ: Chỉ hiển thị chấm tròn (dotOnly) hoặc Huy hiệu viên thuốc kèm chấm (badge).
 * - Chuẩn Typography: <AppText variant="xs" weight="medium" tabularNums>.
 */
function StatusDotBadgeComponent({
  status = 'neutral',
  label,
  dotOnly = false,
  showDot = true,
  size = 'md',
  color,
  backgroundColor,
  borderColor,
  style,
  testID,
}: StatusDotBadgeProps) {
  const { theme, isDark } = useTheme();

  const resolveConfig = (): ResolvedStatusConfig => {
    switch (status) {
      // 1. Đơn hàng & KDS
      case 'cooking':
        return {
          bg: theme.status.cookingBg,
          text: theme.status.cookingText,
          border: theme.status.cookingBorder,
          dot: theme.brand.cyan,
          defaultLabel: 'Đang nấu',
        };
      case 'ready':
        return {
          bg: theme.status.readyBg,
          text: theme.status.readyText,
          border: theme.status.readyBorder,
          dot: theme.brand.success,
          defaultLabel: 'Sẵn sàng',
        };
      case 'served':
        return {
          bg: theme.status.readyBg,
          text: theme.brand.success,
          border: theme.status.readyBorder,
          dot: theme.brand.success,
          defaultLabel: 'Đã phục vụ',
        };
      case 'pending':
        return {
          bg: theme.status.pendingBg,
          text: theme.status.pendingText,
          border: theme.status.pendingBorder,
          dot: theme.brand.warning,
          defaultLabel: 'Chờ làm',
        };
      case 'cancelled':
      case 'voided':
        return {
          bg: theme.status.dangerBg,
          text: theme.status.dangerText,
          border: theme.status.dangerBorder,
          dot: theme.brand.danger,
          defaultLabel: 'Đã hủy',
        };

      // 2. Bàn ăn
      case 'trong':
        return {
          bg: isDark ? theme.surface.header : theme.surface.app,
          text: theme.text.muted,
          border: theme.border.subtle,
          dot: theme.text.muted,
          defaultLabel: 'Bàn trống',
        };
      case 'co_khach':
        return {
          bg: `${theme.brand.accent}15`,
          text: theme.brand.accent,
          border: `${theme.brand.accent}30`,
          dot: theme.brand.accent,
          defaultLabel: 'Có khách',
        };
      case 'dat_truoc':
        return {
          bg: theme.status.warningBg,
          text: theme.status.warningText,
          border: theme.status.warningBorder,
          dot: theme.brand.warning,
          defaultLabel: 'Đặt trước',
        };

      // 3. Kho hàng
      case 'in_stock':
        return {
          bg: theme.status.readyBg,
          text: theme.status.readyText,
          border: theme.status.readyBorder,
          dot: theme.brand.success,
          defaultLabel: 'Còn hàng',
        };
      case 'low_stock':
        return {
          bg: theme.status.warningBg,
          text: theme.status.warningText,
          border: theme.status.warningBorder,
          dot: theme.brand.warning,
          defaultLabel: 'Sắp hết',
        };
      case 'out_of_stock':
        return {
          bg: theme.status.dangerBg,
          text: theme.status.dangerText,
          border: theme.status.dangerBorder,
          dot: theme.brand.danger,
          defaultLabel: 'Hết hàng',
        };

      // 4. Nhân sự & Ca làm
      case 'active':
      case 'on_shift':
        return {
          bg: theme.status.readyBg,
          text: theme.status.readyText,
          border: theme.status.readyBorder,
          dot: theme.brand.success,
          defaultLabel: 'Đang làm',
        };
      case 'inactive':
      case 'off_shift':
        return {
          bg: isDark ? theme.surface.header : theme.surface.app,
          text: theme.text.muted,
          border: theme.border.subtle,
          dot: theme.text.muted,
          defaultLabel: 'Nghỉ ca',
        };

      // 5. Giao ca két tiền
      case 'open':
        return {
          bg: theme.status.readyBg,
          text: theme.brand.success,
          border: theme.status.readyBorder,
          dot: theme.brand.success,
          defaultLabel: 'Đang mở',
        };
      case 'closed':
        return {
          bg: isDark ? theme.surface.header : theme.surface.app,
          text: theme.text.muted,
          border: theme.border.subtle,
          dot: theme.text.muted,
          defaultLabel: 'Đã đóng',
        };
      case 'balanced':
        return {
          bg: theme.status.readyBg,
          text: theme.brand.success,
          border: theme.status.readyBorder,
          dot: theme.brand.success,
          defaultLabel: 'Khớp két',
        };
      case 'difference':
        return {
          bg: theme.status.dangerBg,
          text: theme.brand.danger,
          border: theme.status.dangerBorder,
          dot: theme.brand.danger,
          defaultLabel: 'Lệch két',
        };

      // 6. Doanh thu & Hóa đơn & Công nợ
      case 'paid':
      case 'da_thanh_toan':
        return {
          bg: theme.status.readyBg,
          text: theme.brand.success,
          border: theme.status.readyBorder,
          dot: theme.brand.success,
          defaultLabel: 'Đã thanh toán',
        };
      case 'unpaid':
      case 'chua_thanh_toan':
        return {
          bg: theme.status.dangerBg,
          text: theme.brand.danger,
          border: theme.status.dangerBorder,
          dot: theme.brand.danger,
          defaultLabel: 'Chưa thanh toán',
        };
      case 'debt':
      case 'ghi_no':
        return {
          bg: theme.status.warningBg,
          text: theme.brand.warning,
          border: theme.status.warningBorder,
          dot: theme.brand.warning,
          defaultLabel: 'Ghi nợ',
        };
      case 'refunded':
        return {
          bg: theme.status.dangerBg,
          text: theme.brand.danger,
          border: theme.status.dangerBorder,
          dot: theme.brand.danger,
          defaultLabel: 'Hoàn tiền',
        };
      case 'over':
        return {
          bg: theme.status.warningBg,
          text: theme.brand.warning,
          border: theme.status.warningBorder,
          dot: theme.brand.warning,
          defaultLabel: 'Thừa két',
        };
      case 'short':
        return {
          bg: theme.status.dangerBg,
          text: theme.brand.danger,
          border: theme.status.dangerBorder,
          dot: theme.brand.danger,
          defaultLabel: 'Thiếu két',
        };

      // 7. Generic semantic tokens
      case 'success':
        return {
          bg: theme.status.readyBg,
          text: theme.status.readyText,
          border: theme.status.readyBorder,
          dot: theme.brand.success,
          defaultLabel: 'Thành công',
        };
      case 'warning':
        return {
          bg: theme.status.warningBg,
          text: theme.status.warningText,
          border: theme.status.warningBorder,
          dot: theme.brand.warning,
          defaultLabel: 'Cảnh báo',
        };
      case 'danger':
        return {
          bg: theme.status.dangerBg,
          text: theme.status.dangerText,
          border: theme.status.dangerBorder,
          dot: theme.brand.danger,
          defaultLabel: 'Nguy hiểm',
        };
      case 'info':
        return {
          bg: theme.status.cookingBg,
          text: theme.status.cookingText,
          border: theme.status.cookingBorder,
          dot: theme.brand.cyan,
          defaultLabel: 'Thông tin',
        };
      default:
        return {
          bg: isDark ? theme.surface.header : theme.surface.app,
          text: theme.text.muted,
          border: theme.border.subtle,
          dot: theme.text.muted,
          defaultLabel: status,
        };
    }
  };

  const cfg = resolveConfig();
  const finalBg = backgroundColor || cfg.bg;
  const finalText = color || cfg.text;
  const finalBorder = borderColor || cfg.border;
  const finalDot = color || cfg.dot;
  const displayLabel = label !== undefined ? label : cfg.defaultLabel;

  const dotSize = size === 'sm' ? 6 : 8;

  if (dotOnly) {
    return (
      <View
        testID={testID}
        style={[
          styles.dotCircle,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: finalDot,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
        {
          backgroundColor: finalBg,
          borderColor: finalBorder,
        },
        style,
      ]}
    >
      {showDot && (
        <View
          style={[
            styles.dotCircle,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: finalDot,
              marginRight: 6,
            },
          ]}
        />
      )}
      <AppText
        variant="xs"
        weight="medium"
        color={finalText}
        tabularNums
        numberOfLines={1}
      >
        {displayLabel}
      </AppText>
    </View>
  );
}

export const StatusDotBadge = memo(StatusDotBadgeComponent);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dotCircle: {
    flexShrink: 0,
  },
});

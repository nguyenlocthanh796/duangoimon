import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { PressableScale } from '../ui/PressableScale';
import { useStoreSettings } from '../../store/usePOSStore';

export interface MobileCartBarProps {
  totalQty: number;
  totalAmount: number;
  tableName?: string;
  bottomOffset?: number;
  onOpenCart: () => void;
  onFastPay: () => void;
  onSendToKitchen?: () => void;
}

export const MobileCartBar: React.FC<MobileCartBarProps> = ({
  totalQty,
  totalAmount,
  tableName = 'Bàn 01',
  bottomOffset,
  onOpenCart,
  onFastPay,
  onSendToKitchen,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const storeSettings = useStoreSettings();
  const enableKds = storeSettings?.enableKds ?? true;

  if (totalQty <= 0) return null;

  const actualBottom =
    bottomOffset !== undefined
      ? bottomOffset
      : insets.bottom > 0
      ? Math.max(8, insets.bottom - 12)
      : 10;

  return (
    <View
      style={[
        s.wrapper,
        {
          bottom: actualBottom,
        },
      ]}
    >
      <View
        style={[
          s.islandCard,
          {
            backgroundColor: theme.surface.glassDock || (isDark ? 'rgba(20, 30, 48, 0.92)' : 'rgba(15, 23, 42, 0.94)'),
            borderColor: theme.border.glassBorder || 'rgba(255, 255, 255, 0.15)',
            borderWidth: StyleSheet.hairlineWidth,
            shadowColor: theme.surface.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
          },
        ]}
      >
        {/* Left Interactive Section: Cart Info */}
        <PressableScale
          activeScale={0.98}
          haptic="tick"
          playSound
          accessibilityRole="button"
          accessibilityLabel={`Xem giỏ hàng ${tableName}, ${totalQty} món, tổng tiền ${totalAmount.toLocaleString('vi-VN')} đồng`}
          onPress={onOpenCart}
          containerStyle={{ flex: 1 }}
          style={s.cartInfoSection}
        >
          <View style={[s.iconSquircle, { backgroundColor: theme.brand.primary }]}>
            <Icon name="shopping" size={20} color={theme.text.onBrand} />
            <View style={[s.qtyBadge, { backgroundColor: theme.brand.danger, borderColor: isDark ? theme.surface.card : theme.text.primary }]}>
              <AppText variant="xs" weight="medium" color={theme.text.onBrand} tabularNums>
                {totalQty}
              </AppText>
            </View>
          </View>

          <View style={{ marginLeft: 10, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                {tableName}
              </AppText>
              <Icon name="chevron-up" size={14} color={theme.text.muted} />
            </View>
            <AppText variant="md" weight="medium" color={theme.text.onBrand} tabularNums style={{ marginTop: 1 }}>
              {totalAmount.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
        </PressableScale>

        {/* Right CTA Button Group: Dual Action [BÁO BẾP] & [TÍNH TIỀN] */}
        <View style={s.actionsGroup}>
          {onSendToKitchen && (
            <PressableScale
              activeScale={0.95}
              haptic="step"
              playSound
              accessibilityRole="button"
              accessibilityLabel={enableKds ? 'Báo bếp đơn hàng' : 'Lưu đơn vào bàn'}
              onPress={onSendToKitchen}
              style={[
                s.kitchenButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.15)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)',
                },
              ]}
            >
              <Icon name={enableKds ? 'pot-steam' : 'table-chair'} size={18} color={theme.text.onBrand} />
              <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                {enableKds ? 'BÁO BẾP' : 'LƯU BÀN'}
              </AppText>
            </PressableScale>
          )}

          <PressableScale
            activeScale={0.95}
            haptic="step"
            playSound
            accessibilityRole="button"
            accessibilityLabel="Tính tiền và thanh toán"
            onPress={onFastPay}
            style={[
              s.payButton,
              {
                backgroundColor: theme.brand.accent,
              },
            ]}
          >
            <Icon name="cash-check" size={19} color={theme.text.onBrand} />
            <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
              TÍNH TIỀN
            </AppText>
          </PressableScale>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9998,
  },
  islandCard: {
    height: 64,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartInfoSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  iconSquircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  qtyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kitchenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
});

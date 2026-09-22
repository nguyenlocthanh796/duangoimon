import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { playTapSound } from '../../utils/sound';
import { useInventoryBOMStore } from '../../store/useInventoryBOMStore';

export interface StockAlertBannerProps {
  onPressDetails?: () => void;
}

export const StockAlertBanner: React.FC<StockAlertBannerProps> = ({
  onPressDetails,
}) => {
  const { theme, isDark } = useTheme();
  const lowStockIngredients = useInventoryBOMStore((s) => s.getLowStockIngredients)();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (isDismissed || lowStockIngredients.length === 0) {
    return null;
  }

  const handleDismiss = () => {
    playTapSound();
    setIsDismissed(true);
  };

  const handleToggleExpand = () => {
    playTapSound();
    setIsExpanded(!isExpanded);
  };

  const firstItem = lowStockIngredients[0];

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: theme.status.warningBg,
          borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : theme.brand.warning,
        },
      ]}
    >
      <View style={s.headerRow}>
        <View style={s.iconWrapper}>
          <Icon name="alert-outline" size={18} color={theme.brand.warning} />
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Chi tiết cảnh báo tồn kho"
          activeOpacity={0.8}
          onPress={handleToggleExpand}
          style={s.textWrapper}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="xs" weight="bold" color={theme.brand.accent}>
              CẢNH BÁO TỒN KHO ({lowStockIngredients.length})
            </AppText>
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={theme.brand.accent}
            />
          </View>
          <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
            {firstItem.name}: còn {firstItem.currentStock} {firstItem.unit} (ngưỡng: {firstItem.minStock} {firstItem.unit})
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Đóng cảnh báo tồn kho"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          onPress={handleDismiss}
          style={s.dismissBtn}
        >
          <Icon name="close" size={16} color={theme.brand.accent} />
        </TouchableOpacity>
      </View>

      {/* Expanded item list */}
      {isExpanded && (
        <View style={s.expandedList}>
          {lowStockIngredients.map((item) => (
            <View key={item.id} style={s.itemRow}>
              <AppText variant="xs" color={theme.text.primary} style={{ flex: 1 }}>
                • {item.name}
              </AppText>
              <AppText variant="xs" weight="medium" tabularNums color={theme.brand.accent}>
                {item.currentStock} / {item.minStock} {item.unit}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
    gap: 2,
  },
  dismissBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(217, 119, 6, 0.2)',
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
});

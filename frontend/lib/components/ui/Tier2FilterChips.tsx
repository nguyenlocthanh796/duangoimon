import React, { memo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from './AppText';
import { playTapSound } from '../../utils/sound';

export interface Tier2ChipItem<T extends string = string> {
  id: T;
  label: string;
  count?: number | string;
  icon?: string;
}

export interface Tier2FilterChipsProps<T extends string = string> {
  chips: (Tier2ChipItem<T> | string)[];
  activeChip: T;
  onChipChange: (chipId: T) => void;
  activeColor?: 'accent' | 'primary' | string;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  counts?: Record<string, number | string>;
  testID?: string;
}

/**
 * 👑 Tier2FilterChips - Thanh Lọc Cấp 2 Capsule Pills Chuẩn AGENTS.md
 * - Chiều cao chuẩn 36-40px, dính liền dưới Tier1Tabs hoặc Header.
 * - Nền hòa 100% cùng màu canvas danh sách bên dưới (theme.surface.card).
 * - Hairline border dưới (borderBottomWidth: hairlineWidth).
 * - Active fill: theme.brand.accent hoặc theme.brand.primary chữ trắng.
 * - Vùng chạm mở rộng hitSlop >= 44pt chuẩn Apple HIG.
 * - Tự động hiển thị count badge tabularNums và icon.
 * - Tích hợp sẵn âm thanh playTapSound() và rung phản hồi Haptics.
 */
function Tier2FilterChipsComponent<T extends string = string>({
  chips,
  activeChip,
  onChipChange,
  activeColor = 'accent',
  style,
  containerStyle,
  contentContainerStyle,
  counts,
  testID,
}: Tier2FilterChipsProps<T>) {
  const { theme } = useTheme();

  const handleSelect = useCallback(
    (id: T) => {
      playTapSound();
      onChipChange(id);
    },
    [onChipChange]
  );

  const getActiveBg = () => {
    if (activeColor === 'accent') return theme.brand.accent;
    if (activeColor === 'primary') return theme.brand.primary;
    return activeColor;
  };

  const activeBg = getActiveBg();

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: theme.surface.card,
          borderBottomColor: theme.border.subtle,
        },
        containerStyle,
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, contentContainerStyle, style]}
      >
        {(chips || []).map((item) => {
          const chip: Tier2ChipItem<T> =
            typeof item === 'string'
              ? { id: item as T, label: item }
              : item;

          const isActive = chip.id === activeChip;
          const countVal =
            chip.count !== undefined
              ? chip.count
              : counts && counts[chip.id] !== undefined
              ? counts[chip.id]
              : undefined;

          return (
            <TouchableOpacity
              key={chip.id}
              activeOpacity={0.7}
              delayPressIn={0}
              accessible={true}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${chip.label}${countVal !== undefined ? `, ${countVal}` : ''}`}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              onPress={() => handleSelect(chip.id)}
              style={[
                styles.chipPill,
                {
                  backgroundColor: isActive ? activeBg : (theme.isDark ? theme.surface.header : '#F5F2EC'),
                  borderColor: isActive ? activeBg : (theme.isDark ? theme.border.subtle : '#EBE6DE'),
                },
              ]}
            >
              {chip.icon && (
                <Icon
                  name={chip.icon as any}
                  size={16}
                  color={isActive ? theme.text.onBrand : theme.text.muted}
                  style={styles.chipIcon}
                />
              )}
              <AppText
                variant="sm"
                weight={isActive ? 'bold' : 'medium'}
                color={isActive ? theme.text.onBrand : theme.text.primary}
                numberOfLines={1}
                tabularNums
              >
                {countVal !== undefined ? `${chip.label} (${countVal})` : chip.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const Tier2FilterChips = memo(Tier2FilterChipsComponent) as typeof Tier2FilterChipsComponent;

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipPill: {
    height: 36,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipIcon: {
    marginRight: 6,
  },
});

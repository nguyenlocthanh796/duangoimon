import React, { memo } from 'react';
import {
  View,
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

export type NumpadLayoutMode = 'cash' | 'crm' | 'pin' | '4x4' | 'custom';

export const CASH_NUMPAD_LAYOUT: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['000', '0', '⌫'],
];

export const CRM_NUMPAD_LAYOUT: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', '⌫'],
];

export const PIN_NUMPAD_LAYOUT: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', '⌫'],
];

export const POS_4X4_NUMPAD_LAYOUT: string[][] = [
  ['7', '8', '9', '⌫'],
  ['4', '5', '6', 'C'],
  ['1', '2', '3', '000'],
  ['0', '00', '.', 'OK'],
];

export interface AppNumpadProps {
  onKeyPress: (key: string) => void;
  value?: string;
  showDisplay?: boolean;
  displayLabel?: string;
  displaySuffix?: string;
  layout?: NumpadLayoutMode;
  customKeys?: string[][];
  keyHeight?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  keyStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * 👑 AppNumpad - Bàn Phím Số Cảm Ứng POS Chuẩn AGENTS.md
 * - Bố cục 3x4 / 4x4 tiêu chuẩn F&B: Thu ngân (000, 0, ⌫), CRM/SĐT (C, 0, ⌫), PIN (C, 0, ⌫), POS 4x4.
 * - Vùng chạm cảm ứng lớn >= 52pt chuẩn công thái học F&B cảm ứng nhanh.
 * - Màn hình hiển thị số chuẩn variant="display" 28px tabularNums.
 * - Tích hợp sẵn âm thanh playTapSound() và rung phản hồi Haptics 100%.
 */
function AppNumpadComponent({
  onKeyPress,
  value,
  showDisplay = false,
  displayLabel,
  displaySuffix,
  layout = 'cash',
  customKeys,
  keyHeight = 52,
  disabled = false,
  style,
  keyStyle,
  testID,
}: AppNumpadProps) {
  const { theme } = useTheme();

  const activeLayout =
    customKeys ||
    (layout === 'crm'
      ? CRM_NUMPAD_LAYOUT
      : layout === 'pin'
      ? PIN_NUMPAD_LAYOUT
      : layout === '4x4'
      ? POS_4X4_NUMPAD_LAYOUT
      : CASH_NUMPAD_LAYOUT);

  const handlePress = (key: string) => {
    if (disabled) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    onKeyPress(key);
  };

  const renderKeyContent = (key: string) => {
    if (key === '⌫' || key === 'backspace' || key === 'DEL') {
      return <Icon name="backspace-outline" size={24} color={theme.text.primary} />;
    }
    if (key === 'C' || key === 'clear') {
      return (
        <AppText variant="md" weight="bold" color={theme.brand.danger}>
          Xóa
        </AppText>
      );
    }
    if (key === 'OK' || key === 'ok') {
      return (
        <AppText variant="md" weight="bold" color={theme.brand.accent}>
          OK
        </AppText>
      );
    }
    if (key === '00' || key === '000') {
      return (
        <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
          {key}
        </AppText>
      );
    }
    if (key === '.') {
      return (
        <AppText variant="xl" weight="bold" color={theme.text.primary}>
          .
        </AppText>
      );
    }
    return (
      <AppText variant="xl" weight="medium" color={theme.text.primary} tabularNums>
        {key}
      </AppText>
    );
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Optional Display Strip */}
      {showDisplay && (
        <View
          style={[
            styles.displayBox,
            {
              backgroundColor: theme.surface.header,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          {displayLabel ? (
            <AppText variant="xs" color={theme.text.muted} style={{ marginBottom: 4 }}>
              {displayLabel}
            </AppText>
          ) : null}

          <View style={styles.displayRow}>
            <AppText
              variant="display"
              weight="bold"
              color={theme.text.primary}
              tabularNums
              numberOfLines={1}
            >
              {value || '0'}
            </AppText>

            {displaySuffix ? (
              <AppText
                variant="md"
                weight="bold"
                color={theme.brand.accent}
                style={{ marginLeft: 6, marginBottom: 4 }}
              >
                {displaySuffix}
              </AppText>
            ) : null}
          </View>
        </View>
      )}

      {/* Grid Rows */}
      <View style={styles.grid}>
        {activeLayout.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((key) => {
              const isSpecial =
                key === '⌫' ||
                key === 'backspace' ||
                key === 'DEL' ||
                key === 'C' ||
                key === 'clear' ||
                key === 'OK' ||
                key === 'ok';

              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.65}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Phím số ${key}`}
                  disabled={disabled}
                  onPress={() => handlePress(key)}
                  style={[
                    styles.key,
                    {
                      height: keyHeight,
                      minHeight: keyHeight,
                      backgroundColor: isSpecial
                        ? theme.surface.header
                        : theme.surface.card,
                      borderColor: theme.border.subtle,
                      opacity: disabled ? 0.45 : 1,
                    },
                    keyStyle,
                  ]}
                >
                  {renderKeyContent(key)}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export const AppNumpad = memo(AppNumpadComponent);

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  displayBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

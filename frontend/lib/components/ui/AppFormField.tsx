import React, { memo, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from './AppText';
import { playTapSound } from '../../utils/sound';
import { formatCurrency, parseCurrency } from '../../utils/format';

export interface AppFormFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  rightLabel?: string | React.ReactNode;
  icon?: string;
  iconColor?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  isCurrency?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * 👑 AppFormField - Trường Form Nhập Liệu Chuẩn Hóa AGENTS.md
 * - Nhãn tiêu đề: <AppText variant="md" weight="bold">
 * - TextInput: fontSize >= 16px (chống auto-zoom iOS WebKit), includeFontPadding: false (Android).
 * - Hỗ trợ Icon đầu vào, nút Clear 1-chạm, tiền tệ VND tự động format.
 * - Dòng báo lỗi chuẩn variant="xs" màu theme.brand.danger.
 * - Phản hồi màu viền focus chuẩn theme.brand.accent / theme.border.subtle.
 */
function AppFormFieldComponent({
  label,
  required,
  error,
  helperText,
  rightLabel,
  icon,
  iconColor,
  prefix,
  suffix,
  clearable = false,
  onClear,
  isCurrency = false,
  containerStyle,
  inputContainerStyle,
  inputStyle,
  value,
  onChangeText,
  placeholderTextColor,
  testID,
  ...restProps
}: AppFormFieldProps) {
  const { theme, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    if (onClear) {
      onClear();
    } else if (onChangeText) {
      onChangeText('');
    }
  }, [onClear, onChangeText]);

  const rawNum = isCurrency && value ? parseCurrency(value) : 0;

  return (
    <View style={[styles.fieldWrapper, containerStyle]} testID={testID}>
      {/* Label & Right Auxiliary */}
      {(label || rightLabel) && (
        <View style={styles.labelRow}>
          {label ? (
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              {label}{' '}
              {required && (
                <AppText variant="md" weight="bold" color={theme.brand.danger}>
                  *
                </AppText>
              )}
            </AppText>
          ) : <View />}

          {rightLabel ? (
            typeof rightLabel === 'string' ? (
              <AppText variant="xs" color={theme.text.muted}>
                {rightLabel}
              </AppText>
            ) : (
              rightLabel
            )
          ) : isCurrency && rawNum > 0 ? (
            <AppText variant="sm" weight="bold" color={theme.brand.accent} tabularNums>
              {formatCurrency(rawNum)} đ
            </AppText>
          ) : null}
        </View>
      )}

      {/* Input Box */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? theme.surface.header : theme.surface.app,
            borderColor: error
              ? theme.brand.danger
              : isFocused
              ? theme.brand.accent
              : theme.border.subtle,
          },
          inputContainerStyle,
        ]}
      >
        {prefix}

        {icon && (
          <Icon
            name={icon as any}
            size={20}
            color={
              error
                ? theme.brand.danger
                : isFocused
                ? theme.brand.accent
                : iconColor || theme.text.muted
            }
            style={styles.prefixIcon}
          />
        )}

        <TextInput
          value={value !== undefined && value !== null ? String(value) : undefined}
          onChangeText={onChangeText}
          onFocus={(e) => {
            setIsFocused(true);
            restProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            restProps.onBlur?.(e);
          }}
          placeholderTextColor={placeholderTextColor || theme.text.muted}
          style={[
            styles.input,
            {
              color: theme.text.primary,
              // Quy chuẩn: fontSize >= 16px chống auto-zoom Safari/WebKit iOS
              fontSize: 16,
              // Quy chuẩn: includeFontPadding: false trên Android
              includeFontPadding: false,
            },
            inputStyle,
          ]}
          {...restProps}
        />

        {clearable && Boolean(value && value.length > 0) && (
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Xóa nội dung nhập"
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.clearBtn}
          >
            <Icon name="close-circle" size={18} color={theme.text.muted} />
          </TouchableOpacity>
        )}

        {suffix}
      </View>

      {/* Error Row */}
      {error ? (
        <View style={styles.feedbackRow}>
          <Icon
            name="alert-circle-outline"
            size={14}
            color={theme.brand.danger}
            style={{ marginRight: 4 }}
          />
          <AppText variant="xs" color={theme.brand.danger}>
            {error}
          </AppText>
        </View>
      ) : helperText ? (
        <View style={styles.feedbackRow}>
          <AppText variant="xs" color={theme.text.muted}>
            {helperText}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export const AppFormField = memo(AppFormFieldComponent);

const styles = StyleSheet.create({
  fieldWrapper: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputContainer: {
    minHeight: 46,
    height: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  prefixIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: Platform.OS === 'android' ? 0 : 4,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
});

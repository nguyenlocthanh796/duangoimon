import React from 'react';
import { StyleSheet, ViewStyle, StyleProp, GestureResponderEvent, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme';
import { AppText, AppTextVariant } from './AppText';
import { PressableScale, PressableScaleProps } from './PressableScale';

export interface ButtonProps extends Omit<PressableScaleProps, 'style'> {
  title: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'success' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  leadingIcon?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'default',
  size = 'md',
  leadingIcon,
  fullWidth,
  loading = false,
  style,
  disabled,
  onPress,
  ...rest
}) => {
  const { theme } = useTheme();

  let height = 48;
  let textVariant: AppTextVariant = 'sm';
  if (size === 'sm') {
    height = 40;
    textVariant = 'xs';
  } else if (size === 'lg') {
    height = 56;
    textVariant = 'md';
  }

  let backgroundColor = theme.brand.primary;
  let textColor = theme.text.onBrand;
  let borderWidth = 0;
  let borderColor = 'transparent';

  if (variant === 'accent') {
    backgroundColor = theme.brand.accent;
    textColor = theme.text.onBrand;
  } else if (variant === 'secondary') {
    backgroundColor = theme.surface.header;
    textColor = theme.text.primary;
  } else if (variant === 'outline') {
    backgroundColor = 'transparent';
    textColor = theme.text.primary;
    borderWidth = StyleSheet.hairlineWidth;
    borderColor = theme.border.default;
  } else if (variant === 'destructive') {
    backgroundColor = theme.brand.danger;
    textColor = theme.text.onBrand;
  } else if (variant === 'ghost') {
    backgroundColor = 'transparent';
    textColor = theme.text.primary;
  } else if (variant === 'success') {
    backgroundColor = theme.brand.success;
    textColor = theme.text.onBrand;
  }

  const isButtonDisabled = disabled || loading;

  if (isButtonDisabled) {
    backgroundColor = theme.surface.header;
    textColor = theme.text.muted;
  }

  return (
    <PressableScale
      disabled={isButtonDisabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel || title}
      hitSlop={rest.hitSlop || (size === 'sm' ? { top: 4, bottom: 4, left: 4, right: 4 } : undefined)}
      haptic={variant === 'destructive' ? 'warn' : 'step'}
      playSound
      activeScale={0.96}
      style={[
        {
          height,
          backgroundColor,
          borderRadius: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderWidth,
          borderColor,
          ...(fullWidth ? { width: '100%' } : {}),
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        leadingIcon
      )}
      <AppText variant={textVariant} weight="bold" color={textColor}>
        {title}
      </AppText>
    </PressableScale>
  );
};


import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme';
import { haptic } from '../../haptic';

interface PillButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: any;
  textStyle?: any;
}

export default function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
}: PillButtonProps) {
  const [hovered, setHovered] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          button: { backgroundColor: colors.brand.primary },
          hover: { backgroundColor: colors.brand.primaryHover },
          text: { color: colors.text.inverse },
          icon: colors.text.inverse,
        };
      case 'secondary':
        return {
          button: { backgroundColor: colors.surface.disabled },
          hover: { backgroundColor: colors.border.default },
          text: { color: colors.text.primary },
          icon: colors.text.primary,
        };
      case 'ghost':
        return {
          button: { backgroundColor: 'transparent' },
          hover: { backgroundColor: colors.surface.disabled },
          text: { color: colors.brand.primary },
          icon: colors.brand.primary,
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        vStyles.button,
        hovered && !disabled && vStyles.hover,
        disabled && styles.disabled,
        style,
      ]}
      onPress={() => {
        haptic.impact('light');
        onPress();
      }}
      delayPressIn={0}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...(Platform.OS === 'web'
        ? { onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false) }
        : {})}
    >
      {loading ? (
        <ActivityIndicator color={vStyles.icon} />
      ) : (
        <>
          {icon && <Icon name={icon as any} size={18} color={vStyles.icon} />}
          <Text style={[styles.baseText, vStyles.text, textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 44,
    // The user requested less rounded buttons
    borderRadius: 8,
  },
  baseText: {
    ...font.mdBold,
  },
  disabled: {
    opacity: 0.5,
  },
});

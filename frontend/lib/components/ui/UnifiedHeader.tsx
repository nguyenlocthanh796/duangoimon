import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import { useResponsive } from '../../hooks/useResponsive';

export interface UnifiedHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  backLabel?: string;
  compact?: boolean;
  right?: React.ReactNode;
  hideMenu?: boolean; // hide menu btn when persistent sidebar visible
}

/**
 * Unified flat orange header — không gradient, flat design.
 * - iPhone: có menu button, smaller padding
 * - iPad: hide menu button nếu hideMenu=true (sidebar đã có)
 * - Orange accent bottom border thay vì gradient
 */
export default function UnifiedHeader({
  title,
  subtitle,
  icon,
  onMenuPress,
  onBackPress,
  backLabel,
  compact = false,
  right,
  hideMenu = false,
}: UnifiedHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isWide } = useResponsive();

  const showLeftButton = (onMenuPress || onBackPress) && !hideMenu;

  return (
    <View
      style={[
        styles.header,
        compact ? styles.headerCompact : styles.headerDefault,
        {
          paddingTop: insets.top,
          height: insets.top + (isWide ? 56 : 52),
          paddingHorizontal: isWide ? shape.spacing.xl : shape.spacing.md,
          justifyContent: 'center',
        },
      ]}
    >
      <View style={styles.row}>
        {/* Left: back / menu button */}
        {showLeftButton && !hideMenu && (
          onBackPress ? (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.menuBtn}
              accessibilityLabel={backLabel || 'Quay lại'}
            >
              <Icon name="arrow-left" size={20} color={colors.brand.primary} />
            </TouchableOpacity>
          ) : onMenuPress ? (
            <TouchableOpacity
              onPress={onMenuPress}
              style={[styles.menuBtn, !isWide && { marginLeft: -8 }]}
              accessibilityLabel="Mở menu"
            >
              <Icon name="menu" size={24} color={colors.brand.primary} />
            </TouchableOpacity>
          ) : null
        )}

        {/* Icon */}
        {icon && (
          <View style={styles.iconWrap}>
            <Icon name={icon as any} size={20} color={colors.brand.primary} />
          </View>
        )}

        {/* Title */}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>

        {/* Right actions */}
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: shape.spacing.lg,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerDefault: {},
  headerCompact: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: shape.spacing.sm,
  },
  menuBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primaryBg,
  },
  title: {
    ...font.sectionTitle,
    color: colors.text.primary,
    fontWeight: '600',
  },
  subtitle: {
    ...font.caption,
    color: colors.text.muted,
    marginTop: 1,
  },
});

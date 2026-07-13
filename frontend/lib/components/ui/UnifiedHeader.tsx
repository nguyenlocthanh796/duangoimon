import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';

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

  const showLeftButton = (onMenuPress || onBackPress) && !hideMenu;

  return (
    <View
      style={[
        styles.header,
        compact ? styles.headerCompact : styles.headerDefault,
        {
          paddingTop: compact ? 8 + insets.top : insets.top + 10,
          paddingBottom: compact ? 8 : 12,
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
              style={styles.menuBtn}
              accessibilityLabel="Mở menu"
            >
              <View style={styles.iconWrap}>
                <Icon name="menu" size={20} color={colors.brand.primary} />
              </View>
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
    paddingHorizontal: 16,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerDefault: {},
  headerCompact: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.disabled,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primaryBg,
  },
  title: {
    ...font.h3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  subtitle: {
    ...font.caption,
    color: colors.text.muted,
    marginTop: 1,
  },
});

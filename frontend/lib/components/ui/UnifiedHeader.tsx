import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import { useResponsive } from '../../hooks/useResponsive';
import { haptic } from '../../haptic';

export interface UnifiedHeaderProps {
  title?: string;
  subtitle?: string;
  icon?: string;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  backLabel?: string;
  compact?: boolean;
  right?: React.ReactNode;
  hideMenu?: boolean; // hide menu btn when persistent sidebar visible
  animated?: boolean;
  titleComponent?: React.ReactNode;
  backIcon?: string;
  noTopInset?: boolean;
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
  animated = false,
  titleComponent,
  backIcon = 'arrow-left',
  noTopInset = false,
}: UnifiedHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isWide } = useResponsive();

  const showLeftButton = (onMenuPress || onBackPress) && !hideMenu;

  const fadeAnim = React.useRef(new Animated.Value(animated ? 0 : 1)).current;
  const slideAnim = React.useRef(new Animated.Value(animated ? -10 : 0)).current;

  React.useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [animated, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.header,
        compact ? styles.headerCompact : styles.headerDefault,
        {
          paddingTop: noTopInset ? 44 : (isWide ? 10 : Math.max(insets.top + 4, 16)),
          paddingBottom: noTopInset ? 12 : (isWide ? 10 : 8),
          paddingHorizontal: isWide ? shape.spacing.xl : 12,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.row, { height: isWide ? shape.header.heightTablet : 44 }]}>
        {/* Left: back / menu button */}
        {showLeftButton && !hideMenu && (
          onBackPress ? (
            <TouchableOpacity
              onPress={() => {
                haptic.impact('light');
                onBackPress();
              }}
              delayPressIn={0}
              activeOpacity={0.6}
              style={[styles.menuBtn, !isWide && styles.menuBtnMobile]}
              accessibilityLabel={backLabel || 'Quay lại'}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Icon name={backIcon as any} size={isWide ? 20 : 18} color={colors.brand.primary} />
            </TouchableOpacity>
          ) : onMenuPress ? (
            <TouchableOpacity
              onPress={() => {
                haptic.impact('light');
                onMenuPress();
              }}
              delayPressIn={0}
              activeOpacity={0.6}
              style={[styles.menuBtn, !isWide && styles.menuBtnMobile]}
              accessibilityLabel="Mở menu"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Icon name="menu" size={isWide ? 24 : 22} color={colors.brand.primary} />
            </TouchableOpacity>
          ) : null
        )}

        {/* Icon */}
        {icon && (
          <View style={[styles.iconWrap, !isWide && styles.iconWrapMobile]}>
            <Icon name={icon as any} size={isWide ? 20 : 18} color={colors.brand.primary} />
          </View>
        )}

        {/* Title */}
        <View style={{ flex: 1 }}>
          {titleComponent ? (
            titleComponent
          ) : (
            <>
              <Text style={[styles.title, !isWide && styles.titleMobile]} numberOfLines={1}>{title}</Text>
              {subtitle && <Text style={[styles.subtitle, !isWide && styles.subtitleMobile]} numberOfLines={1}>{subtitle}</Text>}
            </>
          )}
        </View>

        {/* Right actions */}
        {right}
      </View>
    </Animated.View>
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
  menuBtnMobile: {
    width: 44,
    height: 44,
    marginLeft: -4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primaryBg,
    borderRadius: shape.radius.sm,
  },
  iconWrapMobile: {
    width: 44,
    height: 44,
  },
  title: {
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  titleMobile: {
    fontSize: 18,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: 'BeVietnamPro_400Regular_Italic',
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.text.muted,
    marginTop: 1,
  },
  subtitleMobile: {
    fontSize: 12,
    lineHeight: 16,
  },
});

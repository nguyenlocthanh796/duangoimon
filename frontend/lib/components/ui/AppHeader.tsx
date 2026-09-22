import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme } from '../../theme';
import { AppText } from './AppText';
import { playTapSound } from '../../utils/sound';
import { useUIStore } from '../../store/useUIStore';

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  subtitleNode?: React.ReactNode;
  onTitlePress?: () => void;
  titleRightIcon?: keyof typeof Icon.glyphMap;
  onOpenSidebar?: () => void;
  showHamburger?: boolean;
  showBack?: boolean;
  hideBackOnWide?: boolean;
  onBack?: () => void;
  leftCustom?: React.ReactNode;
  centerCustom?: React.ReactNode;
  rightCustom?: React.ReactNode;
  showSearch?: boolean;
  onOpenSearch?: () => void;
  onSave?: () => void;
  saveLabel?: string;
  isSaving?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  subtitleNode,
  onTitlePress,
  titleRightIcon,
  onOpenSidebar,
  showHamburger,
  showBack = false,
  hideBackOnWide = false,
  onBack,
  leftCustom,
  centerCustom,
  rightCustom,
  showSearch = false,
  onOpenSearch,
  onSave,
  saveLabel = 'Lưu',
  isSaving = false,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isWide } = useResponsive();

  const handleBack = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    if (onBack) onBack();
    else router.back();
  };

  const handleSidebar = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    if (onOpenSidebar) {
      onOpenSidebar();
    } else {
      useUIStore.getState().openSidebar();
    }
  };

  const handleSave = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    if (onSave) onSave();
  };

  const handleOpenSearch = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    if (onOpenSearch) onOpenSearch();
  };

  const handleTitlePress = () => {
    if (!onTitlePress) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onTitlePress();
  };

  const canShowHamburger =
    !isWide &&
    !showBack &&
    (showHamburger !== undefined ? showHamburger : (!!onOpenSidebar || !leftCustom));

  // Safe area standard inset: Bảo vệ chuẩn 100% vùng tai thỏ / Dynamic Island / Notch
  const effectiveTopInset = insets.top;

  return (
    <View
      accessibilityRole="header"
      style={[
        s.container,
        {
          backgroundColor: theme.surface.glassHeader,
          borderBottomColor: theme.border.glassBorder,
          borderBottomWidth: StyleSheet.hairlineWidth,
          paddingTop: effectiveTopInset,
          paddingLeft: Math.max(insets.left, 12),
          paddingRight: Math.max(insets.right, 12),
          ...(Platform.OS === 'web'
            ? ({
                boxShadow: theme.isDark ? '0 4px 20px rgba(0, 0, 0, 0.35)' : '0 2px 8px rgba(15, 23, 42, 0.04)',
              } as any)
            : Platform.OS === 'ios'
            ? {
                shadowColor: theme.surface.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: theme.isDark ? 0.08 : 0.04,
                shadowRadius: 3,
              }
            : { elevation: 1 }),
        },
      ]}
    >
      <View style={[s.contentRow, { height: isWide ? 56 : 50 }]}>
        {/* LEFT SECTION: Hamburger Sidebar Button OR Back Button OR Custom */}
        <View style={s.leftSection}>
          {canShowHamburger && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSidebar}
              accessibilityRole="button"
              accessibilityLabel="Mở menu điều hướng"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[s.iconBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
            >
              <Icon name="menu" size={22} color={theme.text.primary} />
            </TouchableOpacity>
          )}

          {showBack && !(hideBackOnWide && isWide) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[s.iconBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
            >
              <Icon name="arrow-left" size={22} color={theme.text.primary} />
            </TouchableOpacity>
          )}

          {leftCustom ? (
            leftCustom
          ) : title ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleTitlePress}
              disabled={!onTitlePress}
              accessibilityRole={onTitlePress ? 'button' : undefined}
              accessibilityLabel={title ? `${title}${subtitle ? `, ${subtitle}` : ''}` : undefined}
              style={s.titleBox}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AppText variant="lg" weight="bold" color={theme.text.primary} numberOfLines={1}>
                  {title}
                </AppText>
                {titleRightIcon && (
                  <Icon name={titleRightIcon} size={16} color={theme.text.muted} />
                )}
              </View>
              {subtitleNode ? (
                subtitleNode
              ) : subtitle ? (
                <AppText variant="xs" weight="normal" color={theme.text.muted} numberOfLines={1}>
                  {subtitle}
                </AppText>
              ) : null}
            </TouchableOpacity>
          ) : null}
        </View>

        {/* CENTER SECTION: Custom Component (e.g. KDS Clock or Search) */}
        {centerCustom && (
          <View style={s.centerSection}>
            {centerCustom}
          </View>
        )}

        {/* RIGHT SECTION: Search Button OR Custom Actions OR Standard Save Button */}
        <View style={s.rightSection}>
          {(showSearch || onOpenSearch) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenSearch}
              accessibilityRole="button"
              accessibilityLabel="Tìm kiếm nhanh"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[s.iconBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
            >
              <Icon name="magnify" size={20} color={theme.text.primary} />
            </TouchableOpacity>
          )}
          {rightCustom}
          {!rightCustom && onSave && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleSave}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel={saveLabel}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              style={[
                s.saveBtn,
                {
                  backgroundColor: theme.brand.primary,
                  opacity: isSaving ? 0.7 : 1,
                },
              ]}
            >
              <Icon name="check" size={18} color={theme.text.onBrand} />
              <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
                {saveLabel}
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: Platform.OS === 'web' ? 100 : undefined,
  },
  contentRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titleBox: {
    marginLeft: 4,
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    justifyContent: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  saveBtn: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


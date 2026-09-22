import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { AppText } from '../../../lib/components/ui';
import { playTapSound } from '../../../lib/utils/sound';

interface BaristaAppHeaderProps {
  title?: string;
  subtitle?: string;
  activeTimersCount?: number;
  onOpenAddModal: () => void;
}

export function BaristaAppHeader({
  title = 'Barista SOP',
  subtitle,
  activeTimersCount = 0,
  onOpenAddModal,
}: BaristaAppHeaderProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: isDark ? '#14110E' : '#FFFFFF',
          borderBottomColor: theme.border.subtle,
          paddingTop: insets.top > 0 ? insets.top : 8,
        },
      ]}
    >
      {/* Left: Back to POS + Sub-App Brand */}
      <View style={s.leftSection}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            playTapSound();
            router.replace('/');
          }}
          style={[s.backPosBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
        >
          <Icon name="storefront-outline" size={16} color={theme.text.primary} />
          <AppText variant="xs" weight="bold" color={theme.text.primary}>
            Về POS
          </AppText>
        </TouchableOpacity>

        <View style={s.brandBadgeWrap}>
          <View style={[s.brandDot, { backgroundColor: theme.brand.accent }]} />
          <View>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="xxs" color={theme.text.muted}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>

      {/* Right: Active Timer Alert & Add Recipe Button */}
      <View style={s.rightSection}>
        {activeTimersCount > 0 && (
          <View style={[s.timerAlertBadge, { backgroundColor: theme.status.warningBg, borderColor: theme.brand.accent }]}>
            <Icon name="timer-sand" size={14} color={theme.brand.accent} />
            <AppText variant="xxs" weight="bold" color={theme.brand.accent} tabularNums>
              {activeTimersCount} Đang Ủ
            </AppText>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            playTapSound();
            onOpenAddModal();
          }}
          style={[s.addBtn, { backgroundColor: theme.brand.accent }]}
        >
          <Icon name="plus" size={16} color="#FFFFFF" />
          <AppText variant="xs" weight="bold" color="#FFFFFF">
            Thêm Món
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: Platform.OS === 'web' ? 100 : undefined,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backPosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  brandBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
});

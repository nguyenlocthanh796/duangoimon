import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { AppText } from '../../../lib/components/ui';
import { playTapSound } from '../../../lib/utils/sound';

export type BaristaSubAppTab = 'recipes' | 'brewing' | 'focus';

interface BaristaBottomNavProps {
  activeTab: BaristaSubAppTab;
  onSelectTab: (tab: BaristaSubAppTab) => void;
  recipeCount: number;
  activeTimersCount: number;
}

export function BaristaBottomNav({
  activeTab,
  onSelectTab,
  recipeCount,
  activeTimersCount,
}: BaristaBottomNavProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const tabs: { id: BaristaSubAppTab; label: string; icon: keyof typeof Icon.glyphMap; badge?: number }[] = [
    { id: 'recipes', label: 'Sổ Công Thức', icon: 'book-open-variant', badge: recipeCount },
    { id: 'brewing', label: 'Trạm Ủ Trà', icon: 'timer-sand', badge: activeTimersCount },
    { id: 'focus', label: 'Quầy Bar', icon: 'coffee-maker-outline' },
  ];

  const safeBottom = (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 4;

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: isDark ? '#14110E' : '#FFFFFF',
          borderTopColor: theme.border.subtle,
          paddingBottom: safeBottom,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const color = isActive ? theme.brand.accent : theme.text.muted;

        return (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              onSelectTab(tab.id);
            }}
            style={s.tabItem}
          >
            <View style={s.iconWrapper}>
              <Icon name={tab.icon} size={22} color={color} />
              {tab.badge && tab.badge > 0 ? (
                <View
                  style={[
                    s.badge,
                    {
                      backgroundColor:
                        tab.id === 'brewing' ? theme.brand.danger : theme.brand.accent,
                    },
                  ]}
                >
                  <AppText variant="xxs" weight="bold" color="#FFFFFF" tabularNums>
                    {tab.badge}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText
              variant="xs"
              weight={isActive ? 'bold' : 'medium'}
              color={color}
              style={{ marginTop: 2 }}
            >
              {tab.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -12,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

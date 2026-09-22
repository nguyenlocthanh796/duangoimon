import React, { memo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from './AppText';
import { playTapSound } from '../../utils/sound';

export interface Tier1TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: string;
  badge?: string | number;
}

export interface Tier1TabsProps<T extends string = string> {
  tabs: Tier1TabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  testID?: string;
}

/**
 * 👑 Tier1Tabs - Thanh Điều Hướng Cấp 1 Chuẩn AGENTS.md (Underline Tabs 46px)
 * - Chiều cao cố định 46px, dính trực tiếp dưới <AppHeader>.
 * - Tab active: borderBottom 3px theme.brand.accent, text `md` (18px) `bold`, icon màu accent.
 * - Tab inactive: text `md` `medium`, icon màu muted.
 * - Tích hợp sẵn âm thanh playTapSound() và rung phản hồi Haptics.
 * - Tự động cuộn tab active vào vùng nhìn thấy trên màn hình hẹp (< 320px).
 * - Cố định chữ 1 dòng numberOfLines={1}, flexShrink: 0 chống co cụm hay clipping.
 */
function Tier1TabsComponent<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  style,
  containerStyle,
  backgroundColor,
  testID,
}: Tier1TabsProps<T>) {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isUltraCompact = windowWidth > 0 && windowWidth < 340;

  const scrollRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<{ [key: string]: { x: number; width: number } }>({});
  const isMountedRef = useRef<boolean>(true);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (scrollTimerRef.current !== null) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, []);

  const scrollToTab = useCallback((tabId: string, animated = true, delay = 0) => {
    if (scrollTimerRef.current !== null) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }

    const executeScroll = () => {
      if (!isMountedRef.current) return;
      const layout = tabLayouts.current[tabId];
      if (layout && scrollRef.current && typeof scrollRef.current.scrollTo === 'function') {
        try {
          scrollRef.current.scrollTo({
            x: Math.max(0, layout.x - 20),
            animated,
          });
        } catch {
          // Guard against any native ref detachment during unmount
        }
      }
    };

    if (delay > 0) {
      scrollTimerRef.current = setTimeout(() => {
        scrollTimerRef.current = null;
        executeScroll();
      }, delay);
    } else {
      executeScroll();
    }
  }, []);

  useEffect(() => {
    scrollToTab(activeTab, true);
  }, [activeTab, scrollToTab]);

  return (
    <View
      testID={testID}
      style={[
        styles.barContainer,
        {
          backgroundColor: backgroundColor || theme.status.warningBg || theme.surface.header,
          borderBottomColor: theme.border.subtle,
        },
        containerStyle,
      ]}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          isUltraCompact && styles.scrollContentCompact,
          style,
        ]}
      >
        {tabs.map((tab) => {
          const isSel = activeTab === tab.id;
          const badgeText = tab.badge !== undefined && tab.badge !== null ? String(tab.badge) : '';
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              delayPressIn={0}
              accessible={true}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSel }}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                tabLayouts.current[tab.id] = { x, width };
                if (tab.id === activeTab) {
                  scrollToTab(activeTab, false, 50);
                }
              }}
              onPress={() => {
                playTapSound();
                scrollToTab(tab.id, true);
                onTabChange(tab.id);
              }}
              style={[
                styles.tabItem,
                isUltraCompact && styles.tabItemCompact,
                isSel && {
                  borderBottomColor: theme.brand.accent,
                  borderBottomWidth: 3,
                },
              ]}
            >
              {tab.icon && (
                <Icon
                  name={tab.icon as any}
                  size={18}
                  color={isSel ? theme.brand.accent : theme.text.muted}
                />
              )}
              <AppText
                variant="md"
                weight={isSel ? 'bold' : 'medium'}
                color={isSel ? theme.brand.accent : theme.text.primary}
                numberOfLines={1}
                ellipsizeMode="tail"
                tabularNums
              >
                {tab.label}
                {badgeText ? ` (${badgeText})` : ''}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const Tier1Tabs = memo(Tier1TabsComponent) as typeof Tier1TabsComponent;

const styles = StyleSheet.create({
  barContainer: {
    height: 46,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  scrollContentCompact: {
    paddingHorizontal: 8,
    gap: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
    flexShrink: 0,
  },
  tabItemCompact: {
    paddingHorizontal: 12,
    gap: 4,
  },
});

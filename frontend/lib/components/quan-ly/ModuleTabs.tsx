import React, { useRef, useState, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import AppText from '../ui/AppText';

export interface ModuleTab {
  id: string;
  name: string;
  icon: string;
}

interface ModuleTabsProps {
  tabs: ModuleTab[];
  activeTab: string;
  onSelectTab: (id: string) => void;
}

export default function ModuleTabs({ tabs, activeTab, onSelectTab }: ModuleTabsProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [, setIsScrollable] = useState(false);
  const [, setAtEnd] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const scrollable = contentSize.width > layoutMeasurement.width;
      const endReached = contentOffset.x + layoutMeasurement.width >= contentSize.width - 5;
      setIsScrollable(scrollable);
      setAtEnd(endReached);
      Animated.timing(fadeAnim, {
        toValue: !scrollable || endReached ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    },
    [fadeAnim]
  );

  return (
    <View style={styles.fbTabNavContainer}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              activeOpacity={0.7}
              style={styles.fbTabItem}
            >
              <View style={styles.fbTabInner}>
                <Icon
                  name={tab.icon as any}
                  size={18}
                  color={active ? colors.brand.primary : '#65676B'}
                />
                <AppText
                  variant="sm"
                  weight={active ? 'bold' : 'normal'}
                  color={active ? colors.brand.primary : '#65676B'}
                >
                  {tab.name}
                </AppText>
              </View>

              {/* Facebook Active Bottom Indicator Line */}
              {active && <View style={styles.fbActiveIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fbTabNavContainer: {
    backgroundColor: colors.surface.card,
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  scrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  fbTabItem: {
    position: 'relative',
    height: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fbTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fbActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: colors.brand.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});

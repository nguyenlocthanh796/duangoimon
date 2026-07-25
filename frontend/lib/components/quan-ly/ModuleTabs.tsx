import React, { useRef, useState, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { shape } from '../../theme/shape';
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
    <View
      style={{
        backgroundColor: colors.surface.card,
        flexGrow: 0,
        flexShrink: 0,
        paddingVertical: 4,
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 4,
          alignItems: 'center',
        }}
      >
        {tabs.map((tab, index) => {
          const active = activeTab === tab.id;
          const isLast = index === tabs.length - 1;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onSelectTab(tab.id)}
              style={{
                flexDirection: 'row',
                paddingHorizontal: 16,
                height: 36,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 999,
                marginRight: isLast ? 0 : 8,
                backgroundColor: active ? colors.brand.primaryBg : colors.surface.app,
                gap: 6,
              }}
            >
              <Icon
                name={tab.icon as any}
                size={16}
                color={active ? colors.brand.primary : colors.icon.muted}
              />
              <AppText
                variant="sm"
                weight={active ? 'bold' : 'normal'}
                color={active ? colors.brand.primary : colors.text.secondary}
              >
                {tab.name}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

import { useRef, useState, useCallback } from 'react';
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
  const [isScrollable, setIsScrollable] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
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
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
        flexGrow: 0,
        flexShrink: 0,
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 6,
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
                borderRadius: 8,
                marginRight: isLast ? 0 : 8,
                backgroundColor: active ? colors.brand.primary : colors.surface.card,
                borderWidth: 1,
                borderColor: active ? colors.brand.primary : colors.border.default,
                gap: 6,
              }}
            >
              <Icon
                name={tab.icon as any}
                size={16}
                color={active ? colors.text.inverse : colors.text.secondary}
              />
              <AppText
                variant="md"
                weight={active ? 'bold' : 'normal'}
                color={active ? colors.text.inverse : colors.text.secondary}
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

import { useRef, useState, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { font } from '../../theme/typography';
import { shape } from '../../theme/shape';
import { Category } from './types';

const CATEGORIES: Category[] = [
  { id: 'all', name: 'Tất cả', icon: 'restaurant-menu' },
  { id: 'sua-chua', name: 'Sữa chua', icon: 'local-drink' },
  { id: 'tra-chanh', name: 'Trà chanh', icon: 'local-cafe' },
  { id: 'do-an-vat', name: 'Đồ ăn vặt', icon: 'fastfood' },
  { id: 'che', name: 'Chè', icon: 'cake' },
  { id: 'tra-sua', name: 'Trà sữa', icon: 'local-cafe' },
  { id: 'soda', name: 'Soda', icon: 'local-bar' },
  { id: 'kem', name: 'Kem', icon: 'ac-unit' },
];

interface CategoryTabsProps {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  isWide: boolean;
}

export default function CategoryTabs({
  activeCategory,
  onSelectCategory,
  isWide,
}: CategoryTabsProps) {
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

  const scrollRight = () => {
    scrollRef.current?.scrollTo({ x: 200, animated: true });
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.default,
        flexGrow: 0,
        flexShrink: 0,
        position: 'relative',
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
          paddingRight: 36,
          paddingVertical: 8,
          gap: 8,
          alignItems: 'center',
        }}
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(cat.id)}
              style={{
                paddingHorizontal: 16,
                height: 36,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 8,
                backgroundColor: active ? colors.brand.primary : colors.surface.disabled,
              }}
            >
              <Text
                style={{
                  ...font.tab,
                  color: active ? colors.text.inverse : colors.text.body,
                }}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Scroll hint fade + arrow */}
      <Animated.View
        pointerEvents={isScrollable && !atEnd ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          opacity: fadeAnim,
          backgroundColor: 'transparent',
        }}
      >
        <TouchableOpacity
          onPress={scrollRight}
          activeOpacity={0.7}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 4,
            elevation: 4,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
          accessibilityLabel="Xem thêm danh mục"
          accessibilityRole="button"
        >
          <MaterialIcons name="chevron-right" size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

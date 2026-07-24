import React, { useRef, useState, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  TextInput,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { shape } from '../../theme/shape';
import { CATEGORIES } from '../../constants/categories';
import type { Category } from './types';
import AppText from '../ui/AppText';

interface CategoryProps {
  cat: Category;
  active: boolean;
  onPress: () => void;
}

const CategoryChip = React.memo(function CategoryChip({ cat, active, onPress }: CategoryProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      friction: 8,
      tension: 150,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 100,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 16,
          height: 44,
          borderRadius: shape.radius.md,
          backgroundColor: active ? colors.brand.primary : colors.surface.disabled,
          borderWidth: 1,
          borderColor: active ? colors.brand.primary : colors.border.default,
          ...(active ? shape.shadow.md : {}),
        }}
      >
        {cat.icon && (
          <MaterialCommunityIcons
            name={cat.icon as any}
            size={16}
            color={active ? colors.text.inverse : colors.icon.default}
          />
        )}
        <AppText
          variant="md"
          color={active ? colors.text.inverse : colors.text.primary}
        >
          {cat.name}
        </AppText>
      </TouchableOpacity>
    </Animated.View>
  );
});


interface CategoryTabsProps {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  isWide: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const CategoryTabs = React.memo(function CategoryTabs({
  activeCategory,
  onSelectCategory,
  isWide,
  searchQuery = '',
  onSearchChange,
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
      {/* Quick Search Bar */}
      {onSearchChange && (
        <View style={{ paddingHorizontal: 12, pt: 8, paddingTop: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface.app,
              borderRadius: shape.radius.md,
              borderWidth: 1,
              borderColor: colors.border.default,
              paddingHorizontal: 10,
              height: 38,
              gap: 6,
            }}
          >
            <MaterialCommunityIcons name="magnify" size={18} color={colors.text.secondary} />
            <TextInput
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Tìm tên món nhanh (ví dụ: sữa chua, cafe)..."
              placeholderTextColor={colors.text.tertiary}
              style={{
                flex: 1,
                fontSize: 13,
                color: colors.text.primary,
                padding: 0,
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearchChange('')}>
                <MaterialCommunityIcons name="close-circle" size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

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
          alignItems: 'center',
          gap: 8,
        }}
      >
        {CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat.id}
            cat={cat}
            active={activeCategory === cat.id}
            onPress={() => onSelectCategory(cat.id)}
          />
        ))}
      </ScrollView>

      {/* Scroll hint fade + arrow */}
      <Animated.View
        pointerEvents={isScrollable && !atEnd ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          height: 52,
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 32,
            height: 32,
            borderRadius: shape.radius.md,
            backgroundColor: colors.brand.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 4,
            ...shape.shadow.sm,
          }}
          accessibilityLabel="Xem thêm danh mục"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});
export default CategoryTabs;


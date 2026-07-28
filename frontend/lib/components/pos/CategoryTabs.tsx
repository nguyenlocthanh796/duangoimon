import React, { useRef } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { shape } from '../../theme/shape';
import { CATEGORIES, getMergedCategories } from '../../constants/categories';
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
          paddingHorizontal: 12,
          height: 36,
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
            size={15}
            color={active ? colors.text.inverse : colors.icon.default}
          />
        )}
        <AppText
          variant="md"
          weight="bold"
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
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          alignItems: 'center',
          gap: 8,
        }}
      >
        {getMergedCategories().map((cat) => (
          <CategoryChip
            key={cat.id}
            cat={cat}
            active={activeCategory === cat.id}
            onPress={() => onSelectCategory(cat.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
});
export default CategoryTabs;


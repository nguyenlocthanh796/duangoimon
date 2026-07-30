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
import { haptic } from '../../haptic';
import { CATEGORIES, getMergedCategories } from '../../constants/categories';
import type { Category } from './types';
import AppText from '../ui/AppText';

interface CategoryProps {
  cat: Category;
  active: boolean;
  onPress: () => void;
}

export const CATEGORY_COLOR_PALETTE: Record<string, { bg: string; text: string; border: string }> = {
  all: { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74' },
  'sua-chua': { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  'tra-chanh': { bg: '#FEFCE8', text: '#CA8A04', border: '#FDE047' },
  'do-an-vat': { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
  che: { bg: '#FDF2F8', text: '#DB2777', border: '#FBCFE8' },
  'tra-sua': { bg: '#FAF5FF', text: '#9333EA', border: '#E9D5FF' },
  soda: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  kem: { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' },
  cafe: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  default: { bg: '#FFF7ED', text: '#F97316', border: '#FDBA74' },
};

const CategoryChip = React.memo(function CategoryChip({ cat, active, onPress }: CategoryProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const palette = CATEGORY_COLOR_PALETTE[cat.id] || CATEGORY_COLOR_PALETTE.default;

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
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        onPress={() => { haptic.impact('light'); onPress(); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          height: 34,
          borderRadius: 6,
          backgroundColor: active ? palette.bg : 'transparent',
          borderWidth: active ? 1 : 0,
          borderColor: active ? palette.border : 'transparent',
          shadowColor: active ? '#000000' : 'transparent',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: active ? 0.05 : 0,
          shadowRadius: 1.5,
          elevation: active ? 1 : 0,
        }}
      >
        <AppText
          variant="md"
          weight={active ? 'bold' : 'normal'}
          color={active ? palette.text : '#475569'}
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
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexGrow: 0,
        flexShrink: 0,
      }}
    >
      <View
        style={{
          backgroundColor: '#F1F5F9',
          borderRadius: 8,
          padding: 3,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            gap: 4,
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
    </View>
  );
});
export default CategoryTabs;


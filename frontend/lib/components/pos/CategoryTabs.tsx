import React, { useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Animated,
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
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 18, // Khoảng cách dưới rộng hơn để tránh dính sát vào lưới sản phẩm
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
      </View>
    </View>
  );
});
export default CategoryTabs;


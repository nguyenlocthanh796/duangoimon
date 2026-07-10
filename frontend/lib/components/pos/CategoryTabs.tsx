import { ScrollView, TouchableOpacity, Text } from 'react-native';
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

export default function CategoryTabs({ activeCategory, onSelectCategory, isWide }: CategoryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ 
        backgroundColor: colors.surface.card, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border.default, 
        flexGrow: 0, 
        flexShrink: 0, 
      }}
      contentContainerStyle={{ 
        paddingHorizontal: 12, 
        paddingRight: 28,
        paddingVertical: 8, 
        gap: 8,
        alignItems: 'center',
      }}
    >
      {CATEGORIES.map(cat => {
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
            <Text style={{ 
              ...font.tab,
              color: active ? colors.text.inverse : colors.text.body,
            }}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

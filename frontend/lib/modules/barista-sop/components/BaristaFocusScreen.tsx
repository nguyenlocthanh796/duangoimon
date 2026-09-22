import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { AppText } from '../../../components/ui';
import { playTapSound } from '../../../utils/sound';
import { useBaristaStore } from '../store';
import { RecipeBookItem, RecipeSizeVariant } from '../types';

interface BaristaFocusScreenProps {
  onSelectRecipeForFocus: (recipe: RecipeBookItem, variant?: RecipeSizeVariant) => void;
}

export function BaristaFocusScreen({ onSelectRecipeForFocus }: BaristaFocusScreenProps) {
  const { theme, isDark } = useTheme();
  const { recipes } = useBaristaStore();
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  const categories = ['Tất cả', ...Array.from(new Set(recipes.map((r) => r.category)))];

  const filtered = recipes.filter(
    (r) => selectedCategory === 'Tất cả' || r.category === selectedCategory
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Category Pills */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {categories.map((cat) => {
            const isSel = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  setSelectedCategory(cat);
                }}
                style={[
                  s.catChip,
                  {
                    backgroundColor: isSel ? theme.brand.primary : theme.surface.card,
                    borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                  },
                ]}
              >
                <AppText
                  variant="xs"
                  weight={isSel ? 'bold' : 'medium'}
                  color={isSel ? theme.text.onBrand : theme.text.primary}
                >
                  {cat}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Grid of Big Action Cards for Baristas */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 4 }}>
          CHỌN MÓN ĐỂ BẬT CHẾ ĐỘ PHA CHẾ CỰ LY XA
        </AppText>

        <View style={s.gridContainer}>
          {filtered.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                onSelectRecipeForFocus(item, item.variants?.[0]);
              }}
              style={[
                s.focusCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                },
              ]}
            >
              <View style={s.cardHeaderRow}>
                <View style={[s.cardIconBadge, { backgroundColor: theme.status.warningBg }]}>
                  <Icon name="coffee-outline" size={24} color={theme.brand.accent} />
                </View>
                <View style={s.prepTag}>
                  <AppText variant="xxs" weight="bold" color={theme.text.muted}>
                    ⏱️ {item.prepTimeMinutes}p
                  </AppText>
                </View>
              </View>

              <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={2} style={{ marginTop: 8 }}>
                {item.productName}
              </AppText>

              <AppText variant="xs" color={theme.brand.accent} style={{ marginTop: 2 }}>
                {item.steps?.length || 0} Bước SOP • {item.variants?.[0]?.sizeName || 'Chuẩn'}
              </AppText>

              <View style={[s.startBar, { backgroundColor: theme.brand.primary }]}>
                <Icon name="play" size={16} color={theme.text.onBrand} />
                <AppText variant="xs" weight="bold" color={theme.text.onBrand}>
                  Pha Chế Ngay
                </AppText>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  focusCard: {
    width: '48%',
    minWidth: 150,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  startBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
});


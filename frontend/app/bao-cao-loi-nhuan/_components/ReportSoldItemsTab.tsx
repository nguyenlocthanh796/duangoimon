import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText, Tier2FilterChips } from '../../../lib/components/ui';
import { playTapSound } from '../../../lib/utils/sound';
import { useCategories, CategoryItem } from '../../../lib/store/usePOSStore';
import { SoldProductRecord } from './types';

interface ReportSoldItemsTabProps {
  categoryFilter: string;
  onSetCategoryFilter: (cat: string) => void;
  sortBy: 'qty' | 'revenue';
  onSetSortBy: (sort: 'qty' | 'revenue') => void;
  filteredProducts: SoldProductRecord[];
  maxSoldQty: number;
  onSelectProduct?: (prod: SoldProductRecord) => void;
}

export const ReportSoldItemsTab: React.FC<ReportSoldItemsTabProps> = ({
  categoryFilter,
  onSetCategoryFilter,
  sortBy,
  onSetSortBy,
  filteredProducts,
  maxSoldQty,
  onSelectProduct,
}) => {
  const { theme, isDark } = useTheme();
  const { isWide } = useResponsive();
  const categories = useCategories();
  const categoryNames = useMemo(() => ['Tất Cả', ...categories.map((c: CategoryItem) => c.name)], [categories]);

  return (
    <View style={{ gap: isWide ? 10 : 0 }}>
      {/* FILTER CATEGORY & SORT SELECTOR */}
      <View
        style={[
          s.glassSoldFilterContainer,
          {
            backgroundColor: theme.surface.card,
            borderColor: theme.border.subtle,
            borderRadius: isWide ? 16 : 0,
            borderWidth: isWide ? 1 : 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
          },
        ]}
      >
        {/* Category Filter Chips (Chuẩn Jade Capsule Pills) */}
        <Tier2FilterChips
          chips={categoryNames}
          activeChip={categoryFilter}
          onChipChange={onSetCategoryFilter}
          activeColor="primary"
          containerStyle={{ borderBottomWidth: 0, minHeight: 44, backgroundColor: 'transparent' }}
        />

        {/* Sort: Qty vs Revenue */}
        <View style={[s.sortSwitchRow, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <AppText variant="sm" color={theme.text.muted}>
            Xếp theo:
          </AppText>
          <View style={[s.sortSegmentTrack, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
            <TouchableOpacity
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                onSetSortBy('qty');
              }}
              style={[
                s.sortSegmentBtn,
                sortBy === 'qty' && {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderWidth: StyleSheet.hairlineWidth,
                  ...(Platform.OS === 'web'
                    ? ({ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' } as any)
                    : { elevation: 1 }),
                },
              ]}
            >
              <AppText
                variant="sm"
                weight={sortBy === 'qty' ? 'bold' : 'medium'}
                color={sortBy === 'qty' ? theme.brand.primary : theme.text.muted}
              >
                Số lượng
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                onSetSortBy('revenue');
              }}
              style={[
                s.sortSegmentBtn,
                sortBy === 'revenue' && {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderWidth: StyleSheet.hairlineWidth,
                  ...(Platform.OS === 'web'
                    ? ({ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' } as any)
                    : { elevation: 1 }),
                },
              ]}
            >
              <AppText
                variant="sm"
                weight={sortBy === 'revenue' ? 'bold' : 'medium'}
                color={sortBy === 'revenue' ? theme.brand.primary : theme.text.muted}
              >
                Doanh thu
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* DANH SÁCH MÓN ĐÃ BÁN SQUIRCLE GLASS CARD (INLINE EXPANDABLE) */}
      <View
        style={[
          s.glassListContainer,
          {
            backgroundColor: theme.surface.card,
            borderColor: isWide ? theme.border.glassBorder : 'transparent',
            borderRadius: isWide ? 16 : 0,
            borderWidth: isWide ? 1 : 0,
            borderTopWidth: isWide ? 1 : 0,
            borderTopColor: theme.border.subtle,
            borderBottomWidth: isWide ? 1 : StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
            ...(Platform.OS === 'web' && isWide
              ? ({
                  boxShadow: isDark
                    ? '0 4px 16px rgba(0, 0, 0, 0.3)'
                    : '0 2px 10px rgba(15, 23, 42, 0.04)',
                } as any)
              : { elevation: 0 }),
          },
        ]}
      >
        {filteredProducts.length === 0 ? (
          <View style={{ padding: 36, alignItems: 'center' }}>
            <Icon name="silverware-fork-knife" size={40} color={theme.text.muted} />
            <AppText variant="md" color={theme.text.muted} style={{ marginTop: 8 }}>
              Không có món nào trong nhóm
            </AppText>
          </View>
        ) : (
          filteredProducts.map((prod, idx) => {
            const isLast = idx === filteredProducts.length - 1;
            const ratio = Math.min(100, Math.round((prod.qtySold / maxSoldQty) * 100));

            return (
              <View
                key={prod.id}
                style={[
                  !isLast && { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    playTapSound();
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                    }
                    onSelectProduct?.(prod);
                  }}
                  style={s.soldProductRow}
                >
                  {/* Rank Badge */}
                  <View
                    style={[
                      s.rankBadge,
                      {
                        backgroundColor:
                          idx === 0
                            ? theme.brand.warning
                            : idx === 1
                            ? theme.text.muted
                            : idx === 2
                            ? theme.brand.accent
                            : theme.surface.header,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight="bold"
                      color={idx < 3 ? theme.text.onBrand : theme.text.muted}
                      tabularNums
                    >
                      #{idx + 1}
                    </AppText>
                  </View>

                  {/* Product Details & Mini Progress Bar */}
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText variant="md" color={theme.text.primary} numberOfLines={1} style={{ flex: 1 }}>
                        {prod.name}
                      </AppText>
                      <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                        {prod.revenue.toLocaleString('vi-VN')} đ
                      </AppText>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <AppText variant="xs" color={theme.text.muted}>
                        Nhóm: {prod.category}
                      </AppText>
                      <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>
                        {prod.qtySold} phần
                      </AppText>
                    </View>

                    {/* Progress Bar Mini */}
                    <View style={[s.progressBarTrack, { backgroundColor: theme.border.subtle }]}>
                      <View style={[s.progressBarFill, { width: `${ratio}%`, backgroundColor: theme.brand.primary }]} />
                    </View>
                  </View>

                  <Icon name="chevron-right" size={18} color={theme.text.muted} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  glassSoldFilterContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  catChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortSegmentTrack: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sortSegmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  glassListContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  soldProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarTrack: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});

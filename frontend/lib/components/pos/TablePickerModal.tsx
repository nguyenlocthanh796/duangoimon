import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Modal,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { ModalDragIndicator } from '../ui/ModalDragIndicator';
import { TableCard, TableItem } from './TableCard';
import { useTableList, useAreas } from '../../store/usePOSStore';
import { playTapSound } from '../../utils/sound';
import { matchesVietnameseSearch } from '../../utils/vietnameseSearch';

export interface TablePickerModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  currentTableId?: string;
  cartItemCount?: number;
  cartTotalAmount?: number;
  onClose: () => void;
  onSelectTable: (table: TableItem) => void;
}

export const TablePickerModal: React.FC<TablePickerModalProps> = ({
  visible,
  title = 'Gán Đơn Vào Bàn',
  subtitle,
  currentTableId,
  cartItemCount,
  cartTotalAmount,
  onClose,
  onSelectTable,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tables = useTableList();
  const areas = useAreas();

  const [selectedArea, setSelectedArea] = useState<string>('Tất Cả');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isSearching = searchQuery.trim() !== '' || isSearchFocused;

  const areaList = useMemo(() => ['Tất Cả', ...areas.map((a) => a.name)], [areas]);

  // Đếm số lượng bàn theo từng khu vực
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Tất Cả': tables.filter(
        (t) => !(t.id.startsWith('mv-') || (t.area && t.area.toLowerCase().includes('mang về')))
      ).length,
    };
    areas.forEach((a) => {
      counts[a.name] = tables.filter((t) => t.area === a.name).length;
    });
    return counts;
  }, [tables, areas]);

  // Đếm số lượng theo trạng thái
  const nonTakeawayTables = useMemo(() => {
    return tables.filter(
      (t) => !(t.id.startsWith('mv-') || (t.area && t.area.toLowerCase().includes('mang về')))
    );
  }, [tables]);

  const occupiedCount = useMemo(() => {
    return nonTakeawayTables.filter((t) => t.status === 'co_khach' || t.status === 'dang_su_dung').length;
  }, [nonTakeawayTables]);

  const vacantCount = useMemo(() => {
    return nonTakeawayTables.filter((t) => t.status === 'trong' || !t.status).length;
  }, [nonTakeawayTables]);

  const filteredTables = useMemo(() => {
    return nonTakeawayTables
      .filter((t) => {
        const matchArea = selectedArea === 'Tất Cả' || t.area === selectedArea;
        const matchSearch =
          !searchQuery.trim() ||
          matchesVietnameseSearch(t.name, searchQuery) ||
          (t.area && matchesVietnameseSearch(t.area, searchQuery));

        let matchStatus = true;
        if (activeStatusFilter === 'co_khach') {
          matchStatus = t.status === 'co_khach' || t.status === 'dang_su_dung';
        } else if (activeStatusFilter === 'trong') {
          matchStatus = t.status === 'trong' || !t.status;
        }

        return matchArea && matchSearch && matchStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
  }, [nonTakeawayTables, selectedArea, searchQuery, activeStatusFilter]);

  const displayTables = useMemo(() => {
    if (filteredTables.length % 2 !== 0) {
      return [...filteredTables, { id: '__empty_spacer__', name: '', area: '', capacity: 0, status: 'trong', isSpacer: true } as any];
    }
    return filteredTables;
  }, [filteredTables]);

  const handleSelect = useCallback(
    (table: TableItem) => {
      playTapSound();
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (_) {}
      }
      onSelectTable(table);
      onClose();
    },
    [onSelectTable, onClose]
  );

  const handleTakeawayQuickSelect = useCallback(() => {
    const takeawayTable: TableItem =
      tables.find((t) => t.id.startsWith('mv-') || t.name.toLowerCase().includes('mang về')) || {
        id: 'mv-01',
        name: 'Mang Về 01',
        area: 'Mang Về',
        capacity: 1,
        status: 'trong',
      };
    handleSelect(takeawayTable);
  }, [tables, handleSelect]);

  if (!visible) return null;

  const hasCartInfo = typeof cartItemCount === 'number' && cartItemCount > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <TouchableOpacity
          activeOpacity={1}
          style={s.backdrop}
          onPress={onClose}
        />
        <View
          style={[
            s.sheetContainer,
            {
              backgroundColor: theme.surface.app,
              borderTopColor: theme.border.subtle,
              paddingBottom: Math.max(insets.bottom, 16),
              height: Math.round(windowHeight * 0.9),
              maxHeight: Math.round(windowHeight * 0.92),
            },
          ]}
        >
          {/* 🌟 1. CONTEXT HEADER 2 HÀNG: Hàng 1 Tiêu đề + Nút X; Hàng 2 Badge Giỏ hàng + Phụ đề */}
          <View style={[s.headerRow, { borderBottomColor: theme.border.subtle }]}>
            <View style={s.headerMainCol}>
              <View style={s.titleRow}>
                <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
                  {title}
                </AppText>
              </View>
              <View style={s.subtitleRow}>
                {hasCartInfo && (
                  <View style={[s.cartPill, { backgroundColor: theme.brand.primaryBg }]}>
                    <Icon name="basket-outline" size={13} color={theme.brand.primary} />
                    <AppText variant="xs" weight="bold" color={theme.brand.primary} tabularNums>
                      {cartItemCount} món · {(cartTotalAmount || 0).toLocaleString('vi-VN')} đ
                    </AppText>
                  </View>
                )}
                <AppText variant="xs" color={theme.text.muted} numberOfLines={1} style={{ flex: 1 }}>
                  {subtitle || 'Chạm bàn để gán đơn'}
                </AppText>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              onPress={() => {
                playTapSound();
                onClose();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[s.closeBtn, { backgroundColor: theme.surface.header }]}
            >
              <Icon name="close" size={20} color={theme.text.muted} />
            </TouchableOpacity>
          </View>

          {/* 🌟 2. HÀNG LỐI TẮT NGHIỆP VỤ 1-CHẠM: [Mang Về] + [Tại Quầy] + [Bàn Trống] */}
          <View style={s.quickShortcutsRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Gán nhanh mang về"
              onPress={handleTakeawayQuickSelect}
              style={[
                s.quickPillLarge,
                {
                  backgroundColor: theme.status.warningBg,
                  borderColor: theme.brand.accent,
                },
              ]}
            >
              <Icon name="bag-personal" size={18} color={theme.brand.accent} />
              <AppText variant="sm" weight="bold" color={theme.brand.accent}>
                Mang Về
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Gán khách tại quầy"
              onPress={() => {
                const counterTable: TableItem = {
                  id: 'quay-01',
                  name: 'Tại Quầy',
                  area: 'Quầy Thu Ngân',
                  capacity: 1,
                  status: 'trong',
                };
                handleSelect(counterTable);
              }}
              style={[
                s.quickPillLarge,
                {
                  backgroundColor: theme.brand.primaryBg,
                  borderColor: theme.brand.primary,
                },
              ]}
            >
              <Icon name="storefront-outline" size={18} color={theme.brand.primary} />
              <AppText variant="sm" weight="bold" color={theme.brand.primary}>
                Tại Quầy
              </AppText>
            </TouchableOpacity>

            {/* 🌟 CÔNG TẮC CHẤM TRÒN LỌC NHANH BÀN TRỐNG */}
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="switch"
              accessibilityState={{ checked: activeStatusFilter === 'trong' }}
              accessibilityLabel="Công tắc lọc nhanh bàn trống"
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (_) {}
                }
                setActiveStatusFilter((prev) => (prev === 'trong' ? 'all' : 'trong'));
              }}
              style={[
                s.vacantTogglePill,
                {
                  backgroundColor: activeStatusFilter === 'trong'
                    ? (isDark ? 'rgba(34,197,94,0.22)' : theme.status.readyBg)
                    : theme.surface.card,
                  borderColor: activeStatusFilter === 'trong' ? theme.brand.success : theme.border.subtle,
                },
              ]}
            >
              <View
                style={[
                  s.statusDotCircle,
                  {
                    backgroundColor: theme.brand.success,
                    opacity: activeStatusFilter === 'trong' ? 1 : 0.6,
                    transform: [{ scale: activeStatusFilter === 'trong' ? 1.15 : 1.0 }],
                  },
                ]}
              />
              <AppText
                variant="sm"
                weight={activeStatusFilter === 'trong' ? 'bold' : 'medium'}
                color={activeStatusFilter === 'trong' ? theme.brand.success : theme.text.primary}
                tabularNums
              >
                Trống ({vacantCount})
              </AppText>
            </TouchableOpacity>
          </View>

          {/* 🌟 3. BANNER HỢP NHẤT TÌM KIẾM & CHIP LỌC (HEIGHT 54PX CHUẨN SƠ ĐỒ BÀN & DANH MỤC MÓN) */}
          {isSearching ? (
            <View style={[s.bannerContainer, { backgroundColor: theme.surface.app, borderBottomColor: theme.border.subtle, paddingHorizontal: 4 }]}>
              <View style={[s.searchBoxFull, { backgroundColor: theme.surface.card, borderColor: theme.brand.accent }]}>
                <Icon name="magnify" size={18} color={theme.brand.accent} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Tìm bàn, khu vực..."
                  placeholderTextColor={theme.text.muted}
                  autoFocus
                  onBlur={() => {
                    if (searchQuery.trim() === '') {
                      setIsSearchFocused(false);
                    }
                  }}
                  style={[s.searchInput, { color: theme.text.primary, fontSize: 16 }]}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Xóa tìm kiếm"
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="close-circle" size={18} color={theme.text.muted} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Đóng tìm kiếm"
                  onPress={() => {
                    setSearchQuery('');
                    setIsSearchFocused(false);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ paddingLeft: 4 }}
                >
                  <Icon name="close" size={20} color={theme.text.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[s.bannerContainer, { backgroundColor: theme.surface.app, borderBottomColor: theme.border.subtle }]}>
              <View style={s.bannerRow}>
                {/* 🌟 SCROLLVIEW DẢI CHIP KHU VỰC VÀ TRẠNG THÁI */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[s.chipsScroll, { paddingLeft: 60, paddingRight: 12 }]}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Tabs Khu Vực */}
                  {areaList.map((area) => {
                    const isSelected = selectedArea === area;
                    const count = areaCounts[area];
                    return (
                      <TouchableOpacity
                        key={area}
                        activeOpacity={0.75}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`Khu vực ${area}`}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        onPress={() => {
                          playTapSound();
                          if (Platform.OS !== 'web') {
                            try {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            } catch (_) {}
                          }
                          setSelectedArea(area);
                        }}
                        style={[
                          s.areaPill,
                          {
                            backgroundColor: isSelected ? theme.brand.accent : theme.surface.card,
                            borderColor: isSelected ? theme.brand.accent : theme.border.subtle,
                          },
                        ]}
                      >
                        <AppText
                          variant="sm"
                          weight={isSelected ? 'medium' : 'normal'}
                          color={isSelected ? theme.text.onBrand : theme.text.primary}
                          tabularNums
                        >
                          {count !== undefined ? `${area} (${count})` : area}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Đường gạch đứng phân cách */}
                  <View style={[s.verticalDivider, { backgroundColor: theme.border.subtle }]} />

                  {/* Chips Lọc Trạng Thái */}
                  {[
                    { id: 'all', label: 'Tất cả', color: undefined },
                    { id: 'co_khach', label: `${occupiedCount} Ăn`, color: theme.brand.accent },
                    { id: 'trong', label: `${vacantCount} Trống`, color: theme.brand.success },
                  ].map((opt) => {
                    const isActive = activeStatusFilter === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        activeOpacity={0.7}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`Lọc: ${opt.label}`}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        onPress={() => {
                          playTapSound();
                          if (Platform.OS !== 'web') {
                            try {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            } catch (_) {}
                          }
                          setActiveStatusFilter(opt.id);
                        }}
                        style={[
                          s.statusPill,
                          {
                            backgroundColor: isActive
                              ? opt.color
                                ? isDark
                                  ? `${opt.color}2e`
                                  : `${opt.color}1e`
                                : isDark
                                ? 'rgba(255,255,255,0.12)'
                                : 'rgba(28,25,23,0.08)'
                              : theme.surface.card,
                            borderColor: isActive ? opt.color || theme.border.default : theme.border.subtle,
                          },
                        ]}
                      >
                        {opt.color && <View style={[s.statusDotSmall, { backgroundColor: opt.color }]} />}
                        <AppText
                          variant="sm"
                          weight={isActive ? 'medium' : 'normal'}
                          color={
                            opt.id === 'all'
                              ? theme.text.primary
                              : isActive
                              ? opt.color || theme.text.primary
                              : theme.text.muted
                          }
                          tabularNums
                        >
                          {opt.label}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* 🌟 NÚT TÌM KIẾM CỐ ĐỊNH VỚI HIỆU ỨNG MỜ DẦN BÊN NGOÀI (GRADIENT FADE EDGE) */}
                <View style={s.pinnedGlassBox} pointerEvents="box-none">
                  <View style={[s.solidSearchBox, { backgroundColor: theme.surface.app }]}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel="Mở ô tìm kiếm bàn"
                      onPress={() => {
                        playTapSound();
                        setIsSearchFocused(true);
                      }}
                      style={[s.searchIconButton, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Icon name="magnify" size={20} color={theme.text.primary} />
                    </TouchableOpacity>

                    <View style={[s.verticalDivider, { backgroundColor: theme.border.subtle }]} />
                  </View>

                  {/* Dải Gradient Mờ Dần (Fade to Transparent) */}
                  <Svg height={54} width={12} style={{ width: 12, height: 54 }}>
                    <Defs>
                      <SvgGradient id="pickerBannerFade" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor={theme.surface.app} stopOpacity="1" />
                        <Stop offset="1" stopColor={theme.surface.app} stopOpacity="0" />
                      </SvgGradient>
                    </Defs>
                    <Rect x="0" y="0" width={12} height={54} fill="url(#pickerBannerFade)" />
                  </Svg>
                </View>
              </View>
            </View>
          )}

          {/* 🌟 5. LƯỚI BÀN TABLECARD 2 CỘT CHUẨN ĐỒNG BỘ */}
          <FlatList
            data={displayTables}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={s.columnWrapper}
            style={s.tableScroll}
            contentContainerStyle={s.tableGrid}
            showsVerticalScrollIndicator={false}
            bounces={false}
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={5}
            renderItem={({ item: t }) => {
              if ((t as any).isSpacer) {
                return <View style={s.cardItemWrapper} />;
              }
              const isCurrent = t.id === currentTableId;
              return (
                <View style={s.cardItemWrapper}>
                  <TableCard
                    table={t}
                    selected={isCurrent}
                    itemCount={t.itemCount || 0}
                    width="100%"
                    onPress={() => handleSelect(t)}
                  />
                </View>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    height: '90%',
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerMainCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  quickShortcutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  quickPillLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  vacantTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 23,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  statusDotCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  quickScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 19,
    borderWidth: 1,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bannerContainer: {
    height: 54,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 54,
  },
  pinnedGlassBox: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  solidSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 0,
    height: 54,
  },
  searchIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBoxFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    margin: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  areaPill: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tableScroll: {
    flex: 1,
  },
  columnWrapper: {
    gap: 10,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  tableGrid: {
    paddingTop: 4,
    paddingBottom: 24,
  },
  cardItemWrapper: {
    width: '48.5%',
    maxWidth: '48.5%',
    minHeight: 126,
  },
});

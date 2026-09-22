import React from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { usePOSStore } from '../../store/usePOSStore';
import { playTapSound } from '../../utils/sound';

export interface TableOverviewBannerProps {
  activeStatusFilter?: string;
  onSelectStatusFilter?: (status: string) => void;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  onOpenManageTables?: () => void;
  onOpenScanner?: () => void;
  areas?: string[];
  activeArea?: string;
  areaCounts?: Record<string, number>;
  onSelectArea?: (area: string) => void;
}

export const TableOverviewBanner: React.FC<TableOverviewBannerProps> = ({
  activeStatusFilter = 'all',
  onSelectStatusFilter,
  searchQuery = '',
  onSearchQueryChange,
  onOpenManageTables,
  onOpenScanner,
  areas,
  activeArea,
  areaCounts,
  onSelectArea,
}) => {
  const { theme, isDark } = useTheme();
  const tables = usePOSStore((s) => s.tables);
  const tableCarts = usePOSStore((s) => s.tableCarts || {});
  const [isFocused, setIsFocused] = React.useState(false);
  const isSearching = searchQuery.trim() !== '' || isFocused;

  const occupiedTables = tables.filter((t) => {
    const hasCart = (tableCarts[t.id]?.length || 0) > 0;
    return t.status === 'co_khach' || t.status === 'dang_su_dung' || hasCart;
  });
  const prePrintedTables = tables.filter((t) => t.status === 'da_in_tam_tinh');
  const vacantTables = tables.filter(
    (t) =>
      !occupiedTables.some((o) => o.id === t.id) &&
      !prePrintedTables.some((p) => p.id === t.id) &&
      t.status !== 'da_dat'
  );

  // Đếm số bàn có khách theo từng khu vực
  const occupiedCountByArea = React.useMemo(() => {
    const map: Record<string, number> = {};
    occupiedTables.forEach((t) => {
      if (t.area) {
        map[t.area] = (map[t.area] || 0) + 1;
      }
    });
    return map;
  }, [occupiedTables]);

  const handleStatusPress = (status: string) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    onSelectStatusFilter?.(status);
  };

  if (isSearching) {
    return (
      <View style={[s.container, { backgroundColor: theme.surface.app, borderColor: theme.border.subtle, paddingHorizontal: 12 }]}>
        <View style={[s.searchBoxFull, { backgroundColor: theme.surface.header, borderColor: theme.brand.accent }]}>
          <Icon name="magnify" size={18} color={theme.brand.accent} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder="Tìm bàn..."
            placeholderTextColor={theme.text.muted}
            autoFocus
            onBlur={() => {
              if (searchQuery.trim() === '') {
                setIsFocused(false);
              }
            }}
            style={[s.searchInput, { color: theme.text.primary, fontSize: 16 }]}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Xóa tìm kiếm"
              onPress={() => onSearchQueryChange?.('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close-circle" size={18} color={theme.text.muted} />
            </TouchableOpacity>
          )}
          {onOpenScanner && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Quét mã QR bàn"
              onPress={onOpenScanner}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="qrcode-scan" size={18} color={theme.brand.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Đóng tìm kiếm"
            onPress={() => {
              onSearchQueryChange?.('');
              setIsFocused(false);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ paddingLeft: 4 }}
          >
            <Icon name="close" size={20} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app, borderColor: theme.border.subtle }]}>
      <View style={s.bannerRow}>
        {/* 🌟 SCROLLVIEW CHIPS (Khu Vực & Trạng Thái) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[s.chipsScroll, { paddingLeft: 72, paddingRight: 12 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tabs Khu Vực */}
          {areas &&
            areas.map((area) => {
              const isActive = area === activeArea;
              const count = areaCounts ? areaCounts[area] : undefined;
              const occupiedInArea = area === 'Tất Cả' ? occupiedTables.length : (occupiedCountByArea[area] || 0);

              return (
                <TouchableOpacity
                  key={area}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Khu vực ${area}${count !== undefined ? `, ${count} bàn` : ''}`}
                  activeOpacity={0.75}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  onPress={() => {
                    playTapSound();
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (_) {}
                    }
                    onSelectArea?.(area);
                  }}
                  style={[
                    s.areaChip,
                    {
                      backgroundColor: isActive ? theme.brand.accent : theme.surface.header,
                      borderColor: isActive ? theme.brand.accent : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    variant="sm"
                    weight={isActive ? 'medium' : 'normal'}
                    color={isActive ? theme.text.onBrand : theme.text.primary}
                    tabularNums
                  >
                    {count !== undefined ? `${area} (${count})` : area}
                  </AppText>
                  {occupiedInArea > 0 && !isActive && (
                    <View style={[s.areaOccupiedBadge, { backgroundColor: theme.brand.accent }]}>
                      <AppText variant="xxs" weight="bold" color={theme.text.onBrand} tabularNums>
                        {occupiedInArea}
                      </AppText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

          {/* Divider hairline giữa Khu Vực và Trạng Thái */}
          {areas && areas.length > 0 && (
            <View style={[s.verticalDivider, { backgroundColor: theme.border.subtle }]} />
          )}

          {/* Chips Trạng Thái (Ăn / Trống / Bill) */}
          {[
            { id: 'all', label: 'Tất cả', color: undefined },
            { id: 'co_khach', label: `${occupiedTables.length} Ăn`, color: theme.brand.accent },
            { id: 'trong', label: `${vacantTables.length} Trống`, color: theme.brand.success },
            ...(prePrintedTables.length > 0
              ? [{ id: 'da_in_tam_tinh', label: `${prePrintedTables.length} Bill`, color: theme.brand.warning }]
              : []),
          ].map((opt) => {
            const isActive = activeStatusFilter === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Lọc bàn: ${opt.label}`}
                activeOpacity={0.7}
                onPress={() => handleStatusPress(opt.id)}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
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
                      : theme.surface.header,
                    borderColor: isActive ? opt.color || theme.border.default : theme.border.subtle,
                  },
                ]}
              >
                {opt.color && <View style={[s.statusDot, { backgroundColor: opt.color }]} />}
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
                setIsFocused(true);
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
              <SvgGradient id="tableBannerFade" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={theme.surface.app} stopOpacity="1" />
                <Stop offset="1" stopColor={theme.surface.app} stopOpacity="0" />
              </SvgGradient>
            </Defs>
            <Rect x="0" y="0" width={12} height={54} fill="url(#tableBannerFade)" />
          </Svg>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 54,
    justifyContent: 'center',
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
    paddingLeft: 10,
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  areaChip: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaOccupiedBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
});

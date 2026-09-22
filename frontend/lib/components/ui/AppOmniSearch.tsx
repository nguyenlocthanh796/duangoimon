import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from './AppText';
import { playTapSound } from '../../utils/sound';
import { scoreVietnameseSearch } from '../../utils/vietnameseSearch';
import {
  useOrderHistory,
  useMenuItems,
  useInventoryItems,
  useStoreSettings,
  OrderHistoryItem,
  MenuItemWithModifiers,
  InventoryItem,
} from '../../store/usePOSStore';
import { formatCurrency } from '../../utils/format';

export type OmniSearchScope = 'hoa-don' | 'thuc-don' | 'kho-hang' | 'all';

export interface AppOmniSearchProps {
  visible: boolean;
  onClose: () => void;
  scope?: OmniSearchScope;
  onSelectOrder?: (order: OrderHistoryItem) => void;
  onSelectMenuItem?: (item: MenuItemWithModifiers) => void;
  onSelectInventoryItem?: (item: InventoryItem) => void;
}

interface SystemShortcut {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: keyof typeof Icon.glyphMap;
}

const SYSTEM_SHORTCUTS: SystemShortcut[] = [
  { id: 'pos', title: 'Bán Hàng POS', subtitle: 'Sơ đồ bàn & thực đơn chọn món', route: '/', icon: 'cash-register' },
  { id: 'giao_ca', title: 'Giao Ca & Kiểm Két', subtitle: 'Đối soát két 30s', route: '/giao-ca', icon: 'account-cash-outline' },
  { id: 'so_quy', title: 'Sổ Quỹ Tiền Mặt', subtitle: 'Chi chợ 3s, thu nạp quỹ', route: '/so-quy', icon: 'wallet-plus-outline' },
  { id: 'hoa_don', title: 'Sổ Hóa Đơn', subtitle: 'Tra cứu & in lại bill', route: '/hoa-don', icon: 'receipt' },
  { id: 'kds', title: 'Bếp & Bar KDS', subtitle: 'Màn hình chế biến món', route: '/kds', icon: 'pot-steam' },
  { id: 'bao_cao', title: 'Báo Cáo P&L', subtitle: '3 Con số vàng bỏ túi', route: '/bao-cao-loi-nhuan', icon: 'chart-box-outline' },
  { id: 'thuc_don', title: 'Quản Lý Thực Đơn', subtitle: 'Món ăn, đổi giá, hết món 86', route: '/thuc-don', icon: 'food-fork-drink' },
  { id: 'kho_hang', title: 'Kho Hàng Nguyên Liệu', subtitle: 'Tồn kho, nhập hàng Sổ Quỹ', route: '/kho-hang', icon: 'warehouse' },
  { id: 'quan_ly_ban', title: 'Quản Lý Bàn & Khu Vực', subtitle: 'Thiết lập khu vực & sơ đồ bàn', route: '/quan-ly-ban', icon: 'table-chair' },
  { id: 'cai_dat', title: 'Cài Đặt Hệ Thống', subtitle: 'Máy in nhiệt LAN, VietQR, âm thanh', route: '/cai-dat', icon: 'cog-outline' },
  { id: 'cfd', title: 'Màn Khách CFD', subtitle: 'Màn hình hiển thị QR ngoài', route: '/cfd', icon: 'monitor-cellphone' },
];

export const AppOmniSearch: React.FC<AppOmniSearchProps> = ({
  visible,
  onClose,
  scope = 'all',
  onSelectOrder,
  onSelectMenuItem,
  onSelectInventoryItem,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');

  const orderHistory = useOrderHistory();
  const menuItems = useMenuItems();
  const inventoryItems = useInventoryItems();

  useEffect(() => {
    if (visible) {
      setQuery('');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Search Results
  const matchedOrders = useMemo(() => {
    if (!query.trim() || (scope !== 'hoa-don' && scope !== 'all')) return [];
    const q = query.trim().toLowerCase();
    return orderHistory
      .filter((o) => {
        const scoreCode = scoreVietnameseSearch(o.orderCode, q);
        const scoreTable = scoreVietnameseSearch(o.tableName, q);
        const scoreCashier = scoreVietnameseSearch(o.cashierName, q);
        return scoreCode > 0 || scoreTable > 0 || scoreCashier > 0;
      })
      .slice(0, 8);
  }, [query, orderHistory, scope]);

  const matchedMenuItems = useMemo(() => {
    if (!query.trim() || (scope !== 'thuc-don' && scope !== 'all')) return [];
    const q = query.trim().toLowerCase();
    return menuItems
      .filter((item) => {
        const scoreName = scoreVietnameseSearch(item.name || '', q);
        const scoreCode = scoreVietnameseSearch(item.code || '', q);
        const scoreCat = scoreVietnameseSearch(item.category || '', q);
        return scoreName > 0 || scoreCode > 0 || scoreCat > 0;
      })
      .slice(0, 10);
  }, [query, menuItems, scope]);

  const matchedInventoryItems = useMemo(() => {
    if (!query.trim() || (scope !== 'kho-hang' && scope !== 'all')) return [];
    const q = query.trim().toLowerCase();
    return inventoryItems
      .filter((item) => {
        const scoreName = scoreVietnameseSearch(item.name, q);
        const scoreSku = scoreVietnameseSearch(item.sku, q);
        const scoreCat = scoreVietnameseSearch(item.category, q);
        return scoreName > 0 || scoreSku > 0 || scoreCat > 0;
      })
      .slice(0, 10);
  }, [query, inventoryItems, scope]);

  const matchedShortcuts = useMemo(() => {
    if (!query.trim() || scope !== 'all') return [];
    const q = query.trim().toLowerCase();
    return SYSTEM_SHORTCUTS.filter((sc) => {
      const scoreTitle = scoreVietnameseSearch(sc.title, q);
      const scoreSub = scoreVietnameseSearch(sc.subtitle, q);
      return scoreTitle > 0 || scoreSub > 0;
    });
  }, [query, scope]);

  const totalResults =
    matchedOrders.length +
    matchedMenuItems.length +
    matchedInventoryItems.length +
    matchedShortcuts.length;

  const handleSelectShortcut = (shortcut: SystemShortcut) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onClose();
    router.push(shortcut.route as any);
  };

  const handleSelectOrder = (order: OrderHistoryItem) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onClose();
    if (onSelectOrder) onSelectOrder(order);
  };

  const handleSelectMenu = (item: MenuItemWithModifiers) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onClose();
    if (onSelectMenuItem) onSelectMenuItem(item);
  };

  const handleSelectInv = (item: InventoryItem) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    onClose();
    if (onSelectInventoryItem) onSelectInventoryItem(item);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[s.overlay, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            s.commandSheet,
            {
              backgroundColor: theme.surface.card,
              borderColor: theme.border.glassBorder,
              maxHeight: Math.round(windowHeight * 0.85),
              ...(Platform.OS === 'web'
                ? ({
                    boxShadow: isDark
                      ? '0 12px 36px rgba(0, 0, 0, 0.6)'
                      : '0 8px 28px rgba(15, 23, 42, 0.12)',
                  } as any)
                : { elevation: 12 }),
            },
          ]}
        >
          {/* Header Search Input */}
          <View style={[s.searchHeader, { borderBottomColor: theme.border.subtle }]}>
            <Icon name="magnify" size={20} color={theme.brand.primary} style={{ marginRight: 8 }} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder={
                scope === 'hoa-don'
                  ? 'Tìm mã HD, tên bàn, món ăn, thu ngân...'
                  : scope === 'kho-hang'
                  ? 'Tìm nguyên liệu, mã SKU tồn kho...'
                  : scope === 'thuc-don'
                  ? 'Tìm món ăn, mã món, danh mục...'
                  : 'Gõ mã đơn, món ăn, hoặc tính năng...'
              }
              placeholderTextColor={theme.text.muted}
              style={[s.input, { color: theme.text.primary }]}
              returnKeyType="search"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} style={s.clearBtn}>
                <Icon name="close-circle" size={18} color={theme.text.muted} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onClose} style={[s.escBtn, { backgroundColor: theme.surface.header }]}>
              <AppText variant="xs" color={theme.text.muted}>
                Đóng
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Results Scroll Area */}
          <ScrollView
            style={s.resultsScroll}
            contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. KẾT QUẢ THEO MÀN HÌNH HIỆN TẠI (LOCAL CONTEXT FIRST) */}
            {matchedOrders.length > 0 && (
              <View>
                <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionTitle}>
                  HÓA ĐƠN TRÙNG KHỚP ({matchedOrders.length})
                </AppText>
                <View style={s.itemsGroup}>
                  {matchedOrders.map((order) => (
                    <TouchableOpacity
                      key={order.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelectOrder(order)}
                      style={[s.resultItem, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
                    >
                      <View style={[s.itemIconBox, { backgroundColor: theme.brand.primaryBg }]}>
                        <Icon name="receipt" size={16} color={theme.brand.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>
                            {order.orderCode}
                          </AppText>
                          <AppText variant="sm" weight="normal" color={theme.text.primary}>
                            {order.tableName}
                          </AppText>
                        </View>
                        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                          {order.items.map((it) => `${it.qty}x ${it.item?.name}`).join(', ')}
                        </AppText>
                      </View>
                      <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                        {formatCurrency(order.finalTotal)} đ
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {matchedMenuItems.length > 0 && (
              <View>
                <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionTitle}>
                  MÓN ĂN / ĐỒ UỐNG ({matchedMenuItems.length})
                </AppText>
                <View style={s.itemsGroup}>
                  {matchedMenuItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelectMenu(item)}
                      style={[s.resultItem, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
                    >
                      <View style={[s.itemIconBox, { backgroundColor: theme.brand.primaryBg }]}>
                        <Icon name="food-fork-drink" size={16} color={theme.brand.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="sm" weight="normal" color={theme.text.primary}>
                          {item.name}
                        </AppText>
                        <AppText variant="xs" color={theme.text.muted}>
                          {item.category} · SKU: {item.code || 'N/A'}
                        </AppText>
                      </View>
                      <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                        {formatCurrency(item.price)} đ
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {matchedInventoryItems.length > 0 && (
              <View>
                <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionTitle}>
                  KHO HÀNG NGUYÊN LIỆU ({matchedInventoryItems.length})
                </AppText>
                <View style={s.itemsGroup}>
                  {matchedInventoryItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelectInv(item)}
                      style={[s.resultItem, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
                    >
                      <View style={[s.itemIconBox, { backgroundColor: theme.status.warningBg }]}>
                        <Icon name="warehouse" size={16} color={theme.brand.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="sm" weight="normal" color={theme.text.primary}>
                          {item.name}
                        </AppText>
                        <AppText variant="xs" color={theme.text.muted}>
                          SKU: {item.sku} · ĐVT: {item.unit}
                        </AppText>
                      </View>
                      <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>
                        Tồn: {item.currentStock} {item.unit}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* 2. LỐI TẮT NHANH TÍNH NĂNG (SYSTEM SHORTCUTS) */}
            <View>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionTitle}>
                {query.trim() ? 'LỐI TẮT TÍNH NĂNG PHÙ HỢP' : 'TÍNH NĂNG ĐỀ XUẤT'}
              </AppText>
              <View style={s.itemsGroup}>
                {matchedShortcuts.map((sItem) => (
                  <TouchableOpacity
                    key={sItem.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectShortcut(sItem)}
                    style={[s.resultItem, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
                  >
                    <View style={[s.itemIconBox, { backgroundColor: theme.brand.primaryBg }]}>
                      <Icon name={sItem.icon} size={16} color={theme.brand.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="sm" weight="normal" color={theme.text.primary}>
                        {sItem.title}
                      </AppText>
                      <AppText variant="xs" color={theme.text.muted}>
                        {sItem.subtitle}
                      </AppText>
                    </View>
                    <Icon name="chevron-right" size={16} color={theme.text.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  commandSheet: {
    width: '100%',
    maxWidth: 580,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    padding: 0,
    margin: 0,
    fontSize: 16,
  },
  clearBtn: {
    padding: 4,
  },
  escBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 6,
  },
  resultsScroll: {
    flexGrow: 0,
  },
  sectionTitle: {
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  itemsGroup: {
    gap: 6,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  itemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

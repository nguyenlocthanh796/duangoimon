import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
  Alert,
  Animated,
  RefreshControl,
  BackHandler,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import {
  AppText,
  useAppToast,
  AppHeader,
  BottomNavBar,
  AppOmniSearch,
  Tier1Tabs,
  Tier1TabItem,
  Tier2FilterChips,
  EmptyState,
} from '../../lib/components/ui';
import {
  useMenuItems,
  useOutOfStockProductIds,
  useCategories,
  useToppings,
  usePOSActions,
  MenuItemWithModifiers,
} from '../../lib/store/usePOSStore';
import { formatCurrency } from '../../lib/utils/format';
import { playTapSound } from '../../lib/utils/sound';
import { CategoryManagementTab, ProductFormModal, ToppingManagementTab } from './_components';

const CHIP_BAR_HEIGHT = 48;

interface SafeImageProps {
  uri?: string;
  style: any;
  resizeMode?: 'cover' | 'contain';
  fallbackIcon?: keyof typeof Icon.glyphMap;
  iconSize?: number;
}

const SafeImage: React.FC<SafeImageProps> = ({
  uri,
  style,
  resizeMode = 'cover',
  fallbackIcon = 'food',
  iconSize = 22,
}) => {
  const { theme } = useTheme();
  const [hasError, setHasError] = useState(false);

  if (!uri || hasError) {
    return <Icon name={fallbackIcon} size={iconSize} color={theme.text.muted} />;
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setHasError(true)}
    />
  );
};

export default function MenuManagementScreen() {
  const { theme, isDark } = useTheme();
  const { isWide, isDesktop, isDesktopLarge } = useResponsive();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();

  const menuItems = useMenuItems();
  const categories = useCategories();
  const toppings = useToppings();
  const outOfStockIds = useOutOfStockProductIds();
  const { toggleOutOfStock, addProduct, updateProduct, deleteProduct, reorderProducts } = usePOSActions();

  // Navigation and Search states
  const [omniSearchOpen, setOmniSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Active top tab: 'items' (Món ăn) | 'categories' (Danh mục) | 'toppings' (Topping)
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'toppings'>('items');
  const [isReorderMode, setIsReorderMode] = useState(false);

  const tabs = useMemo<Tier1TabItem<'items' | 'categories' | 'toppings'>[]>(
    () => [
      { id: 'items', label: 'Món Ăn', icon: 'food-fork-drink', badge: menuItems.length },
      { id: 'categories', label: 'Danh Mục', icon: 'shape-outline', badge: categories.length },
      { id: 'toppings', label: 'Topping', icon: 'cheese', badge: toppings.length },
    ],
    [menuItems.length, categories.length, toppings.length]
  );

  // Filter & Search state for items
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Product Form Modal state (for Add or full Edit)
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddToppingOpen, setIsAddToppingOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuItemWithModifiers | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<MenuItemWithModifiers | null>(null);

  useEffect(() => {
    if (!selectedProductDetail) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedProductDetail(null);
      return true;
    });
    return () => sub.remove();
  }, [selectedProductDetail]);

  // Pull-to-refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setTimeout(() => {
      setRefreshing(false);
      showToast({
        title: 'Đã Đồng Bộ',
        message: 'Đã làm mới thực đơn!',
        type: 'success',
      });
    }, 500);
  }, [showToast]);

  // Dynamic categories with item counts
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    menuItems.forEach((it) => {
      const cat = it.category || 'Khác';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [menuItems]);

  const categoryChips = useMemo(() => [
    { id: 'all', label: 'Tất Cả', count: menuItems.length },
    ...categories.map((cat) => ({
      id: cat.name,
      label: cat.name,
      count: menuItems.filter((i) => (i.category || 'Khác') === cat.name).length,
    })),
  ], [categories, menuItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCode = (item.code || '').toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Reorder product handlers (hoán đổi chuẩn theo filteredItems hiển thị trên màn)
  const handleMoveProductUp = (item: MenuItemWithModifiers) => {
    const fIdx = filteredItems.findIndex((m) => m.id === item.id);
    if (fIdx <= 0) return;
    const prevItem = filteredItems[fIdx - 1];

    const curIdx = menuItems.findIndex((m) => m.id === item.id);
    const prevIdx = menuItems.findIndex((m) => m.id === prevItem.id);
    if (curIdx === -1 || prevIdx === -1) return;

    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const copy = [...menuItems];
    const temp = copy[curIdx];
    copy[curIdx] = copy[prevIdx];
    copy[prevIdx] = temp;
    reorderProducts(copy);
    showToast({ title: 'Đã di chuyển', message: `Đẩy "${item.name}" lên trước`, type: 'info' });
  };

  const handleMoveProductDown = (item: MenuItemWithModifiers) => {
    const fIdx = filteredItems.findIndex((m) => m.id === item.id);
    if (fIdx < 0 || fIdx >= filteredItems.length - 1) return;
    const nextItem = filteredItems[fIdx + 1];

    const curIdx = menuItems.findIndex((m) => m.id === item.id);
    const nextIdx = menuItems.findIndex((m) => m.id === nextItem.id);
    if (curIdx === -1 || nextIdx === -1) return;

    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const copy = [...menuItems];
    const temp = copy[curIdx];
    copy[curIdx] = copy[nextIdx];
    copy[nextIdx] = temp;
    reorderProducts(copy);
    showToast({ title: 'Đã di chuyển', message: `Hạ "${item.name}" xuống`, type: 'info' });
  };

  const outOfStockCount = outOfStockIds.length;
  const availableCount = menuItems.length - outOfStockCount;

  // Toggle stock (86 toggle)
  const handleToggleStock = (item: MenuItemWithModifiers) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    toggleOutOfStock(item.id);
    const isNowOutOfStock = !outOfStockIds.includes(item.id);
    showToast({
      title: isNowOutOfStock ? 'Đã Hết Món' : 'Đang Bán',
      message: `${item.name} ${isNowOutOfStock ? 'tạm hết (86)' : 'mở bán lại'}`,
      type: isNowOutOfStock ? 'warning' : 'success',
    });
  };

  // Open form for full edit
  const handleOpenFullEdit = (item: MenuItemWithModifiers) => {
    playTapSound();
    setEditingProduct(item);
    setIsProductFormOpen(true);
  };

  // Open form to add new item
  const handleOpenAddProduct = () => {
    playTapSound();
    setEditingProduct(null);
    setIsProductFormOpen(true);
  };

  // Save product from form (Add or Edit)
  const handleSaveProduct = (product: MenuItemWithModifiers) => {
    if (editingProduct) {
      updateProduct(product.id, product);
      if (selectedProductDetail && selectedProductDetail.id === product.id) {
        setSelectedProductDetail(product);
      }
      showToast({
        title: 'Đã Cập Nhật',
        message: `Đã lưu món "${product.name}"`,
        type: 'success',
      });
    } else {
      addProduct(product);
      showToast({
        title: 'Đã Thêm Món',
        message: `Đã thêm món "${product.name}"`,
        type: 'success',
      });
    }
  };

  // Delete product
  const handleDeleteProduct = (item: MenuItemWithModifiers) => {
    playTapSound();
    const executeDelete = () => {
      deleteProduct(item.id);
      if (selectedProductDetail && selectedProductDetail.id === item.id) {
        setSelectedProductDetail(null);
      }
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      showToast({
        title: 'Đã Xóa Món',
        message: `Đã xóa "${item.name}" khỏi thực đơn`,
        type: 'success',
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Xóa món "${item.name}" khỏi thực đơn?`)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Xóa Món',
        `Xóa món "${item.name}" khỏi thực đơn?`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa Món', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };



  // Menu Health KPI metrics
  const itemsWithCost = useMemo(() => menuItems.filter((m) => m.costPrice && m.costPrice > 0), [menuItems]);
  const avgMargin = useMemo(() => {
    if (itemsWithCost.length === 0) return 0;
    const totalMargin = itemsWithCost.reduce(
      (acc, m) => acc + ((m.price - (m.costPrice || 0)) / m.price) * 100,
      0
    );
    return Math.round(totalMargin / itemsWithCost.length);
  }, [itemsWithCost]);
  const avgPrice = useMemo(() => {
    if (menuItems.length === 0) return 0;
    return Math.round(menuItems.reduce((acc, m) => acc + m.price, 0) / menuItems.length);
  }, [menuItems]);

  // 🌟 NẾU ĐANG CHỌN MÓN ĂN TRÊN MOBILE: HIỂN THỊ TRANG MỚI TOÀN MÀN HÌNH (ZERO POPUP, ZERO ACCORDION)
  if (selectedProductDetail && !isWide) {
    const isOutOfStock = outOfStockIds.includes(selectedProductDetail.id);
    const catName = categories.find((c) => c.id === selectedProductDetail.category)?.name || selectedProductDetail.category || 'Chung';

    return (
      <View style={[s.container, { backgroundColor: theme.surface.app }]}>
        <AppHeader
          title={selectedProductDetail.name}
          subtitle={`${catName} · ${selectedProductDetail.code || 'Chưa có SKU'}`}
          showBack={true}
          onBack={() => {
            playTapSound();
            setSelectedProductDetail(null);
          }}
        />

        <ScrollView
          contentContainerStyle={{ padding: isWide ? 16 : 0, paddingBottom: insets.bottom + 90, gap: isWide ? 14 : 0 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Media + Price & Status Card */}
          <View
            style={[
              s.detailCard,
              {
                backgroundColor: theme.surface.card,
                borderColor: theme.border.subtle,
                borderRadius: isWide ? 12 : 0,
                borderWidth: isWide ? 1 : 0,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border.subtle,
                paddingHorizontal: 16,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              {/* Ảnh Món Thumbnail */}
              <View
                style={[
                  s.detailImageContainer,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.default,
                  },
                ]}
              >
                <SafeImage
                  uri={selectedProductDetail.image}
                  style={s.detailImage}
                  iconSize={32}
                />
              </View>

              <View style={{ flex: 1, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <AppText variant="xs" color={theme.text.muted}>Giá bán niêm yết</AppText>
                  <View
                    style={[
                      s.statusPillLarge,
                      {
                        backgroundColor: isOutOfStock ? theme.status.dangerBg : theme.status.readyBg,
                        borderColor: isOutOfStock ? theme.brand.danger : theme.brand.success,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        gap: 4,
                      },
                    ]}
                  >
                    <Icon
                      name={isOutOfStock ? 'alert-circle-outline' : 'check-circle-outline'}
                      size={14}
                      color={isOutOfStock ? theme.brand.danger : theme.brand.success}
                    />
                    <AppText
                      variant="xs"
                      weight="bold"
                      color={isOutOfStock ? theme.brand.danger : theme.brand.success}
                    >
                      {isOutOfStock ? 'TẠM HẾT (86)' : 'ĐANG MỞ BÁN'}
                    </AppText>
                  </View>
                </View>

                <AppText
                  variant="xl"
                  weight="bold"
                  color={isOutOfStock ? theme.text.muted : theme.brand.primary}
                  tabularNums
                >
                  {formatCurrency(selectedProductDetail.price)} đ
                </AppText>
              </View>
            </View>

            {/* Bóc tách Lợi Nhuận Tài Chính (nếu có giá vốn) */}
            {selectedProductDetail.costPrice !== undefined && selectedProductDetail.costPrice > 0 ? (
              <View
                style={[
                  s.profitBreakdownBox,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.subtle,
                  },
                ]}
              >
                <View style={s.profitBreakdownCol}>
                  <AppText variant="xs" color={theme.text.muted}>Giá vốn COGS</AppText>
                  <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums>
                    {formatCurrency(selectedProductDetail.costPrice)} đ
                  </AppText>
                </View>

                <View style={s.profitBreakdownCol}>
                  <AppText variant="xs" color={theme.text.muted}>Lãi gộp ước tính</AppText>
                  <AppText variant="sm" weight="bold" color={theme.brand.primary} tabularNums>
                    {formatCurrency(selectedProductDetail.price - selectedProductDetail.costPrice)} đ
                  </AppText>
                </View>

                <View style={s.profitBreakdownCol}>
                  <AppText variant="xs" color={theme.text.muted}>Biên lợi nhuận</AppText>
                  <AppText variant="sm" weight="bold" color={theme.brand.primary} tabularNums>
                    {Math.round(((selectedProductDetail.price - selectedProductDetail.costPrice) / selectedProductDetail.price) * 100)}%
                  </AppText>
                </View>
              </View>
            ) : null}

            <View style={[s.metaGridBox, { borderTopColor: theme.border.subtle }]}>
              <View style={s.metaGridItem}>
                <AppText variant="xs" color={theme.text.muted}>Mã SKU:</AppText>
                <AppText variant="sm" weight="medium" color={theme.text.primary} tabularNums>
                  {selectedProductDetail.code || '---'}
                </AppText>
              </View>
              <View style={s.metaGridItem}>
                <AppText variant="xs" color={theme.text.muted}>Đơn vị tính:</AppText>
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  {selectedProductDetail.unit || 'Phần'}
                </AppText>
              </View>
              <View style={s.metaGridItem}>
                <AppText variant="xs" color={theme.text.muted}>Danh mục:</AppText>
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  {catName}
                </AppText>
              </View>
              <View style={s.metaGridItem}>
                <AppText variant="xs" color={theme.text.muted}>Trạm chế biến:</AppText>
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  {selectedProductDetail.station === 'bar' ? 'Quầy Bar' : selectedProductDetail.station === 'kitchen' ? 'Bếp Nóng' : 'Ăn Vặt'}
                </AppText>
              </View>
            </View>
          </View>

          {/* Sizes / Kích Cỡ */}
          {selectedProductDetail.sizes && selectedProductDetail.sizes.length > 0 && (
            <View
              style={[
                s.detailCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 12 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border.subtle,
                  paddingHorizontal: 16,
                  marginTop: isWide ? 0 : 10,
                },
              ]}
            >
              <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 8, textTransform: 'uppercase' }}>
                Tùy Chọn Kích Cỡ ({selectedProductDetail.sizes.length})
              </AppText>
              <View style={{ gap: 6 }}>
                {selectedProductDetail.sizes.map((sz, idx) => (
                  <View key={idx} style={[s.fullPageItemRow, { borderBottomColor: theme.border.subtle }]}>
                    <AppText variant="sm" weight="medium" color={theme.text.primary}>
                      Size {sz.name}
                    </AppText>
                    <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                      {sz.priceDelta > 0 ? `+${formatCurrency(sz.priceDelta)} đ` : 'Mặc định (0đ)'}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Toppings / Món Kèm */}
          {selectedProductDetail.toppings && selectedProductDetail.toppings.length > 0 && (
            <View
              style={[
                s.detailCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 12 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border.subtle,
                  paddingHorizontal: 16,
                  marginTop: isWide ? 0 : 10,
                },
              ]}
            >
              <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 8, textTransform: 'uppercase' }}>
                Topping Kèm Theo ({selectedProductDetail.toppings.length})
              </AppText>
              <View style={{ gap: 6 }}>
                {selectedProductDetail.toppings.map((top, idx) => (
                  <View key={idx} style={[s.fullPageItemRow, { borderBottomColor: theme.border.subtle }]}>
                    <AppText variant="sm" color={theme.text.primary}>
                      {top.name}
                    </AppText>
                    <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                      +{formatCurrency(top.priceDelta)} đ
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Quick Link to Recipe Book & SOP */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setSelectedProductDetail(null);
              router.push('/so-cong-thuc' as any);
            }}
            style={[
              s.detailCard,
              {
                backgroundColor: theme.status.warningBg,
                borderColor: theme.brand.accent,
                borderRadius: isWide ? 12 : 0,
                borderWidth: isWide ? 1 : 0,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.border.subtle,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginTop: isWide ? 0 : 10,
              },
            ]}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: theme.brand.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="book-open-page-variant" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={theme.brand.accent}>
                Xem Sổ Công Thức & SOP Pha Chế
              </AppText>
              <AppText variant="xxs" color={theme.text.muted}>
                Bảng định lượng nguyên liệu, giá vốn (COGS) & quy trình nấu
              </AppText>
            </View>
            <Icon name="chevron-right" size={20} color={theme.brand.accent} />
          </TouchableOpacity>
        </ScrollView>

        {/* Thanh Tác Vụ Đáy Cố Định */}
        <View
          style={[
            s.fullPageBottomBar,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.subtle,
              paddingBottom: Math.max(insets.bottom, 12),
              maxWidth: isWide ? 680 : undefined,
              alignSelf: isWide ? 'center' : undefined,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              const item = selectedProductDetail;
              setSelectedProductDetail(null);
              handleDeleteProduct(item);
            }}
            style={[s.fullPageBtnAction, { backgroundColor: theme.status.dangerBg, borderColor: theme.brand.danger, flex: 1 }]}
          >
            <Icon name="trash-can-outline" size={16} color={theme.brand.danger} />
            <AppText variant="sm" weight="bold" color={theme.brand.danger} numberOfLines={1}>
              Xóa Món
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              handleToggleStock(selectedProductDetail);
            }}
            style={[
              s.fullPageBtnAction,
              {
                backgroundColor: isOutOfStock ? theme.status.readyBg : theme.surface.header,
                borderColor: isOutOfStock ? theme.brand.success : theme.border.subtle,
                flex: 1,
              },
            ]}
          >
            <Icon
              name={isOutOfStock ? 'check-circle' : 'close-circle'}
              size={16}
              color={isOutOfStock ? theme.brand.success : theme.brand.danger}
            />
            <AppText variant="sm" weight="bold" color={isOutOfStock ? theme.brand.success : theme.brand.danger} numberOfLines={1}>
              {isOutOfStock ? 'Mở Bán' : 'Báo Hết'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              const item = selectedProductDetail;
              setSelectedProductDetail(null);
              handleOpenFullEdit(item);
            }}
            style={[s.fullPageBtnAction, { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary, flex: 1 }]}
          >
            <Icon name="pencil" size={16} color={theme.text.onBrand} />
            <AppText variant="sm" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
              Sửa Món
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Menu Health KPI Bar (Chỉ số quản trị thực đơn chuẩn Vị Chủ Quán)
  const renderMenuKPIBar = () => {
    return (
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: theme.surface.card,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border.subtle,
          gap: 12,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: theme.surface.header,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.border.subtle,
          }}
        >
          <AppText variant="xxs" color={theme.text.muted} weight="medium">
            TỔNG MÓN ĂN
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
              {menuItems.length}
            </AppText>
            <AppText variant="xs" color={theme.text.muted} tabularNums>
              ({categories.length} nhóm)
            </AppText>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: theme.surface.header,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.border.subtle,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.brand.success }} />
            <AppText variant="xxs" color={theme.text.muted} weight="medium">
              ĐANG MỞ BÁN
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
            <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
              {availableCount}
            </AppText>
            <AppText variant="xs" color={theme.text.muted} tabularNums>
              ({menuItems.length > 0 ? Math.round((availableCount / menuItems.length) * 100) : 0}%)
            </AppText>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: theme.surface.header,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.border.subtle,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.brand.danger }} />
            <AppText variant="xxs" color={theme.text.muted} weight="medium">
              TẠM HẾT (86)
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
            <AppText variant="md" weight="bold" color={outOfStockCount > 0 ? theme.brand.danger : theme.text.muted} tabularNums>
              {outOfStockCount}
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              món
            </AppText>
          </View>
        </View>

        <View
          style={{
            flex: 1,
            backgroundColor: theme.surface.header,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.border.subtle,
          }}
        >
          <AppText variant="xxs" color={theme.text.muted} weight="medium">
            LÃI GỘP TRUNG BÌNH
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
            <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
              ~{avgMargin}%
            </AppText>
            <AppText variant="xs" color={theme.text.muted} tabularNums>
              ({itemsWithCost.length}/{menuItems.length} có COGS)
            </AppText>
          </View>
        </View>
      </View>
    );
  };

  // Sticky Detail Panel trên màn hình rộng Desktop
  const renderWideDetailPanel = (item: MenuItemWithModifiers) => {
    const isOutOfStock = outOfStockIds.includes(item.id);
    const catName = categories.find((c) => c.id === item.category)?.name || item.category || 'Chung';

    return (
      <View style={{ flex: 1, backgroundColor: theme.surface.card }}>
        {/* Panel Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
            backgroundColor: theme.surface.header,
          }}
        >
          <View style={{ flex: 1, marginRight: 8 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
              {item.name}
            </AppText>
            <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
              {catName} · SKU: {item.code || 'Chưa cài'}
            </AppText>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              setSelectedProductDetail(null);
            }}
            style={[s.iconHeaderBtn, { borderColor: theme.border.subtle }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close" size={18} color={theme.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Panel Scroll Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Thumbnail + Price & Status Card */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              backgroundColor: theme.surface.header,
              borderRadius: 12,
              padding: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border.subtle,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 10,
                overflow: 'hidden',
                backgroundColor: theme.surface.card,
                borderColor: theme.border.subtle,
                borderWidth: StyleSheet.hairlineWidth,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SafeImage uri={item.image} style={{ width: '100%', height: '100%' }} iconSize={28} />
            </View>

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <AppText variant="xs" color={theme.text.muted}>
                  Giá niêm yết
                </AppText>
                <View
                  style={{
                    backgroundColor: isOutOfStock ? theme.status.dangerBg : theme.status.readyBg,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Icon
                    name={isOutOfStock ? 'alert-circle-outline' : 'check-circle-outline'}
                    size={12}
                    color={isOutOfStock ? theme.brand.danger : theme.brand.success}
                  />
                  <AppText
                    variant="xxs"
                    weight="bold"
                    color={isOutOfStock ? theme.brand.danger : theme.brand.success}
                  >
                    {isOutOfStock ? 'HẾT MÓN (86)' : 'ĐANG BÁN'}
                  </AppText>
                </View>
              </View>

              <AppText
                variant="xl"
                weight="bold"
                color={isOutOfStock ? theme.text.muted : theme.brand.accent}
                tabularNums
              >
                {formatCurrency(item.price)} đ
              </AppText>
            </View>
          </View>

          {/* Profit Breakdown (if cost price exists) */}
          {item.costPrice !== undefined && item.costPrice > 0 ? (
            <View
              style={{
                backgroundColor: theme.surface.header,
                borderRadius: 12,
                padding: 12,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border.subtle,
              }}
            >
              <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 8, textTransform: 'uppercase' }}>
                Phân Tích Lợi Nhuận (COGS)
              </AppText>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <AppText variant="xs" color={theme.text.muted}>Giá vốn ước tính:</AppText>
                <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>
                  {formatCurrency(item.costPrice)} đ
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <AppText variant="xs" color={theme.text.muted}>Lãi gộp trên đơn vị:</AppText>
                <AppText variant="xs" weight="bold" color={theme.brand.primary} tabularNums>
                  {formatCurrency(item.price - item.costPrice)} đ
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="xs" color={theme.text.muted}>Biên lợi nhuận gộp:</AppText>
                <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>
                  {Math.round(((item.price - item.costPrice) / item.price) * 100)}%
                </AppText>
              </View>
            </View>
          ) : null}

          {/* Configuration Metadata */}
          <View
            style={{
              backgroundColor: theme.surface.header,
              borderRadius: 12,
              padding: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border.subtle,
              gap: 8,
            }}
          >
            <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ textTransform: 'uppercase' }}>
              Thông Tin Chi Tiết
            </AppText>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="xs" color={theme.text.muted}>Mã SKU:</AppText>
              <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>
                {item.code || '---'}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="xs" color={theme.text.muted}>Đơn vị tính:</AppText>
              <AppText variant="xs" weight="medium" color={theme.text.primary}>
                {item.unit || 'Phần / Ly'}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="xs" color={theme.text.muted}>Danh mục:</AppText>
              <AppText variant="xs" weight="medium" color={theme.text.primary}>
                {catName}
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="xs" color={theme.text.muted}>Trạm chế biến:</AppText>
              <AppText variant="xs" weight="medium" color={theme.text.primary}>
                {item.station === 'bar' ? 'Quầy Bar' : item.station === 'kitchen' ? 'Bếp Nóng' : 'Ăn Vặt'}
              </AppText>
            </View>
          </View>

          {/* Sizes / Kích cỡ */}
          {item.sizes && item.sizes.length > 0 && (
            <View
              style={{
                backgroundColor: theme.surface.header,
                borderRadius: 12,
                padding: 12,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border.subtle,
              }}
            >
              <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 8, textTransform: 'uppercase' }}>
                Kích Cỡ ({item.sizes.length})
              </AppText>
              <View style={{ gap: 6 }}>
                {item.sizes.map((sz, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="xs" color={theme.text.primary}>Size {sz.name}</AppText>
                    <AppText variant="xs" weight="bold" color={theme.brand.primary} tabularNums>
                      {sz.priceDelta > 0 ? `+${formatCurrency(sz.priceDelta)} đ` : 'Mặc định (0đ)'}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Toppings / Món kèm */}
          {item.toppings && item.toppings.length > 0 && (
            <View
              style={{
                backgroundColor: theme.surface.header,
                borderRadius: 12,
                padding: 12,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border.subtle,
              }}
            >
              <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 8, textTransform: 'uppercase' }}>
                Topping / Món Kèm ({item.toppings.length})
              </AppText>
              <View style={{ gap: 6 }}>
                {item.toppings.map((top, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="xs" color={theme.text.primary}>{top.name}</AppText>
                    <AppText variant="xs" weight="bold" color={theme.brand.primary} tabularNums>
                      +{formatCurrency(top.priceDelta)} đ
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Quick link to SOP */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              router.push('/so-cong-thuc' as any);
            }}
            style={{
              backgroundColor: theme.status.warningBg,
              borderColor: theme.brand.accent,
              borderRadius: 12,
              borderWidth: 1,
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              gap: 10,
            }}
          >
            <Icon name="book-open-page-variant" size={20} color={theme.brand.accent} />
            <View style={{ flex: 1 }}>
              <AppText variant="xs" weight="bold" color={theme.brand.accent}>
                Sổ Công Thức & SOP
              </AppText>
              <AppText variant="xxs" color={theme.text.muted}>
                Định lượng nguyên liệu & quy trình pha chế
              </AppText>
            </View>
            <Icon name="chevron-right" size={16} color={theme.brand.accent} />
          </TouchableOpacity>
        </ScrollView>

        {/* Panel Sticky Bottom Action Dock */}
        <View
          style={{
            flexDirection: 'row',
            padding: 12,
            gap: 8,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.border.subtle,
            backgroundColor: theme.surface.card,
          }}
        >
          {/* Nút Xóa */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleDeleteProduct(item)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.brand.danger,
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="trash-can-outline" size={18} color={theme.brand.danger} />
          </TouchableOpacity>

          {/* Nút Báo Hết / Mở Bán */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleToggleStock(item)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: isOutOfStock ? theme.brand.success : theme.brand.danger,
              backgroundColor: isOutOfStock
                ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#F0FDF4')
                : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2'),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Icon
              name={isOutOfStock ? 'check-circle-outline' : 'close-circle-outline'}
              size={16}
              color={isOutOfStock ? theme.brand.success : theme.brand.danger}
            />
            <AppText
              variant="xs"
              weight="bold"
              color={isOutOfStock ? theme.brand.success : theme.brand.danger}
            >
              {isOutOfStock ? 'Mở Bán Lại' : 'Báo Hết (86)'}
            </AppText>
          </TouchableOpacity>

          {/* Nút Sửa Món */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleOpenFullEdit(item)}
            style={{
              flex: 1.2,
              height: 44,
              borderRadius: 10,
              backgroundColor: theme.brand.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Icon name="pencil" size={16} color={theme.text.onBrand} />
            <AppText variant="xs" weight="bold" color={theme.text.onBrand}>
              Sửa Món
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Right Panel: Tổng quan sức khỏe thực đơn khi chưa chọn món
  const renderWideMenuHealthPanel = () => {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface.card }}>
        {/* Panel Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border.subtle,
            backgroundColor: theme.surface.header,
          }}
        >
          <Icon name="silverware-fork-knife" size={20} color={theme.brand.accent} />
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Tổng Quan Thực Đơn
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              {menuItems.length} món trong hệ thống
            </AppText>
          </View>
        </View>

        {/* Panel Scroll Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Tip Callout */}
          <View
            style={{
              backgroundColor: isDark ? 'rgba(180, 83, 9, 0.15)' : '#FFFBEB',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.brand.accent,
              padding: 12,
              flexDirection: 'row',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <Icon name="cursor-default-click-outline" size={20} color={theme.brand.accent} />
            <AppText variant="xs" color={theme.brand.accent} style={{ flex: 1 }}>
              Chạm vào bất kỳ món nào bên trái để xem nhanh giá vốn, biên lãi và thao tác chỉnh sửa.
            </AppText>
          </View>

          {/* Category Distribution Breakdown */}
          <View
            style={{
              backgroundColor: theme.surface.header,
              borderRadius: 12,
              padding: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border.subtle,
              gap: 10,
            }}
          >
            <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ textTransform: 'uppercase' }}>
              Cơ Cấu Nhóm Món ({categories.length} Nhóm)
            </AppText>

            {categories.map((cat) => {
              const count = menuItems.filter((m) => m.category === cat.name || m.category === cat.id).length;
              const pct = menuItems.length > 0 ? Math.round((count / menuItems.length) * 100) : 0;
              return (
                <View key={cat.id} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="xs" weight="medium" color={theme.text.primary}>
                      {cat.name}
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted} tabularNums>
                      {count} món ({pct}%)
                    </AppText>
                  </View>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: theme.border.subtle,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: theme.brand.primary,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Quick Operations Summary */}
          <View
            style={{
              backgroundColor: theme.surface.header,
              borderRadius: 12,
              padding: 14,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border.subtle,
              gap: 8,
            }}
          >
            <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ textTransform: 'uppercase' }}>
              Chất Lượng Dữ Liệu Thực Đơn
            </AppText>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="xs" color={theme.text.muted}>Món có ảnh chụp:</AppText>
              <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>
                {menuItems.filter((m) => !!m.image).length}/{menuItems.length} món
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="xs" color={theme.text.muted}>Món có giá vốn (COGS):</AppText>
              <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>
                {itemsWithCost.length}/{menuItems.length} món
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="xs" color={theme.text.muted}>Giá bán trung bình:</AppText>
              <AppText variant="xs" weight="bold" color={theme.brand.primary} tabularNums>
                {formatCurrency(avgPrice)} đ
              </AppText>
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View
          style={{
            padding: 12,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.border.subtle,
            backgroundColor: theme.surface.card,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setEditingProduct(null);
              setIsProductFormOpen(true);
            }}
            style={{
              height: 44,
              borderRadius: 10,
              backgroundColor: theme.brand.accent,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="plus" size={18} color={theme.text.onBrand} />
            <AppText variant="md" weight="bold" color={theme.text.onBrand}>
              Thêm Món Mới
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* Top Header: Hamburger Drawer + Tiêu đề + Tìm Kiếm + Sắp Xếp + Thêm Nhanh theo Tab (Chuẩn Apple HIG) */}
      <AppHeader
        title="Thực Đơn"
        subtitle={
          activeTab === 'categories'
            ? `${categories.length} nhóm danh mục món`
            : activeTab === 'toppings'
            ? `${toppings.length} loại topping & món kèm`
            : `${menuItems.length} món · ${outOfStockCount > 0 ? `${outOfStockCount} tạm hết (86)` : 'Đang bán tốt'}`
        }
        showSearch
        onOpenSearch={() => setOmniSearchOpen(true)}
        rightCustom={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Nút Sắp Xếp (Reorder Toggle) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                setIsReorderMode((prev) => !prev);
              }}
              accessibilityRole="button"
              accessibilityLabel={isReorderMode ? 'Xong sắp xếp' : 'Bật sắp xếp thứ tự'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                s.iconHeaderBtn,
                {
                  backgroundColor: isReorderMode ? theme.brand.warning : theme.surface.header,
                  borderColor: isReorderMode ? theme.brand.warning : theme.border.default,
                },
              ]}
            >
              <Icon
                name={isReorderMode ? 'check' : 'swap-vertical'}
                size={20}
                color={isReorderMode ? theme.text.onBrand : theme.text.primary}
              />
            </TouchableOpacity>

            {/* Nút Thêm Mới Động Theo Tab Hiện Tại */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                if (activeTab === 'categories') {
                  setIsAddCategoryOpen(true);
                } else if (activeTab === 'toppings') {
                  setIsAddToppingOpen(true);
                } else {
                  handleOpenAddProduct();
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={
                activeTab === 'categories'
                  ? 'Thêm danh mục mới'
                  : activeTab === 'toppings'
                  ? 'Thêm topping mới'
                  : 'Thêm món mới'
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                s.addHeaderBtn,
                {
                  backgroundColor: theme.brand.primary,
                },
              ]}
            >
              <Icon name="plus" size={18} color={theme.text.onBrand} />
              {isWide && (
                <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                  {activeTab === 'categories'
                    ? 'Thêm Nhóm'
                    : activeTab === 'toppings'
                    ? 'Thêm Topping'
                    : 'Thêm Món'}
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      {/* 🌟 DÃY 1: PRIMARY UNDERLINE TAB BAR (Cấp 1 - Underline Tabs 46px chuẩn Invariant 3.13) */}
      <Tier1Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        backgroundColor={theme.status.warningBg}
      />

      {/* 🌟 DÃY 2: SECONDARY JADE CAPSULE FILTER BAR */}
      {activeTab === 'items' && (
        <Tier2FilterChips
          chips={categoryChips}
          activeChip={selectedCategory}
          onChipChange={setSelectedCategory}
          activeColor="primary"
        />
      )}

      {/* BODY CONTENT DEPENDING ON ACTIVE TAB */}
      {activeTab === 'categories' ? (
        <View style={{ flex: 1 }}>
          <CategoryManagementTab
            isWide={isWide}
            isReorderMode={isReorderMode}
            isAddOpen={isAddCategoryOpen}
            onAddClose={() => setIsAddCategoryOpen(false)}
          />
        </View>
      ) : activeTab === 'toppings' ? (
        <View style={{ flex: 1 }}>
          <ToppingManagementTab
            isWide={isWide}
            isReorderMode={isReorderMode}
            isAddOpen={isAddToppingOpen}
            onAddClose={() => setIsAddToppingOpen(false)}
          />
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column' }}>
          {/* CỘT TRÁI: MASTER LIST (FLEX: 1) */}
          <View style={{ flex: 1, borderRightWidth: isWide ? 1 : 0, borderRightColor: theme.border.subtle }}>
            {/* Menu KPI Summary Bar on Wide */}
            {isWide && renderMenuKPIBar()}

            {/* Menu Items List with Pull-to-Refresh */}
          <Animated.ScrollView
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.brand.primary]}
                tintColor={theme.brand.primary}
              />
            }
            contentContainerStyle={[
              s.listScroll,
              {
                padding: isWide ? 16 : 0,
                gap: isWide ? 12 : 0,
                paddingTop: isWide ? 16 : 0,
                paddingBottom: isWide ? 24 : 90 + insets.bottom,
              },
              isWide && { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Banner Thông Báo Đang Bật Chế Độ Sắp Xếp */}
            {isReorderMode && (
              <View
                style={[
                  s.reorderBanner,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
                    borderColor: theme.brand.warning,
                    width: isWide ? '100%' : undefined,
                  },
                ]}
              >
                <Icon name="swap-vertical" size={18} color={theme.brand.warning} />
                <AppText variant="xs" weight="medium" color={theme.brand.warning} style={{ flex: 1 }}>
                  Chế độ sắp xếp: Chạm mũi tên ↑ ↓ để đổi thứ tự hiển thị món
                </AppText>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    setIsReorderMode(false);
                  }}
                  style={[s.btnDoneReorder, { backgroundColor: theme.brand.warning }]}
                >
                  <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                    Xong
                  </AppText>
                </TouchableOpacity>
              </View>
            )}

            {/* Empty State */}
            {filteredItems.length === 0 ? (
              <EmptyState
                icon="food-off"
                message="Không tìm thấy món nào"
                description="Thử đổi danh mục hoặc bấm Thêm Món mới."
              />
            ) : (
              /* Flat Seamless Product Rows (2-Line Layout) */
              filteredItems.map((item) => {
                const isOutOfStock = outOfStockIds.includes(item.id);
                const isSelected = isWide && selectedProductDetail?.id === item.id;
                const itemIndex = menuItems.findIndex((m) => m.id === item.id);
                const isFirstItem = itemIndex <= 0;
                const isLastItem = itemIndex >= menuItems.length - 1;

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isReorderMode) return;
                      playTapSound();
                      setSelectedProductDetail(item);
                    }}
                    style={[
                      s.productRow,
                      isWide && {
                        width: isDesktopLarge ? '31.8%' : '48.8%',
                        borderRadius: 12,
                        borderWidth: isSelected ? 2 : 1,
                      },
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(180, 83, 9, 0.12)' : '#FFFBEB')
                          : theme.surface.card,
                        borderBottomColor: theme.border.subtle,
                        borderColor: isSelected
                          ? theme.brand.accent
                          : (isWide ? theme.border.subtle : undefined),
                      },
                    ]}
                  >
                    {isReorderMode ? (
                      /* Reorder Mode: Thumbnail + Tên món + Giá + Nút Lên/Xuống */
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[s.reorderThumbBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
                          <SafeImage uri={item.image} style={s.reorderThumb} iconSize={18} />
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText
                              variant="md"
                              weight="normal"
                              color={isOutOfStock ? theme.text.muted : theme.text.primary}
                              numberOfLines={1}
                              style={[isOutOfStock ? s.strikeThrough : undefined, { flexShrink: 1 }]}
                            >
                              {item.name}
                            </AppText>
                            {item.unit ? (
                              <AppText variant="xs" color={theme.text.muted}>
                                ({item.unit})
                              </AppText>
                            ) : null}
                          </View>
                          <AppText
                            variant="md"
                            weight="medium"
                            color={isOutOfStock ? theme.text.muted : theme.text.primary}
                            tabularNums
                          >
                            {formatCurrency(item.price)} đ {item.code ? `· ${item.code}` : ''}
                          </AppText>
                        </View>

                        <View style={s.reorderGroup}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            disabled={isFirstItem}
                            onPress={() => handleMoveProductUp(item)}
                            style={[
                              s.reorderBtn,
                              {
                                backgroundColor: theme.surface.header,
                                opacity: isFirstItem ? 0.35 : 1,
                              },
                            ]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Đẩy món lên"
                          >
                            <Icon
                              name="chevron-up"
                              size={16}
                              color={isFirstItem ? theme.text.muted : theme.text.primary}
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.7}
                            disabled={isLastItem}
                            onPress={() => handleMoveProductDown(item)}
                            style={[
                              s.reorderBtn,
                              {
                                backgroundColor: theme.surface.header,
                                opacity: isLastItem ? 0.35 : 1,
                              },
                            ]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Hạ món xuống"
                          >
                            <Icon
                              name="chevron-down"
                              size={16}
                              color={isLastItem ? theme.text.muted : theme.text.primary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : isWide ? (
                      /* Web / Tablet Layout Card (isWide) */
                      <View style={s.wideRowContent}>
                        {/* Thumbnail */}
                        <View style={[s.wideThumbBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
                          <SafeImage uri={item.image} style={s.wideThumb} iconSize={24} />
                        </View>

                        {/* Middle Info */}
                        <View style={s.wideMiddleCol}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <AppText
                              variant="md"
                              weight="medium"
                              color={isOutOfStock ? theme.text.muted : theme.text.primary}
                              numberOfLines={1}
                              style={[isOutOfStock ? s.strikeThrough : undefined]}
                            >
                              {item.name}
                            </AppText>
                            {item.unit ? (
                              <AppText variant="xs" color={theme.text.muted}>
                                ({item.unit})
                              </AppText>
                            ) : null}
                            <View style={[s.catPillMini, { backgroundColor: theme.surface.header }]}>
                              <AppText variant="xxs" color={theme.text.muted}>
                                {item.category || 'Chung'}
                              </AppText>
                            </View>
                            {isOutOfStock && (
                              <View style={[s.outOfStockBadge, { backgroundColor: theme.status.dangerBg }]}>
                                <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                                  Hết món
                                </AppText>
                              </View>
                            )}
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            {item.code ? (
                              <AppText variant="xs" color={theme.text.muted} tabularNums>
                                SKU: {item.code}
                              </AppText>
                            ) : null}
                            {item.costPrice && item.costPrice > 0 ? (
                              <AppText variant="xxs" color={theme.text.muted} tabularNums>
                                Vốn: {formatCurrency(item.costPrice)}đ
                              </AppText>
                            ) : null}
                            {item.costPrice && item.costPrice > 0 && item.price > item.costPrice ? (
                              <View style={[s.marginBadgeMini, { backgroundColor: theme.status.readyBg }]}>
                                <AppText variant="xxs" weight="medium" color={theme.brand.success} tabularNums>
                                  Lãi {Math.round(((item.price - item.costPrice) / item.price) * 100)}%
                                </AppText>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        {/* Right: Price & Quick Actions */}
                        <View style={s.wideRightCol}>
                          <AppText
                            variant="md"
                            weight="medium"
                            color={isOutOfStock ? theme.text.muted : theme.text.primary}
                            tabularNums
                            style={isOutOfStock ? s.strikeThrough : undefined}
                          >
                            {formatCurrency(item.price)} đ
                          </AppText>

                          <View style={s.switchWrapper}>
                            <Switch
                              value={!isOutOfStock}
                              onValueChange={() => handleToggleStock(item)}
                              trackColor={{ false: theme.border.default, true: theme.brand.primary }}
                              thumbColor={theme.text.onBrand}
                              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                            />
                          </View>

                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleOpenFullEdit(item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Chỉnh sửa món ${item.name}`}
                            style={[s.quickActionBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Icon name="pencil" size={16} color={theme.text.primary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      /* Mobile Layout Row (Flat Seamless with 44x44 Thumbnail) */
                      <View style={s.compactRowContent}>
                        {/* Thumbnail */}
                        <View style={[s.mobileThumbBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
                          <SafeImage uri={item.image} style={s.mobileThumb} iconSize={20} />
                        </View>

                        <View style={s.compactLeftCol}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText
                              variant="md"
                              weight="normal"
                              color={isOutOfStock ? theme.text.muted : theme.text.primary}
                              numberOfLines={2}
                              style={[isOutOfStock ? s.strikeThrough : undefined, { flexShrink: 1 }]}
                            >
                              {item.name}
                            </AppText>
                            {isOutOfStock && (
                              <View style={[s.outOfStockBadge, { backgroundColor: theme.status.dangerBg }]}>
                                <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                                  Hết
                                </AppText>
                              </View>
                            )}
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <AppText
                              variant="md"
                              weight="medium"
                              color={isOutOfStock ? theme.text.muted : theme.text.primary}
                              tabularNums
                              style={isOutOfStock ? s.strikeThrough : undefined}
                            >
                              {formatCurrency(item.price)} đ
                            </AppText>
                            {item.code ? (
                              <AppText variant="xs" color={theme.text.muted} tabularNums>
                                · SKU: {item.code}
                              </AppText>
                            ) : null}
                            {item.unit ? (
                              <AppText variant="xs" color={theme.text.muted}>
                                · ĐVT: {item.unit}
                              </AppText>
                            ) : null}
                          </View>
                        </View>

                        <View style={s.compactRightCol}>
                          <View style={s.switchWrapper}>
                            <Switch
                              value={!isOutOfStock}
                              onValueChange={() => handleToggleStock(item)}
                              trackColor={{ false: theme.border.default, true: theme.brand.primary }}
                              thumbColor={theme.text.onBrand}
                              style={{ transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }] }}
                            />
                          </View>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.ScrollView>
          </View>

          {/* CỘT PHẢI: STICKY DETAIL PANEL ON WIDE (WIDTH: 400) */}
          {isWide && (
            <View
              style={{
                width: 400,
                backgroundColor: theme.surface.card,
                borderLeftWidth: 1,
                borderLeftColor: theme.border.subtle,
              }}
            >
              {selectedProductDetail ? (
                renderWideDetailPanel(selectedProductDetail)
              ) : (
                renderWideMenuHealthPanel()
              )}
            </View>
          )}
        </View>
      )}

      {/* Spotlight Command Palette (AppOmniSearch) */}
      <AppOmniSearch
        visible={omniSearchOpen}
        onClose={() => setOmniSearchOpen(false)}
        scope="thuc-don"
        onSelectMenuItem={(item) => {
          handleOpenFullEdit(item);
        }}
      />

      
      {/* Product Form Modal (Add or Full Edit - Full Screen) */}
      <ProductFormModal
        visible={isProductFormOpen}
        itemToEdit={editingProduct}
        onClose={() => setIsProductFormOpen(false)}
        onSave={handleSaveProduct}
        onDelete={handleDeleteProduct}
      />

      {/* 🌟 SMART BOTTOM NAVBAR ON MOBILE */}
      {!isWide && !isProductFormOpen && !selectedProductDetail && (
        <BottomNavBar activeTab="pos" />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabs: {
    flexDirection: 'row',
    height: 44,
  },
  segmentTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  reorderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  btnDoneReorder: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
  },
  secondaryFilterBar: {
    minHeight: 54,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  chipsScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  chipPill: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideFilterBar: {
    paddingVertical: 6,
  },
  listScroll: {
    paddingBottom: 40,
  },
  productRow: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compactRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  compactLeftCol: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  compactRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 26,
  },
  rowTopLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
    minWidth: 0,
  },
  outOfStockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rowBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    minHeight: 28,
  },
  rowBottomLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reorderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reorderBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
    opacity: 0.55,
  },
  expandedProductBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  expandedMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  expandedMetaItem: {
    width: '48%',
    gap: 2,
  },
  miniTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  expandedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  expandedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    minHeight: 40,
  },

  detailCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  statusPillLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaGridBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaGridItem: {
    width: '47%',
    flexDirection: 'column',
    gap: 2,
  },
  fullPageItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fullPageBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fullPageBtnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
  },
  detailImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  profitBreakdownBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  profitBreakdownCol: {
    alignItems: 'center',
    gap: 2,
  },
  wideRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  wideThumbBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideThumb: {
    width: '100%',
    height: '100%',
  },
  wideMiddleCol: {
    flex: 1,
    minWidth: 0,
  },
  catPillMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  marginBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  wideRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileThumbBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  mobileThumb: {
    width: '100%',
    height: '100%',
  },
  reorderThumbBox: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderThumb: {
    width: '100%',
    height: '100%',
  },
});

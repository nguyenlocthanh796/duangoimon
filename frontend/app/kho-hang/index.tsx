import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  Alert,
  Animated,
  RefreshControl,
  BackHandler,
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
  Tier1Tabs,
  Tier1TabItem,
  EmptyState,
  StatusDotBadge,
  AppModal,
} from '../../lib/components/ui';
import {
  useInventoryItems,
  usePOSActions,
  InventoryItem,
} from '../../lib/store/usePOSStore';
import { formatCurrency } from '../../lib/utils/format';
import { playTapSound } from '../../lib/utils/sound';

type InventoryCategoryFilter = 'all' | 'low_stock' | 'nguyen_lieu' | 'dong_goi' | 'hang_hoa_ban_ngay';

export default function InventoryScreen() {
  const { theme, isDark } = useTheme();
  const { isWide, isDesktopLarge } = useResponsive();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();

  const inventoryItems = useInventoryItems();
  const {
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    restockInventoryItem,
    adjustStock,
  } = usePOSActions();

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modals & Sub-screens
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockQtyStr, setRestockQtyStr] = useState('1');
  const [restockTotalCostStr, setRestockTotalCostStr] = useState('');
  const [paymentSource, setPaymentSource] = useState<'cash' | 'bank'>('cash');

  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustQtyStr, setAdjustQtyStr] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  // Item Form state
  const [itemFormVisible, setItemFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<InventoryItem | null>(null);

  // Form Fields
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'nguyen_lieu' | 'dong_goi' | 'hang_hoa_ban_ngay'>('nguyen_lieu');
  const [formUnit, setFormUnit] = useState('kg');
  const [formCurrentStock, setFormCurrentStock] = useState('10');
  const [formMinStockAlert, setFormMinStockAlert] = useState('5');
  const [formCostPrice, setFormCostPrice] = useState('50000');
  const [formSupplier, setFormSupplier] = useState('');

  const formScrollRef = React.useRef<ScrollView>(null);

  // Physical Back Button handler for Android sub-screens & Scroll reset
  useEffect(() => {
    if (itemFormVisible) {
      setTimeout(() => {
        formScrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
    }
  }, [itemFormVisible]);

  useEffect(() => {
    if (!selectedItemDetail && !itemFormVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (itemFormVisible) {
        setItemFormVisible(false);
        return true;
      }
      if (selectedItemDetail) {
        setSelectedItemDetail(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selectedItemDetail, itemFormVisible]);

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
      showToast({ title: 'Đã Đồng Bộ', message: 'Dữ liệu tồn kho mới nhất!', type: 'success' });
    }, 400);
  }, [showToast]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (selectedCategory === 'low_stock') {
        if (item.currentStock > item.minStockAlert) return false;
      } else if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchSupplier = (item.supplierName || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchSupplier) return false;
      }
      return true;
    });
  }, [inventoryItems, selectedCategory, searchQuery]);

  // KPI Calculations
  const lowStockItems = useMemo(() => {
    return inventoryItems.filter((i) => i.currentStock <= i.minStockAlert);
  }, [inventoryItems]);

  const totalInventoryValue = useMemo(() => {
    return inventoryItems.reduce((sum, i) => sum + i.currentStock * i.costPrice, 0);
  }, [inventoryItems]);

  const nguyenLieuCount = useMemo(() => inventoryItems.filter(i => i.category === 'nguyen_lieu').length, [inventoryItems]);
  const dongGoiCount = useMemo(() => inventoryItems.filter(i => i.category === 'dong_goi').length, [inventoryItems]);
  const banLienCount = useMemo(() => inventoryItems.filter(i => i.category === 'hang_hoa_ban_ngay').length, [inventoryItems]);

  const categoryTabs = useMemo<Tier1TabItem<InventoryCategoryFilter>[]>(() => {
    const list: Tier1TabItem<InventoryCategoryFilter>[] = [
      { id: 'all', label: 'Tất Cả', icon: 'package-variant-closed', badge: inventoryItems.length },
    ];
    if (lowStockItems.length > 0) {
      list.push({ id: 'low_stock', label: 'Sắp Hết', icon: 'alert-circle-outline', badge: lowStockItems.length });
    }
    list.push(
      { id: 'nguyen_lieu', label: 'Nguyên Liệu', icon: 'food-apple-outline', badge: nguyenLieuCount },
      { id: 'dong_goi', label: 'Bao Bì', icon: 'cube-outline', badge: dongGoiCount },
      { id: 'hang_hoa_ban_ngay', label: 'Bán Liền', icon: 'tag-outline', badge: banLienCount },
    );
    return list;
  }, [inventoryItems.length, lowStockItems.length, nguyenLieuCount, dongGoiCount, banLienCount]);

  const handleAutoGenerateSku = (cat: 'nguyen_lieu' | 'dong_goi' | 'hang_hoa_ban_ngay') => {
    playTapSound();
    const prefix = cat === 'nguyen_lieu' ? 'NL' : cat === 'dong_goi' ? 'BG' : 'BL';
    const rand = Math.floor(100 + Math.random() * 900);
    setFormSku(`${prefix}-${rand}`);
  };

  // Open Form Handlers
  const handleOpenAdd = () => {
    playTapSound();
    setEditingItem(null);
    setFormSku(`NL-${Math.floor(100 + Math.random() * 900)}`);
    setFormName('');
    setFormCategory('nguyen_lieu');
    setFormUnit('kg');
    setFormCurrentStock('10');
    setFormMinStockAlert('3');
    setFormCostPrice('50000');
    setFormSupplier('');
    setItemFormVisible(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    playTapSound();
    setEditingItem(item);
    setFormSku(item.sku);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormUnit(item.unit);
    setFormCurrentStock(String(item.currentStock));
    setFormMinStockAlert(String(item.minStockAlert));
    setFormCostPrice(String(item.costPrice));
    setFormSupplier(item.supplierName || '');
    setItemFormVisible(true);
  };

  const handleSaveForm = () => {
    playTapSound();
    const trimmed = formName.trim();
    if (!trimmed) {
      showToast({ title: 'Thiếu thông tin', message: 'Chưa nhập tên hàng!', type: 'danger' });
      return;
    }

    const currentStock = parseInt(formCurrentStock.replace(/\D/g, ''), 10) || 0;
    const minAlert = parseInt(formMinStockAlert.replace(/\D/g, ''), 10) || 0;
    const cost = parseInt(formCostPrice.replace(/\D/g, ''), 10) || 0;

    if (editingItem) {
      updateInventoryItem(editingItem.id, {
        sku: formSku.trim() || editingItem.sku,
        name: trimmed,
        category: formCategory,
        unit: formUnit.trim() || 'đơn vị',
        currentStock,
        minStockAlert: minAlert,
        costPrice: cost,
        supplierName: formSupplier.trim(),
      });
      showToast({ title: 'Đã Cập Nhật', message: `Đã lưu thay đổi ${trimmed}`, type: 'success' });
    } else {
      addInventoryItem({
        sku: formSku.trim() || `NL-${Math.floor(100 + Math.random() * 900)}`,
        name: trimmed,
        category: formCategory,
        unit: formUnit.trim() || 'đơn vị',
        currentStock,
        minStockAlert: minAlert,
        costPrice: cost,
        supplierName: formSupplier.trim(),
        lastRestockedAt: new Date().toISOString(),
      });
      showToast({ title: 'Đã Thêm Hàng', message: `Đã tạo ${trimmed}`, type: 'success' });
    }

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    setItemFormVisible(false);
  };

  const handleDeleteItem = (item: InventoryItem) => {
    playTapSound();
    const executeDelete = () => {
      deleteInventoryItem(item.id);
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      showToast({ title: 'Đã Xóa', message: `Đã xóa ${item.name} khỏi kho`, type: 'success' });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Xóa "${item.name}" khỏi hệ thống?`)) {
        executeDelete();
      }
    } else {
      Alert.alert('Xác Nhận Xóa', `Xóa "${item.name}" khỏi danh mục kho?`, [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa Hàng', style: 'destructive', onPress: executeDelete },
      ]);
    }
  };

  // Restock logic
  const handleOpenRestock = (item: InventoryItem) => {
    playTapSound();
    setRestockItem(item);
    setRestockQtyStr('1');
    setRestockTotalCostStr(String(item.costPrice || 0));
    setPaymentSource('cash');
  };

  const handleConfirmRestock = () => {
    if (!restockItem) return;
    playTapSound();
    const qty = parseInt(restockQtyStr.replace(/\D/g, ''), 10) || 0;
    const totalCost = parseInt(restockTotalCostStr.replace(/\D/g, ''), 10) || 0;

    if (qty <= 0) {
      showToast({ title: 'Sai số lượng', message: 'Số lượng nhập phải lớn hơn 0!', type: 'danger' });
      return;
    }

    restockInventoryItem(restockItem.id, qty, totalCost, paymentSource);

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    showToast({
      title: 'Đã nhập hàng thành công',
      message: paymentSource === 'cash'
        ? `Đã cộng ${qty} ${restockItem.unit} & tự động ghi Sổ Quỹ`
        : `Đã cộng ${qty} ${restockItem.unit} vào tồn kho`,
      type: 'success',
    });

    setRestockItem(null);
  };

  // Adjust stock logic
  const handleOpenAdjust = (item: InventoryItem) => {
    playTapSound();
    setAdjustItem(item);
    setAdjustQtyStr(String(item.currentStock));
    setAdjustNote('Kiểm kê định kỳ');
  };

  const handleConfirmAdjust = () => {
    if (!adjustItem) return;
    playTapSound();
    const actual = parseInt(adjustQtyStr.replace(/\D/g, ''), 10) || 0;

    adjustStock(adjustItem.id, actual, adjustNote);

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    showToast({
      title: 'Kiểm Kê Hoàn Tất',
      message: `${adjustItem.name}: Tồn thực tế ${actual} ${adjustItem.unit}`,
      type: 'success',
    });

    setAdjustItem(null);
  };

  // Render 1: KPI Strip
  const renderKpiOverview = () => (
    <View
      style={[
        s.kpiBar,
        {
          backgroundColor: theme.surface.card,
          borderBottomColor: theme.border.subtle,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={s.kpiItem}>
        <AppText variant="xs" color={theme.text.muted}>Tổng Mặt Hàng</AppText>
        <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
          {inventoryItems.length}
        </AppText>
      </View>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (lowStockItems.length > 0) {
            playTapSound();
            setSelectedCategory(selectedCategory === 'low_stock' ? 'all' : 'low_stock');
          }
        }}
        style={s.kpiItem}
      >
        <AppText variant="xs" color={theme.text.muted}>Cần Nhập Ngay</AppText>
        <AppText
          variant="md"
          weight="bold"
          color={lowStockItems.length > 0 ? theme.brand.danger : theme.brand.success}
          tabularNums
        >
          {lowStockItems.length}
        </AppText>
      </TouchableOpacity>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      <View style={s.kpiItem}>
        <AppText variant="xs" color={theme.text.muted}>Giá Trị Tồn Kho</AppText>
        <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
          {formatCurrency(totalInventoryValue)} đ
        </AppText>
      </View>
    </View>
  );

  // Render 2: Search Bar
  const renderSearchBar = () => (
    <View
      style={[
        s.searchBarContainer,
        {
          backgroundColor: theme.surface.card,
          borderBottomColor: theme.border.subtle,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View
        style={[
          s.searchBar,
          {
            backgroundColor: theme.surface.header,
            borderColor: theme.border.subtle,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 10,
          },
        ]}
      >
        <Icon name="magnify" size={18} color={theme.text.muted} />
        <TextInput
          placeholder="Tìm theo tên nguyên liệu, mã SKU, nhà cung cấp..."
          placeholderTextColor={theme.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[s.searchInput, { color: theme.text.primary }]}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close-circle" size={16} color={theme.text.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  // Render 3: Underline Tabs
  const renderCategoryChips = () => (
    <Tier1Tabs
      tabs={categoryTabs}
      activeTab={selectedCategory}
      onTabChange={setSelectedCategory}
      backgroundColor={theme.status.warningBg}
    />
  );

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* CASE A: FORM SUB-SCREEN (THÊM / SỬA HÀNG HÓA MỚI) */}
      {itemFormVisible ? (
        <View style={{ flex: 1, backgroundColor: isWide ? theme.surface.app : theme.surface.card }}>
          <AppHeader
            showBack
            onBack={() => setItemFormVisible(false)}
            title={editingItem ? 'Sửa Mặt Hàng Kho' : 'Thêm Hàng Hóa Mới'}
            subtitle={editingItem ? `Mã SKU: ${editingItem.sku}` : 'Nhập thông tin nguyên liệu / bao bì'}
          />

          <View style={{ flex: 1, backgroundColor: isWide ? theme.surface.app : theme.surface.card }}>
            <ScrollView
              ref={formScrollRef}
              overScrollMode="never"
              contentContainerStyle={{
                paddingHorizontal: isWide ? 16 : 14,
                paddingTop: 16,
                paddingBottom: 110,
                maxWidth: isWide ? 680 : undefined,
                alignSelf: isWide ? 'center' : undefined,
                width: '100%',
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* PHẦN 1: THÔNG TIN MẶT HÀNG CƠ BẢN */}
              <View style={{ marginBottom: 16 }}>
                <AppText variant="xs" weight="bold" color="muted" style={{ letterSpacing: 0.5, marginBottom: 10 }}>
                  THÔNG TIN MẶT HÀNG CƠ BẢN
                </AppText>

                {/* Tên mặt hàng */}
                <View style={{ marginBottom: 14 }}>
                  <AppText variant="md" weight="bold" color="primary" style={{ marginBottom: 6 }}>
                    Tên mặt hàng / nguyên vật liệu *
                  </AppText>
                  <TextInput
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="VD: Cà Phê Hạt Mộc Arabica/Robusta"
                    placeholderTextColor={theme.text.muted}
                    style={[
                      s.formInput,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.default,
                        color: theme.text.primary,
                      },
                    ]}
                  />
                  <AppText variant="xs" color="muted" style={{ marginTop: 4 }}>
                    Ví dụ: Cà Phê Hạt Mộc, Siro Đào, Ly Nhựa 500ml...
                  </AppText>
                </View>

                {/* Phân loại mặt hàng */}
                <View style={{ marginBottom: 14 }}>
                  <AppText variant="md" weight="bold" color="primary" style={{ marginBottom: 6 }}>
                    Phân Loại Mặt Hàng
                  </AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {[
                      { id: 'nguyen_lieu' as const, label: 'Nguyên Liệu' },
                      { id: 'dong_goi' as const, label: 'Đóng Gói / Bao Bì' },
                      { id: 'hang_hoa_ban_ngay' as const, label: 'Bán Liền' },
                    ].map((p) => {
                      const isSel = formCategory === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          activeOpacity={0.7}
                          onPress={() => {
                            playTapSound();
                            setFormCategory(p.id);
                            if (!editingItem) {
                              handleAutoGenerateSku(p.id);
                            }
                          }}
                          style={[
                            s.chipPill,
                            {
                              paddingHorizontal: 14,
                              height: 40,
                              backgroundColor: isSel ? theme.brand.primaryBg : theme.surface.card,
                              borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                            },
                          ]}
                        >
                          <AppText
                            variant="sm"
                            weight={isSel ? 'bold' : 'medium'}
                            color={isSel ? 'accent' : 'primary'}
                          >
                            {p.label}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Hàng ghép SKU & ĐVT */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <AppText variant="md" weight="bold" color="primary">Mã SKU</AppText>
                      <TouchableOpacity
                        onPress={() => handleAutoGenerateSku(formCategory)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                        accessibilityLabel="Tạo mã SKU tự động"
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: theme.surface.card,
                          paddingHorizontal: 8,
                          height: 32,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: theme.border.subtle,
                        }}
                      >
                        <Icon name="dice-5-outline" size={14} color={theme.brand.accent} />
                        <AppText variant="xs" weight="bold" color="accent">Tạo Mã</AppText>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      value={formSku}
                      onChangeText={setFormSku}
                      placeholder="VD: NL-355"
                      placeholderTextColor={theme.text.muted}
                      style={[s.formInput, { backgroundColor: theme.surface.card, borderColor: theme.border.default, color: theme.text.primary }]}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <AppText variant="md" weight="bold" color="primary" style={{ marginBottom: 6 }}>
                      Đơn Vị Tính
                    </AppText>
                    <TextInput
                      value={formUnit}
                      onChangeText={setFormUnit}
                      placeholder="kg, lon, hộp..."
                      placeholderTextColor={theme.text.muted}
                      style={[s.formInput, { backgroundColor: theme.surface.card, borderColor: theme.border.default, color: theme.text.primary }]}
                    />
                  </View>
                </View>

                {/* ĐVT phổ biến */}
                <View>
                  <AppText variant="xs" color="muted" style={{ marginBottom: 6 }}>
                    Chọn nhanh ĐVT phổ biến:
                  </AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {['kg', 'g', 'hộp', 'lon', 'bọc', 'gói', 'cây', 'bao', 'chai', 'cái', 'lít', 'ml', 'thùng'].map((u) => (
                      <TouchableOpacity
                        key={u}
                        activeOpacity={0.7}
                        onPress={() => {
                          playTapSound();
                          setFormUnit(u);
                        }}
                        style={[
                          s.unitChip,
                          {
                            height: 36,
                            paddingHorizontal: 12,
                            backgroundColor: formUnit === u ? theme.brand.primaryBg : theme.surface.card,
                            borderColor: formUnit === u ? theme.brand.accent : theme.border.subtle,
                          },
                        ]}
                      >
                        <AppText
                          variant="sm"
                          weight={formUnit === u ? 'bold' : 'normal'}
                          color={formUnit === u ? 'accent' : 'primary'}
                        >
                          {u}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* SEAMLESS DIVIDER */}
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border.subtle, marginBottom: 16 }} />

              {/* PHẦN 2: TỒN KHO & ĐƠN GIÁ VỐN */}
              <View style={{ marginBottom: 16 }}>
                <AppText variant="xs" weight="bold" color="muted" style={{ letterSpacing: 0.5, marginBottom: 10 }}>
                  TỒN KHO & ĐƠN GIÁ VỐN
                </AppText>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="md" weight="bold" color="primary" style={{ marginBottom: 6 }}>
                      Tồn Ban Đầu ({formUnit || 'đv'})
                    </AppText>
                    <TextInput
                      value={formCurrentStock}
                      onChangeText={setFormCurrentStock}
                      keyboardType="numeric"
                      style={[s.formInput, { backgroundColor: theme.surface.card, borderColor: theme.border.default, color: theme.text.primary }]}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <AppText variant="md" weight="bold" color="primary" style={{ marginBottom: 6 }}>
                      Ngưỡng Báo Hết
                    </AppText>
                    <TextInput
                      value={formMinStockAlert}
                      onChangeText={setFormMinStockAlert}
                      keyboardType="numeric"
                      style={[s.formInput, { backgroundColor: theme.surface.card, borderColor: theme.border.default, color: theme.text.primary }]}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="md" weight="bold" color="primary" style={{ marginBottom: 6 }}>
                      Đơn Giá Nhập (VND)
                    </AppText>
                    <TextInput
                      value={formCostPrice}
                      onChangeText={setFormCostPrice}
                      keyboardType="numeric"
                      style={[s.formInput, { backgroundColor: theme.surface.card, borderColor: theme.border.default, color: theme.text.primary }]}
                    />
                    {formCostPrice ? (
                      <AppText variant="sm" weight="medium" color="accent" tabularNums style={{ marginTop: 4 }}>
                        = {formatCurrency(parseInt(formCostPrice.replace(/\D/g, ''), 10) || 0)} đ / {formUnit || 'đv'}
                      </AppText>
                    ) : null}
                  </View>

                  <View style={{ flex: 1 }}>
                    <AppText variant="md" weight="bold" color="primary" style={{ marginBottom: 6 }}>
                      Nhà Cung Cấp
                    </AppText>
                    <TextInput
                      value={formSupplier}
                      onChangeText={setFormSupplier}
                      placeholder="VD: Vinamilk, Cozy..."
                      placeholderTextColor={theme.text.muted}
                      style={[s.formInput, { backgroundColor: theme.surface.card, borderColor: theme.border.default, color: theme.text.primary }]}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Form Bottom Dock Cố Định */}
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
              onPress={() => setItemFormVisible(false)}
              style={[s.fullPageBtnAction, { backgroundColor: theme.surface.header, borderColor: theme.border.default, flex: 1 }]}
            >
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Hủy
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSaveForm}
              style={[s.fullPageBtnAction, { backgroundColor: theme.brand.accent, borderColor: theme.brand.accent, flex: 2 }]}
            >
              <Icon name="check" size={18} color={theme.text.onBrand} />
              <AppText variant="md" weight="bold" color={theme.text.onBrand}>
                {editingItem ? 'Lưu Thay Đổi' : 'Lưu Hàng Hóa Mới'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : selectedItemDetail ? (
        /* CASE B: ITEM DETAIL SUB-SCREEN */
        <View style={{ flex: 1, backgroundColor: isWide ? theme.surface.app : theme.surface.card }}>
          <AppHeader
            title="Chi Tiết Hàng Hóa"
            subtitle={`Mã SKU: ${selectedItemDetail.sku}`}
            showBack
            onBack={() => {
              playTapSound();
              setSelectedItemDetail(null);
            }}
            rightCustom={
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenEdit(selectedItemDetail)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[s.iconHeaderBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
              >
                <Icon name="pencil" size={18} color={theme.text.primary} />
              </TouchableOpacity>
            }
          />
          <ScrollView
            contentContainerStyle={[
              { padding: isWide ? 16 : 0, paddingBottom: 110 },
              isWide && { maxWidth: 760, width: '100%', alignSelf: 'center' },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {(() => {
              const isLow = selectedItemDetail.currentStock <= selectedItemDetail.minStockAlert;
              const totalVal = selectedItemDetail.currentStock * selectedItemDetail.costPrice;
              const estimatedPortions = selectedItemDetail.unit.toLowerCase().includes('kg')
                ? Math.round(selectedItemDetail.currentStock * 55)
                : selectedItemDetail.unit.toLowerCase().includes('l') || selectedItemDetail.unit.toLowerCase().includes('lít')
                ? Math.round(selectedItemDetail.currentStock * 30)
                : selectedItemDetail.currentStock;
              const estimatedDaysLeft = Math.max(1, Math.round(selectedItemDetail.currentStock / 1.5));
              const categoryLabel = selectedItemDetail.category === 'nguyen_lieu' ? 'Nguyên Liệu' : selectedItemDetail.category === 'dong_goi' ? 'Đóng Gói' : 'Hàng Bán Ngay';

              return (
                <>
                  <View
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        borderRadius: isWide ? 14 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderBottomWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                      <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={2} style={{ flex: 1 }}>
                        {selectedItemDetail.name}
                      </AppText>
                      <View style={{ backgroundColor: theme.surface.header, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: theme.border.subtle }}>
                        <AppText variant="xs" weight="bold" color={theme.text.primary}>
                          {categoryLabel}
                        </AppText>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View>
                        <AppText variant="xs" weight="bold" color={theme.text.muted}>TỒN KHO HIỆN TẠI</AppText>
                        <AppText
                          variant="display"
                          weight="bold"
                          color={isLow ? theme.brand.danger : theme.text.primary}
                          tabularNums
                          style={{ marginTop: 2 }}
                        >
                          {selectedItemDetail.currentStock} <AppText variant="md" weight="bold" color={theme.text.muted}>{selectedItemDetail.unit}</AppText>
                        </AppText>
                      </View>
                      <View style={[s.statusPillLarge, { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isLow ? (isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.12)') : (isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.12)') }]}>
                        <Icon name={isLow ? 'alert-circle' : 'check-circle'} size={16} color={isLow ? theme.brand.danger : theme.brand.success} />
                        <AppText variant="sm" weight="bold" color={isLow ? theme.brand.danger : theme.brand.success}>
                          {isLow ? 'Sắp Hết Hàng' : 'Tồn An Toàn'}
                        </AppText>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                      <View style={{ flex: 1, backgroundColor: theme.surface.header, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Icon name="coffee-outline" size={18} color={theme.brand.accent} />
                        <View>
                          <AppText variant="xs" color={theme.text.muted}>PHỤC VỤ</AppText>
                          <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                            ~{estimatedPortions} ly
                          </AppText>
                        </View>
                      </View>
                      <View style={{ flex: 1, backgroundColor: theme.surface.header, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Icon name="calendar-clock-outline" size={18} color={isLow ? theme.brand.danger : theme.brand.primary} />
                        <View>
                          <AppText variant="xs" color={theme.text.muted}>ĐỦ BÁN</AppText>
                          <AppText variant="md" weight="bold" color={isLow ? theme.brand.danger : theme.text.primary} tabularNums>
                            ~{estimatedDaysLeft} ngày
                          </AppText>
                        </View>
                      </View>
                    </View>

                    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle, marginTop: 14, paddingTop: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.subtle }}>
                        <AppText variant="md" color={theme.text.muted}>Giá vốn nhập</AppText>
                        <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                          {formatCurrency(selectedItemDetail.costPrice)} đ / {selectedItemDetail.unit}
                        </AppText>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.subtle }}>
                        <AppText variant="md" color={theme.text.muted}>Tổng giá trị tồn</AppText>
                        <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
                          {formatCurrency(totalVal)} đ
                        </AppText>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
                        <AppText variant="md" color={theme.text.muted}>Nhà cung cấp</AppText>
                        <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1} style={{ maxWidth: '60%', textAlign: 'right' }}>
                          {selectedItemDetail.supplierName || 'Chưa thiết lập'}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        borderRadius: isWide ? 14 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderBottomWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        marginTop: isWide ? 10 : 0,
                      },
                    ]}
                  >
                    <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 10, letterSpacing: 0.5 }}>
                      LỊCH SỬ BIẾN ĐỘNG KHO
                    </AppText>

                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.subtle }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={[s.iconCircleMini, { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.brand.primaryBg }]}>
                            <Icon name="truck-delivery-outline" size={18} color={theme.brand.accent} />
                          </View>
                          <View>
                            <AppText variant="md" weight="bold" color={theme.text.primary}>Nhập Kho Tự Động</AppText>
                            <AppText variant="xs" color={theme.text.muted}>
                              {selectedItemDetail.lastRestockedAt ? new Date(selectedItemDetail.lastRestockedAt).toLocaleDateString('vi-VN') : '2/9/2026'}
                            </AppText>
                          </View>
                        </View>
                        <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
                          +{selectedItemDetail.currentStock} {selectedItemDetail.unit}
                        </AppText>
                      </View>
                    </View>
                  </View>
                </>
              );
            })()}
          </ScrollView>

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
                handleDeleteItem(selectedItemDetail);
                setSelectedItemDetail(null);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.status.dangerBg, borderColor: theme.brand.danger, flex: 0.85 }]}
            >
              <Icon name="trash-can-outline" size={18} color={theme.brand.danger} />
              <AppText variant="md" weight="bold" color={theme.brand.danger} numberOfLines={1}>
                Xóa
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                handleOpenAdjust(selectedItemDetail);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.surface.header, borderColor: theme.border.default, flex: 1.15 }]}
            >
              <Icon name="clipboard-check-outline" size={18} color={theme.text.primary} />
              <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
                Kiểm Kê
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                handleOpenRestock(selectedItemDetail);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.brand.accent, borderColor: theme.brand.accent, flex: 1.35 }]}
            >
              <Icon name="truck-delivery-outline" size={18} color={theme.text.onBrand} />
              <AppText variant="md" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
                Nhập Hàng
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* CASE C: MAIN INVENTORY LIST */
        <View style={{ flex: 1 }}>
          <AppHeader
            title="Kho Hàng"
            subtitle={`${inventoryItems.length} mặt hàng · Giá trị: ${formatCurrency(totalInventoryValue)} đ`}
            rightCustom={
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleOpenAdd}
                accessibilityRole="button"
                accessibilityLabel="Thêm hàng mới"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  s.addHeaderBtn,
                  {
                    backgroundColor: theme.brand.primary,
                  },
                ]}
              >
                <Icon name="plus" size={18} color={theme.text.onBrand} />
                <AppText variant="xs" weight="bold" color={theme.text.onBrand}>
                  Thêm Hàng
                </AppText>
              </TouchableOpacity>
            }
          />

          <View
            style={[
              s.fixedTabChipBar,
              {
                backgroundColor: theme.status.warningBg,
                borderBottomColor: theme.border.subtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            {renderCategoryChips()}
          </View>

          {isWide && (
            <View>
              {renderKpiOverview()}
              {renderSearchBar()}
            </View>
          )}

          <View style={{ flex: 1 }}>
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
                  paddingTop: isWide ? 16 : 4,
                  paddingBottom: isWide ? 24 : 90 + insets.bottom,
                },
                isWide && { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {!isWide && (
                <View>
                  {renderKpiOverview()}
                  {renderSearchBar()}
                </View>
              )}

              {filteredItems.length === 0 ? (
                <EmptyState
                  icon="package-variant-closed"
                  message={searchQuery ? 'Không tìm thấy mặt hàng phù hợp' : 'Kho hàng chưa có dữ liệu'}
                  description={searchQuery ? 'Thử tìm với từ khóa khác' : 'Nhấn "+ Thêm Hàng" để tạo nguyên liệu mới'}
                  actionText={!searchQuery ? '+ Thêm Hàng' : undefined}
                  onAction={!searchQuery ? handleOpenAdd : undefined}
                />
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.currentStock <= item.minStockAlert;
                  const totalValue = item.currentStock * item.costPrice;

                  return (
                    <View
                      key={item.id}
                      style={[
                        s.itemRow,
                        isWide && { width: isDesktopLarge ? '32.4%' : '49.2%', borderRadius: 12, borderWidth: 1 },
                        {
                          backgroundColor: theme.surface.card,
                          borderColor: isLow ? theme.brand.danger : theme.border.subtle,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: isLow ? theme.brand.danger : theme.border.subtle,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          playTapSound();
                          setSelectedItemDetail(item);
                        }}
                        style={s.rowMainContent}
                      >
                        <View style={s.rowInfoCol}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText
                              variant="md"
                              weight="medium"
                              color={theme.text.primary}
                              numberOfLines={2}
                              style={{ flexShrink: 1 }}
                            >
                              {item.name}
                            </AppText>
                            {isLow && (
                              <StatusDotBadge status="low_stock" label="Sắp Hết" size="sm" />
                            )}
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <AppText variant="xs" color={theme.text.muted} tabularNums>
                              {item.sku}
                            </AppText>
                            <AppText variant="xs" color={theme.text.muted} tabularNums>
                              · {formatCurrency(item.costPrice)}đ/{item.unit}
                            </AppText>
                            {item.supplierName ? (
                              <AppText variant="xs" color={theme.text.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
                                · {item.supplierName}
                              </AppText>
                            ) : null}
                          </View>
                        </View>

                        <View style={[s.rowStockCol, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                          <View style={{ alignItems: 'flex-end' }}>
                            <AppText
                              variant="md"
                              weight="bold"
                              color={isLow ? theme.brand.danger : theme.brand.success}
                              tabularNums
                              style={{ textAlign: 'right' }}
                            >
                              {item.currentStock} <AppText variant="xs" color={theme.text.muted}>{item.unit}</AppText>
                            </AppText>
                            <AppText
                              variant="sm"
                              weight="medium"
                              color={theme.text.muted}
                              tabularNums
                              style={{ textAlign: 'right', marginTop: 2 }}
                            >
                              {formatCurrency(totalValue)} đ
                            </AppText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </Animated.ScrollView>
          </View>
        </View>
      )}

      {/* MODAL RESTOCK */}
      {restockItem && (
        <AppModal
          visible={!!restockItem}
          title="Phiếu Nhập Hàng Nhanh"
          subtitle="Cộng tồn kho & tự động ghi nhận Sổ Quỹ"
          icon="package-variant-closed-plus"
          iconColor={theme.brand.accent}
          iconBg={`${theme.brand.accent}15`}
          onClose={() => setRestockItem(null)}
          presentation="dialog"
          maxWidth={460}
          primaryAction={{
            label: 'Nhập Hàng',
            variant: 'accent',
            onPress: handleConfirmRestock,
          }}
          secondaryAction={{
            label: 'Hủy',
            onPress: () => setRestockItem(null),
          }}
        >
          <View style={{ gap: 12 }}>
            <View style={[s.targetItemInfo, { backgroundColor: theme.surface.header, borderColor: theme.border.default, marginBottom: 0 }]}>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                {restockItem.name}
              </AppText>
              <AppText variant="xs" color={theme.text.muted} tabularNums>
                Tồn hiện tại: {restockItem.currentStock} {restockItem.unit} · Đơn giá: {formatCurrency(restockItem.costPrice || 0)} đ
              </AppText>
            </View>

            <View style={s.formField}>
              <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 6 }}>
                Số lượng mua thêm ({restockItem.unit})
              </AppText>
              <TextInput
                value={restockQtyStr}
                onChangeText={(v) => {
                  setRestockQtyStr(v);
                  const q = parseInt(v.replace(/\D/g, ''), 10) || 0;
                  setRestockTotalCostStr(String(q * (restockItem.costPrice || 0)));
                }}
                keyboardType="numeric"
                style={[s.input, { backgroundColor: theme.surface.header, borderColor: theme.border.default, color: theme.text.primary }]}
              />
            </View>

            <View style={s.formField}>
              <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 6 }}>
                Tổng tiền thanh toán (VND)
              </AppText>
              <TextInput
                value={restockTotalCostStr}
                onChangeText={setRestockTotalCostStr}
                keyboardType="numeric"
                style={[s.input, { backgroundColor: theme.surface.header, borderColor: theme.border.default, color: theme.text.primary }]}
              />
            </View>

            <View style={s.formField}>
              <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 6 }}>
                Nguồn tiền thanh toán
              </AppText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setPaymentSource('cash')}
                  style={[
                    s.sourceOption,
                    {
                      backgroundColor: paymentSource === 'cash' ? theme.brand.primaryBg : theme.surface.header,
                      borderColor: paymentSource === 'cash' ? theme.brand.primary : theme.border.default,
                    },
                  ]}
                >
                  <Icon name="cash" size={16} color={paymentSource === 'cash' ? theme.brand.primary : theme.text.muted} />
                  <AppText
                    variant="xs"
                    weight={paymentSource === 'cash' ? 'bold' : 'normal'}
                    color={paymentSource === 'cash' ? theme.brand.primary : theme.text.primary}
                  >
                    Tiền mặt (Sổ Quỹ)
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setPaymentSource('bank')}
                  style={[
                    s.sourceOption,
                    {
                      backgroundColor: paymentSource === 'bank' ? theme.brand.primaryBg : theme.surface.header,
                      borderColor: paymentSource === 'bank' ? theme.brand.primary : theme.border.default,
                    },
                  ]}
                >
                  <Icon name="bank-transfer" size={16} color={paymentSource === 'bank' ? theme.brand.primary : theme.text.muted} />
                  <AppText
                    variant="xs"
                    weight={paymentSource === 'bank' ? 'bold' : 'normal'}
                    color={paymentSource === 'bank' ? theme.brand.primary : theme.text.primary}
                  >
                    Chuyển khoản / Khác
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </AppModal>
      )}

      {/* MODAL ADJUST */}
      {adjustItem && (
        <AppModal
          visible={!!adjustItem}
          title="Kiểm Kê Kho"
          subtitle={`Mặt hàng: ${adjustItem.name} (${adjustItem.unit})`}
          icon="clipboard-check-outline"
          iconColor={theme.brand.primary}
          iconBg={`${theme.brand.primary}15`}
          onClose={() => setAdjustItem(null)}
          presentation="dialog"
          maxWidth={460}
          primaryAction={{
            label: 'Lưu Tồn Kho',
            variant: 'primary',
            onPress: handleConfirmAdjust,
          }}
          secondaryAction={{
            label: 'Hủy',
            onPress: () => setAdjustItem(null),
          }}
        >
          <View style={{ gap: 12 }}>
            <View style={s.formField}>
              <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 6 }}>
                Số lượng đếm thực tế ({adjustItem.unit})
              </AppText>
              <TextInput
                value={adjustQtyStr}
                onChangeText={setAdjustQtyStr}
                keyboardType="numeric"
                style={[s.input, { backgroundColor: theme.surface.header, borderColor: theme.border.default, color: theme.text.primary, fontSize: 18, textAlign: 'center' }]}
              />
            </View>

            <View style={s.formField}>
              <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 6 }}>
                Lý do chênh lệch / Ghi chú
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {['Kiểm kê định kỳ', 'Hao hụt pha chế', 'Đổ vỡ / Hư hỏng', 'Khách đổi trả'].map((rs) => (
                  <TouchableOpacity
                    key={rs}
                    activeOpacity={0.7}
                    onPress={() => setAdjustNote(rs)}
                    style={[
                      s.reasonChip,
                      {
                        backgroundColor: adjustNote === rs ? theme.brand.primaryBg : theme.surface.header,
                        borderColor: adjustNote === rs ? theme.brand.primary : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight={adjustNote === rs ? 'bold' : 'normal'}
                      color={adjustNote === rs ? theme.brand.primary : theme.text.muted}
                    >
                      {rs}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={adjustNote}
                onChangeText={setAdjustNote}
                placeholder="Ghi chú thêm..."
                placeholderTextColor={theme.text.muted}
                style={[s.input, { backgroundColor: theme.surface.header, borderColor: theme.border.default, color: theme.text.primary }]}
              />
            </View>
          </View>
        </AppModal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
  },
  kpiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 52,
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  searchBarContainer: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    height: 48,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  fixedTabChipBar: {
    backgroundColor: 'transparent',
  },
  listScroll: {
    paddingVertical: 4,
  },
  itemRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  rowMainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  rowStockCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  lowBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  targetItemInfo: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  formField: {
    marginBottom: 12,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  formInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  sourceOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btnCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubmit: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
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
    borderWidth: 1,
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
    gap: 6,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 6,
  },
  chipPill: {
    height: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  iconCircleMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert, Platform, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../lib/theme';
import { useResponsive } from '../lib/hooks/useResponsive';
import { usePOSStore, CartItem } from '../lib/store/usePOSStore';
import { AppText } from '../lib/components/ui/AppText';
import { Button } from '../lib/components/ui/Button';
import { CardHeader } from '../lib/components/ui/Card';
import { BottomNavBar } from '../lib/components/ui/BottomNavBar';
import { AppHeader } from '../lib/components/ui/AppHeader';
import { useAppToast } from '../lib/components/ui/AppToast';
import { CollapsibleFilterBar, useNativeCollapsible } from '../lib/components/ui/CollapsibleFilterBar';
import {
  CartItemRow,
  AreaFilter,
  ModifierSheet,
  ModifierOption,
  FullScreenCartModal,
  MenuItemWithModifiers,
  SelectedModifierData,
  MobileCartBar,
  ProductGridFlashList,
  TableGridFlashList,
  TableOperationsModal,
  TablePickerModal,
  VoidItemModal,
  DiscountModal,
  TableItem,
  TableOverviewBanner,
  QRScannerModal,
  isSugarIceItem,
} from '../lib/components/pos';
import { matchesVietnameseSearch, searchAndRankItems, buildSearchIndex, searchWithPreIndex } from '../lib/utils/vietnameseSearch';
import { playTapSound } from '../lib/utils/sound';

import { TabletCartPane, ProductCatalogPane, InlineModifierPane } from '../lib/components/pos-home';

// Static Empty Array & Map reference
const EMPTY_CART: CartItem[] = [];
const EMPTY_CARTS_MAP: Record<string, CartItem[]> = {};

export default function POSScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { isWide, isMobile, isDesktop, isDesktopLarge, masterWidth, detailWidth, tableColumns, productColumns } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useAppToast();

  // 🌟 Fine-Grained Atomic Zustand Selectors
  const tables = usePOSStore((s) => s.tables);
  const areas = usePOSStore((s) => s.areas);
  const categories = usePOSStore((s) => s.categories);
  const selectedTable = usePOSStore((s) => s.selectedTable);
  const activeArea = usePOSStore((s) => s.activeArea);
  const viewMode = usePOSStore((s) => s.viewMode);
  const orderChannel = usePOSStore((s) => s.orderChannel);
  const outOfStockProductIds = usePOSStore((s) => s.outOfStockProductIds);
  const menuItems = usePOSStore((s) => s.menuItems);

  const dynamicAreas = useMemo(() => {
    const set = new Set<string>();
    areas.forEach((a) => set.add(a.name));
    tables.forEach((t) => {
      if (t.area) set.add(t.area);
    });
    return ['Tất Cả', ...Array.from(set)];
  }, [areas, tables]);
  const tableCarts = usePOSStore((s) => s.tableCarts || EMPTY_CARTS_MAP);
  const occupiedCount = usePOSStore((s) => {
    let count = 0;
    for (let i = 0; i < s.tables.length; i++) {
      const t = s.tables[i];
      if (t.status === 'co_khach' || t.status === 'dang_su_dung' || (s.tableCarts[t.id]?.length || 0) > 0) {
        count++;
      }
    }
    return count;
  });

  const setViewMode = usePOSStore((s) => s.setViewMode);
  const setOrderChannel = usePOSStore((s) => s.setOrderChannel);
  const toggleOutOfStock = usePOSStore((s) => s.toggleOutOfStock);
  const setActiveArea = usePOSStore((s) => s.setActiveArea);
  const selectTable = usePOSStore((s) => s.selectTable);
  const addToCart = usePOSStore((s) => s.addToCart);
  const updateCartItem = usePOSStore((s) => s.updateCartItem);
  const updateCartQty = usePOSStore((s) => s.updateCartQty);
  const removeCartItem = usePOSStore((s) => s.removeCartItem);
  const voidItem = usePOSStore((s) => s.voidItem);
  const sendToKitchen = usePOSStore((s) => s.sendToKitchen);
  const assignCartToTable = usePOSStore((s) => s.assignCartToTable);
  const startNewOrder = usePOSStore((s) => s.startNewOrder);
  const markTablePrePrinted = usePOSStore((s) => s.markTablePrePrinted);
  const pinnedItemIds = usePOSStore((s) => s.pinnedItemIds || []);
  const storeSettings = usePOSStore((s) => s.storeSettings);

  const categoriesWithPinned = useMemo(
    () => ['Tất Cả', ...categories.map((c) => c.name)],
    [categories]
  );

  // 🌟 Scoped Atomic Cart & Discount Selectors (Chỉ re-render khi bàn hiện tại thay đổi)
  const selectedTableId = selectedTable?.id;
  const cart = usePOSStore((s) => (selectedTableId ? s.tableCarts[selectedTableId] || EMPTY_CART : EMPTY_CART));
  const discount = usePOSStore((s) => (selectedTableId ? s.tableDiscounts[selectedTableId] : undefined));

  // Đếm số lượng từng món trong giỏ hàng hiện tại (hiển thị góc trái thẻ món)
  const cartItemCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    cart.forEach((c) => {
      if (c.item?.id) counts[c.item.id] = (counts[c.item.id] || 0) + c.qty;
      if (c.item?.code) counts[c.item.code] = (counts[c.item.code] || 0) + c.qty;
    });
    return counts;
  }, [cart]);

  // Menu & Search State
  const [activeCategory, setActiveCategory] = useState('Tất Cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuLayout, setMenuLayout] = useState<'grid' | 'list'>(isWide ? 'grid' : 'list');
  const { scrollY, onScroll } = useNativeCollapsible(92);

  // Modals & Sheets State
  const [modifierVisible, setModifierVisible] = useState(false);
  const [modifierItem, setModifierItem] = useState<MenuItemWithModifiers | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<SelectedModifierData | null>(null);
  const [mobileCartSheetVisible, setMobileCartSheetVisible] = useState(false);
  const [tableOpsVisible, setTableOpsVisible] = useState(false);
  const [discountVisible, setDiscountVisible] = useState(false);
  const [voidModalVisible, setVoidModalVisible] = useState(false);
  const [itemToVoid, setItemToVoid] = useState<CartItem | null>(null);
  const [qrScannerVisible, setQRScannerVisible] = useState(false);
  const [tablePickerVisible, setTablePickerVisible] = useState(false);
  const [tablePickerTitle, setTablePickerTitle] = useState('Chọn Bàn Phục Vụ');
  const [tablePickerSubtitle, setTablePickerSubtitle] = useState('Chọn bàn để gán món ăn');
  const [pendingTableAction, setPendingTableAction] = useState<'save' | 'checkout' | 'change' | null>(null);
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState('all');

  // Lọc Bàn theo Khu Vực, Trạng Thái & Từ Khóa Tìm Kiếm Tiếng Việt Không Dấu (Memoized)
  const filteredTables = useMemo(() => {
    return tables
      .map((t) => {
        const cartForTable = tableCarts[t.id] || [];
        const hasCart = cartForTable.length > 0;
        if (hasCart && t.status !== 'da_in_tam_tinh') {
          const dynamicTotal = cartForTable.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);
          const dynamicItemCount = cartForTable.reduce((sum, c) => sum + c.qty, 0);
          return {
            ...t,
            status: 'co_khach' as const,
            itemCount: dynamicItemCount,
            totalAmount: dynamicTotal,
          };
        }
        return t;
      })
      .filter((t) => {
        const isOcc = t.status === 'co_khach' || t.status === 'dang_su_dung';
        const isPre = t.status === 'da_in_tam_tinh';
        const isRes = t.status === 'da_dat';
        const isVac = !isOcc && !isPre && !isRes;

        const matchArea = activeArea === 'Tất Cả' || t.area === activeArea;
        const matchStatus =
          tableStatusFilter === 'all' ||
          (tableStatusFilter === 'trong' && isVac) ||
          (tableStatusFilter === 'co_khach' && isOcc) ||
          (tableStatusFilter === 'da_in_tam_tinh' && isPre);
        const matchQuery =
          !tableSearchQuery ||
          matchesVietnameseSearch(t.name, tableSearchQuery) ||
          matchesVietnameseSearch(t.area, tableSearchQuery) ||
          t.id.toLowerCase().includes(tableSearchQuery.toLowerCase());
        return matchArea && matchStatus && matchQuery;
      });
  }, [tables, tableCarts, activeArea, tableStatusFilter, tableSearchQuery]);

  // Đếm số lượng bàn theo từng khu vực cho AreaFilter
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Tất Cả': tables.length };
    tables.forEach((t) => {
      if (t.area) {
        counts[t.area] = (counts[t.area] || 0) + 1;
      }
    });
    return counts;
  }, [tables]);

  // Xử lý Bật/Tắt Cảnh Báo Hết Món 86'd khi nhấn giữ lâu thẻ món (1-Chạm <= 50ms, Zero Confirmation Churn)
  const handleToggle86 = useCallback((item: MenuItemWithModifiers) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    const isOut = outOfStockProductIds.includes(item.id) || (item.code ? outOfStockProductIds.includes(item.code) : false);
    toggleOutOfStock(item.id);
    showToast({
      title: isOut ? 'Đã mở bán' : 'Đã báo hết',
      message: `${item.name} ${isOut ? 'đang bán' : 'tạm hết'}`,
      type: isOut ? 'success' : 'warning',
    });
  }, [outOfStockProductIds, toggleOutOfStock, showToast]);

  // 1-Chạm: Quick Add món mặc định vào giỏ ngay trong 0.1s
  const handleQuickAdd = useCallback((item: MenuItemWithModifiers) => {
    const isOut = outOfStockProductIds.includes(item.id) || (item.code ? outOfStockProductIds.includes(item.code) : false);
    if (isOut) return;

    const hasSugarIce = (storeSettings?.enableSugarIceModifier ?? false) && isSugarIceItem(item, storeSettings?.sugarIceCategories);
    const defaultSize = (item.sizes && item.sizes.length > 0) ? item.sizes[0].name : undefined;

    addToCart({
      item,
      qty: 1,
      selectedSize: defaultSize,
      sugarLevel: hasSugarIce ? '100%' : undefined,
      iceLevel: hasSugarIce ? '100%' : undefined,
      selectedToppings: [],
      note: '',
      unitPrice: item.price,
    });
  }, [outOfStockProductIds, addToCart, storeSettings]);

  // 1-Chạm: Quick Add món kèm Size được chọn trực tiếp từ thẻ món trong 0ms
  const handleAddSize = useCallback((item: MenuItemWithModifiers, size: ModifierOption) => {
    const isOut = outOfStockProductIds.includes(item.id) || (item.code ? outOfStockProductIds.includes(item.code) : false);
    if (isOut) return;

    const hasSugarIce = (storeSettings?.enableSugarIceModifier ?? false) && isSugarIceItem(item, storeSettings?.sugarIceCategories);

    addToCart({
      item,
      qty: 1,
      selectedSize: size.name,
      sugarLevel: hasSugarIce ? '100%' : undefined,
      iceLevel: hasSugarIce ? '100%' : undefined,
      selectedToppings: [],
      note: '',
      unitPrice: item.price + (size.priceDelta || 0),
    });
  }, [outOfStockProductIds, addToCart, storeSettings]);

  // Xử lý khi Quét QR / Barcode: Tự động thêm món vào giỏ và trả về thông tin cho Live Toast
  const handleScanItem = useCallback((code: string) => {
    const cleanData = code.trim().toLowerCase();

    // 1. Kiểm tra nếu là Mã SKU / Barcode món ăn
    const foundProduct = menuItems.find(
      (p) =>
        p.id.toLowerCase() === cleanData ||
        (p.code && p.code.toLowerCase() === cleanData) ||
        p.name.toLowerCase() === cleanData ||
        cleanData.includes((p.code || '').toLowerCase())
    );

    if (foundProduct) {
      handleQuickAdd(foundProduct);
      return {
        name: foundProduct.name,
        price: foundProduct.price,
        code: foundProduct.code,
      };
    }

    // 2. Kiểm tra nếu là Mã Bàn (quét đổi bàn)
    const foundTable = tables.find(
      (t) =>
        t.id.toLowerCase() === cleanData ||
        t.name.toLowerCase() === cleanData ||
        cleanData.includes(t.id.toLowerCase())
    );
    if (foundTable) {
      selectTable(foundTable);
      return {
        name: `Đã đổi sang: ${foundTable.name} (${foundTable.area})`,
        price: 0,
      };
    }

    return null;
  }, [tables, selectTable, handleQuickAdd, menuItems]);

  // 🌟 Chỉ mục tìm kiếm menu tính sẵn 1 lần duy nhất (Inverted Index Prep - 0ms Runtime)
  const menuSearchIndex = useMemo(() => {
    return buildSearchIndex(menuItems, (item) => item.name, (item) => item.code);
  }, [menuItems]);

  // Lọc Thực Đơn: Khi có từ khóa tìm kiếm -> tìm kiếm toàn cục trên chỉ mục tính sẵn (Zero Regex Runtime)
  // Khi không tìm kiếm -> lọc nhanh theo danh mục đang chọn
  const filteredMenu = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery !== '') {
      return searchWithPreIndex(menuSearchIndex, trimmedQuery);
    }

    if (activeCategory !== 'Tất Cả') {
      return menuItems.filter((item) => item.category === activeCategory);
    }
    return menuItems;
  }, [activeCategory, searchQuery, menuItems, menuSearchIndex]);

  // Mở Sheet Tùy Chỉnh (Topping, Size, Đường, Đá, Ghi chú) khi bấm vào nút tùy chọn hoặc vùng món trên Menu
  const handleProductPress = useCallback((item: MenuItemWithModifiers) => {
    const isOut = outOfStockProductIds.includes(item.id) || (item.code ? outOfStockProductIds.includes(item.code) : false);
    if (isOut) {
      Alert.alert('Hết Món', `Món [${item.name}] đã tạm hết.`);
      return;
    }
    // 🌟 Khi mở từ Menu: Luôn là THÊM MỚI (editingCartItem = null)
    // Giúp khách gọi thêm size khác (VD: Size L thay vì M) tạo thành dòng riêng biệt, không đè món đã lưu
    setEditingCartItem(null);
    setModifierItem(item);
    setModifierVisible(true);
  }, [outOfStockProductIds]);

  // 1-Chạm: Chọn bàn và tự động chuyển sang Thực Đơn
  const handleSelectTable = useCallback((table: TableItem) => {
    selectTable(table);
    if (table.id.startsWith('mv-') || table.name.toLowerCase().includes('mang về')) {
      setOrderChannel('takeaway');
    } else {
      setOrderChannel('dine_in');
    }
    setViewMode('pos');
  }, [selectTable, setOrderChannel, setViewMode]);

  // 1-Chạm giữ: Mở nhanh Modal Nghiệp Vụ Bàn (Chuyển, Gộp, Tách, Ghi chú, In tạm tính, Hủy bàn)
  const handleLongPressTable = useCallback((table: TableItem) => {
    selectTable(table);
    setTableOpsVisible(true);
  }, [selectTable]);

  // Thêm món có Topping vào Giỏ hàng
  const handleAddModifierToCart = useCallback((data: SelectedModifierData) => {
    addToCart(data);
  }, [addToCart]);

  // Tính Tổng Tiền & Chiết Khấu
  const totalQty = useMemo(() => cart.reduce((s, c) => s + c.qty, 0), [cart]);
  const subTotal = useMemo(() => cart.reduce((s, c) => s + c.unitPrice * c.qty, 0), [cart]);

  const discountAmount = useMemo(() => {
    if (!discount) return 0;
    if (discount.type === 'percent') {
      return Math.round(subTotal * (discount.value / 100));
    }
    return Math.min(discount.value, subTotal);
  }, [discount, subTotal]);

  const totalAmount = Math.max(0, subTotal - discountAmount);

  // Mở modal chọn bàn khi cần gán bàn / đổi bàn
  const handleOpenTablePicker = useCallback(
    (action: 'save' | 'checkout' | 'change' = 'change', title?: string, subtitle?: string) => {
      setPendingTableAction(action);
      if (title) {
        setTablePickerTitle(title);
      } else if (action === 'save') {
        setTablePickerTitle('Chọn Bàn Để Lưu Hóa Đơn');
      } else if (action === 'checkout') {
        setTablePickerTitle('Chọn Bàn Để Thanh Toán');
      } else {
        setTablePickerTitle('Gán Vào Bàn Phục Vụ');
      }

      if (subtitle) {
        setTablePickerSubtitle(subtitle);
      } else if (action === 'save') {
        setTablePickerSubtitle('Chọn bàn để lưu đơn');
      } else if (action === 'checkout') {
        setTablePickerSubtitle('Chọn bàn để tính tiền');
      } else {
        setTablePickerSubtitle('Chọn bàn trống hoặc ghép vào bàn có khách');
      }

      setTablePickerVisible(true);
    },
    []
  );

  // Xử lý khi chọn bàn từ modal chọn bàn
  const handleSelectTableFromPicker = useCallback(
    (table: TableItem) => {
      setTablePickerVisible(false);
      playTapSound();
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
      }

      // Chuyển toàn bộ giỏ hàng hiện tại sang bàn được chọn
      assignCartToTable(table);

      const action = pendingTableAction;
      setPendingTableAction(null);

      if (action === 'save') {
        sendToKitchen();
        setMobileCartSheetVisible(false);
        showToast({
          title: 'Đã lưu đơn',
          message: `Đã gán và lưu đơn cho ${table.name}`,
          type: 'success',
        });
        if (orderChannel === 'dine_in') {
          setViewMode('tables');
        }
      } else if (action === 'checkout') {
        setMobileCartSheetVisible(false);
        router.push('/thanh-toan' as any);
      } else {
        showToast({
          title: 'Đã gán bàn',
          message: `Đơn hàng đã gán vào ${table.name}`,
          type: 'info',
        });
      }
    },
    [assignCartToTable, pendingTableAction, sendToKitchen, showToast, orderChannel, setViewMode, router]
  );

  const isSubmittingKitchenRef = useRef(false);

  // Xử lý Lưu Đơn & Gửi Bếp (1-Chạm: In bếp, đổi trạng thái bàn và về Sơ Đồ Bàn)
  const handleSendKitchen = useCallback(() => {
    if (isSubmittingKitchenRef.current) return;
    if (cart.length === 0) return;

    // Nếu chưa chọn bàn -> yêu cầu chọn bàn trước khi lưu
    if (selectedTable.id === 'unassigned') {
      handleOpenTablePicker('save');
      return;
    }

    isSubmittingKitchenRef.current = true;
    setTimeout(() => { isSubmittingKitchenRef.current = false; }, 500);

    sendToKitchen();

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
    }

    // Đóng giỏ hàng và tự động đưa về ngay màn hình Sơ Đồ Bàn theo luồng F&B chuẩn
    setMobileCartSheetVisible(false);
    showToast({
      title: 'Đã lưu đơn',
      message: `Đã lưu đơn cho ${selectedTable.name}`,
      type: 'success',
    });
    setViewMode('tables');
  }, [cart.length, selectedTable.id, selectedTable.name, handleOpenTablePicker, sendToKitchen, setViewMode, showToast]);

  // Xử lý in tạm tính (Pre-Bill)
  const handlePrintPreBill = useCallback(() => {
    if (cart.length === 0) {
      Alert.alert('Chưa Có Món', 'Bàn chưa có món để in tạm tính.');
      return;
    }
    // 🖨️ Chuyển trạng thái bàn sang 'da_in_tam_tinh' (Màu Vàng)
    markTablePrePrinted(selectedTable.id);
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
    }
    Alert.alert(
      'Đã In Phiếu Tạm',
      `Đã in phiếu tạm tính cho [${selectedTable.name}]:\n- Số món: ${cart.length} (${totalQty} phần)\n- Tạm tính: ${subTotal.toLocaleString('vi-VN')} đ\n${discountAmount > 0 ? `- Giảm giá: -${discountAmount.toLocaleString('vi-VN')} đ\n` : ''}- Cần thu: ${totalAmount.toLocaleString('vi-VN')} đ\n\nBàn chuyển sang trạng thái Chờ thanh toán.`
    );
  }, [cart.length, selectedTable.id, selectedTable.name, totalQty, subTotal, discountAmount, totalAmount, markTablePrePrinted]);

  // Mở modal hủy món đã gửi bếp
  const handleOpenVoid = useCallback((item: CartItem) => {
    setItemToVoid(item);
    setVoidModalVisible(true);
  }, []);

  // 1-Chạm: Giảm nhanh số lượng món từ thực đơn (-)
  const handleQuickDecrement = useCallback((item: MenuItemWithModifiers) => {
    const matchingCartItems = cart.filter(
      (c) => c.item?.id === item.id || (item.code && c.item?.code === item.code)
    );
    if (matchingCartItems.length === 0) return;

    // Ưu tiên giảm món chưa gửi bếp, hoặc món thêm gần nhất
    const unsentItem = [...matchingCartItems].reverse().find((c) => !c.sentToKitchen);
    const targetItem = unsentItem || matchingCartItems[matchingCartItems.length - 1];

    if (targetItem) {
      if (targetItem.sentToKitchen) {
        handleOpenVoid(targetItem);
      } else {
        playTapSound();
        updateCartQty(targetItem.cartItemId, -1);
      }
    }
  }, [cart, updateCartQty, handleOpenVoid]);

  const handleOpenCart = useCallback(() => setMobileCartSheetVisible(true), []);
  const handleFastPay = useCallback(() => {
    if (selectedTable.id === 'unassigned') {
      handleOpenTablePicker('checkout');
      return;
    }
    router.push('/thanh-toan' as any);
  }, [selectedTable.id, handleOpenTablePicker, router]);

  const handleOpenTableOps = useCallback(() => {
    if (selectedTable.id === 'unassigned') {
      handleOpenTablePicker('change');
      return;
    }
    setTableOpsVisible(true);
  }, [selectedTable.id, handleOpenTablePicker]);

  const handleCloseCart = useCallback(() => setMobileCartSheetVisible(false), []);
  const handleCheckoutFromCart = useCallback(() => {
    if (selectedTable.id === 'unassigned') {
      handleOpenTablePicker('checkout');
      return;
    }
    setMobileCartSheetVisible(false);
    router.push('/thanh-toan' as any);
  }, [selectedTable.id, handleOpenTablePicker, router]);

  // 🔄 Tự động đồng bộ Thực đơn & Bàn ăn từ máy chủ khi vào app
  useEffect(() => {
    const timer = setTimeout(() => {
      usePOSStore.getState().fetchMasterCatalog().catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // ⌨️ BỘ PHÍM TẮT THU NGÂN CHO MÁY TÍNH WEB (F1: Tìm kiếm, F2: Đổi Bàn/Món, F4: Tính tiền, ESC: Đóng modal)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: Focus thanh tìm kiếm món ăn hoặc mở tìm kiếm
      if (e.key === 'F1') {
        e.preventDefault();
        playTapSound();
        const searchInput = document.querySelector('input[placeholder*="Tìm"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
        return;
      }
      // F2: Đổi chế độ Sơ Đồ Bàn ↔ Thực Đơn
      if (e.key === 'F2') {
        e.preventDefault();
        playTapSound();
        setViewMode(viewMode === 'tables' ? 'pos' : 'tables');
        return;
      }
      // F4: Chuyển sang thanh toán nhanh nếu có món
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          playTapSound();
          if (selectedTable.id === 'unassigned') {
            handleOpenTablePicker('checkout');
          } else {
            router.push('/thanh-toan' as any);
          }
        }
        return;
      }
      // ESC: Đóng tất cả các Modal / Sheet đang mở
      if (e.key === 'Escape') {
        if (modifierVisible) setModifierVisible(false);
        if (mobileCartSheetVisible) setMobileCartSheetVisible(false);
        if (tableOpsVisible) setTableOpsVisible(false);
        if (discountVisible) setDiscountVisible(false);
        if (voidModalVisible) setVoidModalVisible(false);
        if (tablePickerVisible) setTablePickerVisible(false);
        if (qrScannerVisible) setQRScannerVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    viewMode,
    cart.length,
    selectedTable.id,
    modifierVisible,
    mobileCartSheetVisible,
    tableOpsVisible,
    discountVisible,
    voidModalVisible,
    tablePickerVisible,
    qrScannerVisible,
    handleOpenTablePicker,
    router,
    setViewMode,
  ]);

  const isUnassigned = selectedTable.id === 'unassigned';
  const renderHeader = () => (
    <AppHeader
      title={
        viewMode === 'tables'
          ? `Sơ Đồ Bàn (${occupiedCount}/${tables.length})`
          : isUnassigned
          ? (totalQty > 0 ? 'Đơn Chưa Gán Bàn' : 'Gọi Món Nhanh')
          : selectedTable.name
      }
      subtitle={
        viewMode === 'tables'
          ? (occupiedCount > 0 ? `${occupiedCount} bàn đang dùng` : 'Tất cả bàn đang trống')
          : isUnassigned
          ? totalQty > 0
            ? `${totalQty} món · Chạm gán bàn`
            : 'Chọn món trước, gán bàn sau'
          : totalQty > 0
          ? `${totalQty} món · ${totalAmount.toLocaleString('vi-VN')} đ`
          : selectedTable.area
          ? `${selectedTable.area} · Đang chọn món`
          : 'Đang chọn món'
      }
      onTitlePress={
        viewMode === 'pos'
          ? () => {
              if (isWide) {
                setViewMode('tables');
              } else {
                handleOpenTablePicker('change', 'Chọn Bàn Phục Vụ', 'Chọn bàn để gán món cho đơn hàng');
              }
            }
          : undefined
      }
      titleRightIcon={viewMode === 'pos' ? 'chevron-down' : undefined}
      rightCustom={
        <View style={s.topBarActions}>
          {viewMode === 'tables' ? (
            <>
              {/* 🌟 NÚT MANG VỀ 1-CHẠM (Cả Mobile & Tablet) */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Đơn mang về"
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                onPress={() => {
                  playTapSound();
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (_) {}
                  }
                  const takeawayTable: TableItem = tables.find((t) => t.id.startsWith('mv-') || t.name.toLowerCase().includes('mang về')) || {
                    id: 'mv-01',
                    name: 'Mang Về 01',
                    area: 'Mang Về',
                    capacity: 1,
                    status: 'trong',
                  };
                  selectTable(takeawayTable);
                  setOrderChannel('takeaway');
                  setViewMode('pos');
                }}
                style={[
                  s.takeawayHeaderBtn,
                  {
                    backgroundColor: theme.status.warningBg,
                    borderColor: theme.brand.accent,
                  },
                ]}
              >
                <Icon name="shopping-outline" size={18} color={theme.brand.accent} />
                <AppText variant="sm" weight="medium" color={theme.brand.accent}>
                  Mang Về
                </AppText>
              </TouchableOpacity>

              {/* 🌟 NÚT VÀO THỰC ĐƠN BÁN HÀNG (CHỈ TRÊN TABLET / MÀN RỘNG) */}
              {isWide && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Xem thực đơn"
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (_) {}
                    }
                    if (!selectedTable.id.startsWith('mv-') && !selectedTable.name.toLowerCase().includes('mang về')) {
                      setOrderChannel('dine_in');
                    }
                    setViewMode('pos');
                  }}
                  style={[
                    s.modeToggleBtn,
                    {
                      backgroundColor: theme.surface.header,
                      borderColor: theme.border.default,
                    },
                  ]}
                >
                  <Icon name="food-fork-drink" size={15} color={theme.text.primary} />
                  <AppText variant="xs" weight="medium" color={theme.text.primary}>
                    Thực Đơn
                  </AppText>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              {/* TRƯỜNG HỢP 2: ĐANG Ở THỰC ĐƠN -> HỖ TRỢ CẢ 2 HÀNH ĐỘNG */}
              {/* 1. NÚT DUY NHẤT: GÁN BÀN / ĐỔI BÀN (Chuẩn 44pt to rõ, nổi bật) */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isUnassigned ? 'Gán bàn phục vụ' : 'Đổi bàn phục vụ'}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                onPress={() => {
                  playTapSound();
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (_) {}
                  }
                  // Trên màn hình rộng (Tablet/Web): Chuyển thẳng sang giao diện Sơ Đồ Bàn 2 cột toàn màn hình
                  if (isWide) {
                    setViewMode('tables');
                  } else {
                    handleOpenTablePicker('change', 'Chọn Bàn Phục Vụ', 'Chọn bàn để gán món');
                  }
                }}
                style={[
                  s.tableInfoBadge,
                  {
                    backgroundColor: isUnassigned ? theme.status.warningBg : theme.surface.header,
                    borderColor: isUnassigned ? theme.brand.accent : theme.border.default,
                  },
                ]}
              >
                <Icon
                  name={isUnassigned ? 'table-plus' : 'table-sync'}
                  size={18}
                  color={isUnassigned ? theme.brand.accent : theme.text.primary}
                />
                <AppText
                  variant="sm"
                  weight="medium"
                  color={isUnassigned ? theme.brand.accent : theme.text.primary}
                >
                  {isUnassigned ? 'Gán Bàn' : 'Đổi Bàn'}
                </AppText>
              </TouchableOpacity>

              {/* 2. Trên Tablet/Màn Rộng (isWide) có thể giữ thêm nút Sơ Đồ Bàn vì không gian rộng */}
              {isWide && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Xem sơ đồ bàn"
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  onPress={() => {
                    playTapSound();
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (_) {}
                    }
                    setViewMode('tables');
                  }}
                  style={[
                    s.tableInfoBadge,
                    {
                      backgroundColor: theme.surface.header,
                      borderColor: theme.border.default,
                    },
                  ]}
                >
                  <Icon name="table-chair" size={18} color={theme.text.primary} />
                  <AppText variant="sm" weight="medium" color={theme.text.primary}>
                    Sơ Đồ Bàn
                  </AppText>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      }
    />
  );

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* 🌟 1. TABLET / DESKTOP: CỘT 2 SỬ DỤNG TOÀN BỘ CHIỀU DỌC (FULL VERTICAL HEIGHT) */}
      {isWide ? (
        <View style={[s.workspace, { flexDirection: 'row', flex: 1 }]}>
          {/* CỘT TRÁI: HEADER CHO MENU/BÀN + NỘI DUNG */}
          <View style={[s.menuArea, { flex: 1, backgroundColor: theme.surface.card, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border.subtle }]}>
            {renderHeader()}
            {viewMode === 'tables' ? (
              /* VIEW SƠ ĐỒ BÀN */
              <View style={{ flex: 1 }}>
                <TableOverviewBanner
                  activeStatusFilter={tableStatusFilter}
                  onSelectStatusFilter={setTableStatusFilter}
                  searchQuery={tableSearchQuery}
                  onSearchQueryChange={setTableSearchQuery}
                  areas={dynamicAreas}
                  activeArea={activeArea}
                  areaCounts={areaCounts}
                  onSelectArea={setActiveArea}
                  onOpenManageTables={() => {
                    playTapSound();
                    router.push('/quan-ly-ban' as any);
                  }}
                />
                <TableGridFlashList
                  data={filteredTables}
                  selectedTableId={selectedTable.id}
                  numColumns={tableColumns}
                  onSelectTable={handleSelectTable}
                  onLongPressTable={handleLongPressTable}
                />

                {/* 🌟 THANH TÓM TẮT ĐÁY SƠ ĐỒ BÀN (Triệt tiêu khoảng trống chết, trực quan F&B) */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    backgroundColor: theme.surface.header,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.border.subtle,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.text.muted }} />
                      <AppText variant="xs" color={theme.text.muted}>
                        Tổng: <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>{tables.length}</AppText> bàn
                      </AppText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.brand.success }} />
                      <AppText variant="xs" color={theme.text.muted}>
                        Trống: <AppText variant="xs" weight="bold" color={theme.brand.success} tabularNums>{Math.max(0, tables.length - occupiedCount)}</AppText>
                      </AppText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.brand.primary }} />
                      <AppText variant="xs" color={theme.text.muted}>
                        Có khách: <AppText variant="xs" weight="bold" color={theme.brand.primary} tabularNums>{occupiedCount}</AppText>
                      </AppText>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      router.push('/quan-ly-ban' as any);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Icon name="cog-outline" size={14} color={theme.text.muted} />
                    <AppText variant="xs" color={theme.text.muted}>
                      Sắp xếp & Quản lý bàn
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* VIEW THỰC ĐƠN BÁN HÀNG */
              <ProductCatalogPane
                isWide={isWide}
                selectedTable={selectedTable}
                searchQuery={searchQuery}
                onSetSearchQuery={setSearchQuery}
                onOpenScanner={() => setQRScannerVisible(true)}
                categories={categoriesWithPinned}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                menuLayout={menuLayout}
                onToggleLayout={() => setMenuLayout((prev) => (prev === 'grid' ? 'list' : 'grid'))}
                filteredMenu={filteredMenu}
                cartItemCounts={cartItemCounts}
                outOfStockProductIds={outOfStockProductIds}
                onQuickAdd={handleQuickAdd}
                onAddSize={handleAddSize}
                onQuickDecrement={handleQuickDecrement}
                onCustomize={handleProductPress}
                onToggle86={handleToggle86}
                onBackToTables={() => {
                  playTapSound();
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (_) {}
                  }
                  setViewMode('tables');
                }}
              />
            )}
          </View>

          {/* CỘT PHẢI: GIỎ HÀNG & TẠM TÍNH HOẶC BẢNG CHỌN TOPPING (CART MORPHING) */}
          <View style={{ width: isDesktopLarge ? 480 : isDesktop ? 420 : '38%', height: '100%' }}>
            {modifierVisible && modifierItem ? (
              <InlineModifierPane
                item={modifierItem}
                initialData={editingCartItem}
                onClose={() => {
                  setModifierVisible(false);
                  setModifierItem(null);
                  setEditingCartItem(null);
                }}
                onConfirm={(data) => {
                  if (data.cartItemId) {
                    updateCartItem(data.cartItemId, data);
                  } else {
                    addToCart(data);
                  }
                  setModifierVisible(false);
                  setModifierItem(null);
                  setEditingCartItem(null);
                }}
              />
            ) : (
              <TabletCartPane
                detailWidth="100%"
                orderChannel={orderChannel}
                selectedTable={selectedTable}
                cart={cart}
                totalQty={totalQty}
                subTotal={subTotal}
                discount={discount}
                discountAmount={discountAmount}
                finalTotal={totalAmount}
                viewMode={viewMode}
                onSetViewMode={setViewMode}
                onOpenTableOps={() => setTableOpsVisible(true)}
                onUpdateCartQty={updateCartQty}
                onRemoveCartItem={removeCartItem}
                onOpenVoid={handleOpenVoid}
                onSendKitchen={handleSendKitchen}
                onPrintPreBill={handlePrintPreBill}
                onOpenDiscount={() => setDiscountVisible(true)}
                onPickTable={() => handleOpenTablePicker('change')}
                onCheckout={handleCheckoutFromCart}
                onEditCartItem={(item) => {
                  setEditingCartItem({
                    cartItemId: item.cartItemId,
                    item: item.item,
                    qty: item.qty,
                    selectedSize: item.selectedSize,
                    sugarLevel: item.sugarLevel,
                    iceLevel: item.iceLevel,
                    selectedToppings: item.selectedToppings || [],
                    note: item.note || '',
                    unitPrice: item.unitPrice,
                  });
                  setModifierItem(item.item);
                  setModifierVisible(true);
                }}
                onQuickVietQR={() => {
                  playTapSound();
                  router.push('/cfd');
                }}
              />
            )}
          </View>
        </View>
      ) : (
        /* 🌟 2. MOBILE 1-COLUMN WORKSPACE (!isWide) */
        <View style={{ flex: 1 }}>
          {renderHeader()}
          {viewMode === 'tables' ? (
            <View style={{ flex: 1, position: 'relative' }}>
              <TableOverviewBanner
                areas={dynamicAreas}
                activeArea={activeArea}
                areaCounts={areaCounts}
                onSelectArea={setActiveArea}
                activeStatusFilter={tableStatusFilter}
                onSelectStatusFilter={setTableStatusFilter}
                searchQuery={tableSearchQuery}
                onSearchQueryChange={setTableSearchQuery}
                onOpenScanner={() => setQRScannerVisible(true)}
              />
              <TableGridFlashList
                data={filteredTables}
                selectedTableId={selectedTable.id}
                numColumns={tableColumns}
                onSelectTable={handleSelectTable}
                onLongPressTable={handleLongPressTable}
                onScroll={onScroll}
                contentContainerStyle={{ paddingTop: 6 }}
              />
            </View>
          ) : (
            <View style={[s.workspace, { flexDirection: 'column' }]}>
              <View style={s.menuArea}>
                <ProductCatalogPane
                  isWide={false}
                  selectedTable={selectedTable}
                  searchQuery={searchQuery}
                  onSetSearchQuery={setSearchQuery}
                  onOpenScanner={() => setQRScannerVisible(true)}
                  categories={categoriesWithPinned}
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  menuLayout={menuLayout}
                  onToggleLayout={() => setMenuLayout((prev) => (prev === 'grid' ? 'list' : 'grid'))}
                  filteredMenu={filteredMenu}
                  cartItemCounts={cartItemCounts}
                  outOfStockProductIds={outOfStockProductIds}
                  onQuickAdd={handleQuickAdd}
                  onAddSize={handleAddSize}
                  onQuickDecrement={handleQuickDecrement}
                  onCustomize={handleProductPress}
                  onToggle86={handleToggle86}
                />
              </View>
            </View>
          )}

          {/* MOBILE SMART MORPHING BOTTOM NAVBAR (TỰ ĐỘNG BIẾN HÌNH THEO NGỮ CẢNH) */}
          <BottomNavBar
            onOpenCart={handleOpenCart}
            onFastPay={handleFastPay}
            onSaveOrder={handleSendKitchen}
            onOpenTableOps={handleOpenTableOps}
            onPrintPreBill={handlePrintPreBill}
          />
        </View>
      )}

      {/* 🌟 MODAL 1: BỘ CHỌN TOPPING, SIZE & GHI CHÚ MÓN TOÀN MÀN HÌNH (MỞ TỪ MENU) */}
      <ModifierSheet
        visible={!isWide && modifierVisible}
        item={modifierItem}
        initialData={editingCartItem}
        onClose={() => {
          setModifierVisible(false);
          setEditingCartItem(null);
        }}
        onConfirm={(data) => {
          if (data.cartItemId) {
            updateCartItem(data.cartItemId, data);
          } else {
            addToCart(data);
          }
          setModifierVisible(false);
          setEditingCartItem(null);
        }}
      />

      {/* 🌟 MODAL 2: MÀN HÌNH GIỎ HÀNG TOÀN MÀN HÌNH CHUẨN POS */}
      <FullScreenCartModal
        visible={mobileCartSheetVisible}
        tableName={selectedTable.name}
        tableArea={selectedTable.area}
        cart={cart}
        discount={discount}
        onClose={handleCloseCart}
        onUpdateQty={updateCartQty}
        onRemoveItem={removeCartItem}
        onVoidItem={handleOpenVoid}
        onUpdateCartItem={(cartItemId, data) => {
          updateCartItem(cartItemId, data);
        }}
        onOpenOperations={handleOpenTableOps}
        onSendToKitchen={handleSendKitchen}
        onCheckout={handleCheckoutFromCart}
        onPickTable={() => handleOpenTablePicker('change')}
        onPrintPreBill={handlePrintPreBill}
        onOpenDiscount={() => setDiscountVisible(true)}
      />

      {/* MODAL 3: TÁC VỤ BÀN (CHUYỂN BÀN, GỘP BÀN, IN TẠM TÍNH) */}
      <TableOperationsModal
        visible={tableOpsVisible}
        onClose={() => setTableOpsVisible(false)}
        onOpenDiscount={() => setDiscountVisible(true)}
        onPrintPreBill={handlePrintPreBill}
      />

      {/* MODAL 5: HỦY MÓN ĐÃ GỬI BẾP */}
      <VoidItemModal
        visible={voidModalVisible}
        item={itemToVoid}
        onClose={() => setVoidModalVisible(false)}
        onConfirmVoid={(id, reason) => voidItem(id, reason)}
      />

      {/* MODAL 6: CHIẾT KHẤU & GIẢM GIÁ */}
      <DiscountModal
        visible={discountVisible}
        onClose={() => setDiscountVisible(false)}
      />

      {/* MODAL 7: QUÉT MÃ QR CODE BÀN & KHÁCH HÀNG */}
      <QRScannerModal
        visible={qrScannerVisible}
        tableName={selectedTable.name}
        onClose={() => setQRScannerVisible(false)}
        onScanItem={handleScanItem}
      />

      {/* 🌟 MODAL 8: CHỌN BÀN PHỤC VỤ (KHI LƯU ĐƠN / THANH TOÁN / GÁN BÀN) */}
      <TablePickerModal
        visible={tablePickerVisible}
        title={tablePickerTitle}
        subtitle={tablePickerSubtitle}
        onClose={() => {
          setTablePickerVisible(false);
          setPendingTableAction(null);
        }}
        onSelectTable={handleSelectTableFromPicker}
        currentTableId={selectedTable.id}
        cartItemCount={cart.reduce((sum, c) => sum + c.qty, 0)}
        cartTotalAmount={cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0)}
      />

          </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  brandSection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  takeawayHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tableInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  workspace: { flex: 1 },
  menuArea: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 4,
    paddingLeft: 14,
    paddingRight: 6,
    height: 46,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, height: '100%' },
  qrInlineBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryAndToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  customItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  layoutToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  categoryScroll: { paddingHorizontal: 12, paddingVertical: 6, gap: 8, alignItems: 'center' },
  catChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartArea: { borderLeftWidth: StyleSheet.hairlineWidth },
  cartHeaderBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  opsTriggerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  emptyCartBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  cartSummary: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mobileSheetCard: { width: '100%', maxWidth: 520, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  mobileSheetFooter: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  menuNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backToTablesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  currentTableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyCartIconSquircle: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
});

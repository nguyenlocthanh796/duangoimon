import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { colors, font, shape } from '../../lib/theme';
import { formatPrice } from '../../lib/utils/format';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useToast } from '../../lib/context/ToastContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useTableOrder } from '../../lib/hooks/useTableOrder';
import { usePOSSettings } from '../../lib/hooks/usePOSSettings';
import TableCard from '../../lib/components/pos/TableCard';
import TableScreenHeader from '../../lib/components/pos/TableScreenHeader';
import CategoryTabs from '../../lib/components/pos/CategoryTabs';
import ProductGrid from '../../lib/components/pos/ProductGrid';
import CartPanel from '../../lib/components/pos/CartPanel';
import AreaFilter from '../../lib/components/pos/AreaFilter';
import OrderHeader from '../../lib/components/pos/OrderHeader';

const ModifierSheet = React.lazy(() => import('../../lib/components/pos/ModifierSheet'));
import OverviewPanel from '../../lib/components/pos/OverviewPanel';
import AppText from '../../lib/components/ui/AppText';
import type { Table, TableStatus } from '../../lib/components/pos/TableCard';
import { subscribeRealtimeSync } from '../../lib/sync/realtimeSync';
import { normalizeAreaName } from '../../lib/utils/area';
import { invalidateCache } from '../../lib/api/cache';

export default function TableSelection() {
  const { openSidebar } = useSidebar();
  const { settings } = usePOSSettings();
  const gutter = 12; // Gap between table cards
  const hPad = 12;   // Horizontal padding around grid
  const gridPaddingBottom = 32;
  const insets = useSafeAreaInsets();
  const { isWide, isLandscape, width, breakpoint, containerWidth } = useResponsive();
  const params = useLocalSearchParams<{
    payment_success?: string;
    tableName?: string;
    total?: string;
    methodLabel?: string;
  }>();
  const { showToast } = useToast();

  useFocusEffect(
    useCallback(() => {
      if (params.payment_success === 'true') {
        const successTable = params.tableName || '';
        const successTotal = params.total || '0';
        const successMethod = params.methodLabel || 'Tiền mặt';

        invalidateCache();
        setSelectedTable(null);

        showToast({
          message: `Thanh toán thành công ${successTable}`,
          subMessage: `Tổng: ${formatPrice(Number(successTotal))} đ · ${successMethod}`,
          type: 'success',
          duration: 2000,
        });

        // Clear parameters from url so they don't pop up again
        router.setParams({
          payment_success: undefined,
          tableName: undefined,
          total: undefined,
          methodLabel: undefined,
        });

        loadData(false, false);
      }
    }, [params.payment_success, showToast])
  );

  const [selectedTable, setSelectedTable] = useState<{ id: string; name: string } | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState('Tất cả');
  const [leftPanelWidth, setLeftPanelWidth] = useState(containerWidth);
  const [currentTime, setCurrentTime] = useState(Date.now());
  // Single 60s interval — replaces per-TableCard setInterval
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const orderState = useTableOrder(selectedTable?.id || '', selectedTable?.name || '', () => {
    setSelectedTable(null);
    loadData();
  });
  const {
    products: menuProducts,
    loading: menuLoading,
    filteredItems,
    searchQuery,
    setSearchQuery,
    cart,
    total,
    itemCount,
    submitting,
    cartSheet,
    setCartSheet,
    activeCategory,
    setActiveCategory,
    modalItem,
    modalQty,
    setModalQty,
    modalSize,
    setModalSize,
    modalToppings,
    setModalToppings,
    modalNote,
    setModalNote,
    modalPrice,
    getItemCartCount,
    handleProductPress,
    quickAdd,
    quickSubtract,
    updateQty,
    removeItem,
    handleSendToKitchen,
    handleSaveTable,
    handlePay,
    handlePrintTemporary,
    handleEditNote,
    setQty,
    cancelItem,
    moveItem,
    moveItemToTable,
    splitBill,
    mergeBill,
    moveTable,
    splitTable,
    mergeTable,
    openModifierForEdit,
    saveEditFromModal,
    addToCartFromModal,
    closeModifierSheet,
    toggleServiceType,
  } = orderState;

  const isSplitLayout = breakpoint !== 'mobile';
  const CARD_COLS = breakpoint === 'mobile' ? 2 : breakpoint === 'tablet-portrait' ? 3 : 4;
  const panelWidth = isSplitLayout ? leftPanelWidth : containerWidth;
  const cardWidth = Math.floor((panelWidth - hPad * 2 - gutter * (CARD_COLS - 1)) / CARD_COLS);

  const initialLoadedRef = useRef(false);

  const loadData = useCallback(async (isRefresh = false, isSilent = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!isSilent && !initialLoadedRef.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const [tableData, orders] = await Promise.all([
        api.getTables(),
        api.getOrders().catch(() => []),
      ]);
      const orderTotals: Record<string, number> = {};
      const orderItemCounts: Record<string, number> = {};
      const orderTimes: Record<string, string> = {};
      const earliestOrderCreatedAt: Record<string, string> = {};

      const ACTIVE_STATUSES = new Set(['moi', 'gui_bep', 'dang_lam', 'hoan_thanh']);

      (orders || []).forEach((o: any) => {
        if (ACTIVE_STATUSES.has(o.status) && o.table_id) {
          orderTotals[o.table_id] = (orderTotals[o.table_id] || 0) + Number(o.total_amount);
          const qtySum = (o.items || []).reduce(
            (sum: number, item: any) => sum + Number(item.quantity || 0),
            0
          );
          orderItemCounts[o.table_id] = (orderItemCounts[o.table_id] || 0) + qtySum;

          if (o.created_at) {
            try {
              const date = new Date(o.created_at);
              const timeStr = date.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              });
              orderTimes[o.table_id] = timeStr;
              // Track earliest created_at per table
              if (!earliestOrderCreatedAt[o.table_id] || new Date(o.created_at) < new Date(earliestOrderCreatedAt[o.table_id])) {
                earliestOrderCreatedAt[o.table_id] = o.created_at;
              }
            } catch {
              orderTimes[o.table_id] = '--:--';
            }
          }
        }
      });

      const newTables: Table[] = tableData.map((t: any) => {
        const hasActiveOrder = (orderItemCounts[t.id] || 0) > 0 || (orderTotals[t.id] || 0) > 0;
        return {
          id: t.id,
          name: t.name,
          capacity: t.capacity || 4,
          area: normalizeAreaName(t.area || t.location),
          status: (hasActiveOrder ? 'co_khach' : 'trong') as TableStatus,
          orderTotal: hasActiveOrder ? orderTotals[t.id] : undefined,
          orderItemCount: hasActiveOrder ? orderItemCounts[t.id] : 0,
          orderTime: hasActiveOrder ? orderTimes[t.id] : undefined,
          createdAt: hasActiveOrder ? earliestOrderCreatedAt[t.id] : undefined,
        };
      });

      setTables((prev) => {
        if (prev.length === newTables.length) {
          const newMap = new Map(newTables.map((t) => [t.id, t]));
          const isSame = prev.every((pt) => {
            const nt = newMap.get(pt.id);
            return (
              nt !== undefined &&
              pt.name === nt.name &&
              pt.status === nt.status &&
              pt.orderTotal === nt.orderTotal &&
              pt.orderItemCount === nt.orderItemCount &&
              pt.orderTime === nt.orderTime &&
              pt.area === nt.area
            );
          });
          if (isSame) return prev;
        }
        return newTables;
      });
      initialLoadedRef.current = true;
    } catch (e: any) {
      if (!isSilent) setError(e?.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeRealtimeSync(() => loadData(false, true));
    return () => unsubscribe();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData(false, initialLoadedRef.current);
      const timer = setInterval(() => {
        loadData(false, true);
      }, 30000);
      return () => clearInterval(timer);
    }, [loadData])
  );

  const areas = [
    'Tất cả',
    ...Array.from(new Set(tables.map((t) => t.area).filter(Boolean) as string[])),
  ];

  const sortedTables = [...tables].sort((a, b) => {
    const areaA = a.area || '',
      areaB = b.area || '';
    if (areaA !== areaB) return areaA.localeCompare(areaB);
    return a.name.localeCompare(b.name);
  });
  const displayTables = sortedTables.filter(
    (t) => selectedArea === 'Tất cả' || t.area === selectedArea
  );

  const handleTablePress = (table: Table) => {
    if (isSplitLayout) {
      // Defer to let touch event complete before state change unmounts FlatList
      requestAnimationFrame(() => setSelectedTable({ id: table.id, name: table.name }));
    } else
      router.push(`/ban-hang/pos?tableId=${table.id}&tableName=${encodeURIComponent(table.name)}`);
  };

  const renderTableGrid = () => {
    if (loading)
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8}}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <AppText variant="sm" color={colors.text.muted}>Đang tải...</AppText>
        </View>
      );
    if (error)
      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingHorizontal: 12,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              backgroundColor: colors.surface.danger,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="cloud-off-outline" size={28} color={colors.text.danger} />
          </View>
          <AppText variant="lg" color={colors.text.primary} style={{ textAlign: 'center' }}>
            Không thể kết nối
          </AppText>
          <AppText variant="sm" color={colors.text.muted} style={{ textAlign: 'center' }}>
            {error}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity
              onPress={() => loadData()}
              style={{
                paddingHorizontal: 16,
                minHeight: 44,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.brand.primary,
                borderRadius: 8,
              }}
            >
              <AppText variant="md" weight="bold" color={colors.text.inverse}>Thử lại</AppText>
            </TouchableOpacity>

            {(error?.includes('Unauthorized') || error?.includes('401') || error?.includes('Forbidden')) && (
              <TouchableOpacity
                onPress={() => {
                  try {
                    const { clearToken } = require('../../lib/api/client');
                    clearToken();
                  } catch {}
                  router.replace('/login');
                }}
                style={{
                  paddingHorizontal: 16,
                  minHeight: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: colors.surface.card,
                  borderWidth: 1,
                  borderColor: colors.border.brand,
                  borderRadius: 8,
                }}
              >
                <AppText variant="md" weight="bold" color={colors.brand.primary}>Đăng nhập lại</AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );

    // Group tables by area
    const groupedAreas: { name: string; tables: Table[] }[] = [];
    const areaMap: Record<string, Table[]> = {};

    displayTables.forEach((t) => {
      const areaName = t.area || 'Bàn Khác';
      if (!areaMap[areaName]) {
        areaMap[areaName] = [];
      }
      areaMap[areaName].push(t);
    });

    Object.keys(areaMap).sort().forEach((name) => {
      groupedAreas.push({ name, tables: areaMap[name] });
    });

    const boxAvailWidth = panelWidth - 26; // Account for scrollview padding, cardbox border & internal padding
    const calculatedCardWidth = Math.floor((boxAvailWidth - gutter * (CARD_COLS - 1)) / CARD_COLS);

    if (tables.length === 0 || displayTables.length === 0) {
      return (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={colors.brand.primary}
              colors={[colors.brand.primary]}
            />
          }
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 8,
              backgroundColor: colors.surface.disabled,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Icon name="table-furniture" size={32} color={colors.border.strong} />
          </View>
          <AppText variant="lg" color={colors.text.primary} style={{ marginBottom: 4 }}>
            {tables.length === 0 ? 'Chưa có bàn nào' : 'Không tìm thấy bàn'}
          </AppText>
          <AppText
            variant="sm"
            color={colors.text.muted}
            style={{
              textAlign: 'center',
              paddingHorizontal: 12,
            }}
          >
            {tables.length === 0
              ? 'Thêm bàn trong phần cài đặt hoặc kiểm tra kết nối backend'
              : 'Hãy thử đổi bộ lọc khu vực khác'}
          </AppText>
        </ScrollView>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <AreaFilter areas={areas} selectedArea={selectedArea} onSelectArea={setSelectedArea} />
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={colors.brand.primary}
              colors={[colors.brand.primary]}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 6, // Strict Flat Skills UI V2 6px edge-to-edge
            paddingTop: 6,
            gap: 8,
            paddingBottom: 100 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          {groupedAreas.map((group) => (
            /* CardBox Độc Lập (ss.sectionWrap style) */
            <View
              key={group.name}
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E9F0',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              {/* Tiêu Đề Nhóm (ss.sectionHeader style) */}
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderColor: '#E5E9F0',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <AppText variant="md" weight="bold" color="#1E293B">
                  {group.name}
                </AppText>
                {/* Badge đếm số lượng nhã nhặn */}
                <View
                  style={{
                    backgroundColor: '#F1F5F9',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <AppText variant="xs" color="#64748B">
                    {group.tables.length} bàn
                  </AppText>
                </View>
              </View>

              {/* Grid Content */}
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  paddingHorizontal: 6,
                  paddingVertical: 8,
                  gap: gutter,
                }}
              >
                {group.tables.map((tableItem) => (
                  <View key={tableItem.id} style={{ width: calculatedCardWidth }}>
                    <TableCard
                      table={tableItem}
                      selected={selectedTable?.id === tableItem.id}
                      onPress={() => handleTablePress(tableItem)}
                      isWide={isWide}
                      cardWidth={calculatedCardWidth}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={isWide ? ['top', 'left', 'right', 'bottom'] : ['left', 'right']}
      style={{ flex: 1, backgroundColor: colors.surface.app }}
    >
      {isSplitLayout ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View
            style={{ flex: 62, position: 'relative', backgroundColor: colors.surface.app }}
            onLayout={(e) => setLeftPanelWidth(e.nativeEvent.layout.width)}
          >
            {/* Subtle shadow separator */}
            <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, backgroundColor: colors.border.default, zIndex: 10 }} />
            {selectedTable ? (
              <>
                <OrderHeader
                  tableName={selectedTable.name}
                  itemsCount={itemCount}
                  productsCount={menuProducts.length}
                  isWide={isWide}
                  onClose={() => setSelectedTable(null)}
                  onOpenSidebar={openSidebar}
                />
                <CategoryTabs
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  isWide={isWide}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
                <ScrollView
                  style={{ flex: 1, marginTop: 4 }}
                  contentContainerStyle={{ paddingVertical: 12, paddingBottom: 32 }}
                  showsVerticalScrollIndicator={false}
                >
                  <ProductGrid
                    products={filteredItems}
                    loading={menuLoading}
                    isWide={isWide}
                    breakpoint={breakpoint}
                    panelWidth={leftPanelWidth}
                    onProductPress={handleProductPress}
                    onQuickAdd={quickAdd}
                    onQuickSubtract={quickSubtract}
                    getItemCartCount={getItemCartCount}
                    menuLayoutMode={settings.menuLayoutMode}
                  />
                </ScrollView>
              </>
            ) : (
              <>
                <TableScreenHeader
                  tablesCount={tables.length}
                  isWide={isWide}
                  onOpenSidebar={openSidebar}
                  onRefresh={() => loadData(true)}
                  lastRefreshTime={new Date().toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  onTakeaway={() => setSelectedTable({ id: 'TAKEAWAY', name: 'Mang Về' })}
                />
                <View style={{ flex: 1 }}>{renderTableGrid()}</View>
              </>
            )}
          </View>

          <View style={{ flex: 38, backgroundColor: colors.surface.card }}>
            {selectedTable ? (
              <CartPanel
                cart={cart}
                total={total}
                itemCount={itemCount}
                onUpdateQty={updateQty}
                onSetQty={setQty}
                onRemoveItem={removeItem}
                onCancelItem={cancelItem}
                onMoveItem={moveItem}
                onMoveItemToTable={moveItemToTable}
                onSplitBill={splitBill}
                onMergeBill={mergeBill}
                onMoveTable={moveTable}
                onSplitTable={splitTable}
                onMergeTable={mergeTable}
                onOpenModifier={openModifierForEdit}
                onSendToKitchen={handleSendToKitchen}
                onSaveTable={handleSaveTable}
                onPay={handlePay}
                onPrintTemporary={handlePrintTemporary}
                submitting={submitting}
                isWide={isWide}
                cartSheet={cartSheet}
                setCartSheet={setCartSheet}
                onToggleServiceType={toggleServiceType}
                onEditNote={handleEditNote}
                serviceChargePercent={0}
                tableId={selectedTable?.id}
              />
            ) : (
              <OverviewPanel
                tables={tables}
                onTablePress={handleTablePress}
              />
            )}
          </View>
        </View>
      ) : (
        <>
          <TableScreenHeader
            tablesCount={tables.length}
            isWide={isWide}
            onOpenSidebar={openSidebar}
            onRefresh={() => loadData(true)}
            lastRefreshTime={new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
          {renderTableGrid()}
        </>
      )}

      {isSplitLayout && (
        <Suspense fallback={null}>
          <ModifierSheet
            modalItem={modalItem}
            modalQty={modalQty}
            setModalQty={setModalQty}
            modalSize={modalSize}
            setModalSize={setModalSize}
            modalToppings={modalToppings}
            setModalToppings={setModalToppings}
            modalNote={modalNote}
            setModalNote={setModalNote}
            modalPrice={modalPrice}
            isWide={isWide}
            onClose={closeModifierSheet}
            onSave={saveEditFromModal}
            onAdd={addToCartFromModal}
          />
        </Suspense>
      )}
    </SafeAreaView>
  );
}

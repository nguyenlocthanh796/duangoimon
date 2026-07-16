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
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { colors, font, shape } from '../../lib/theme';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useTableOrder } from '../../lib/hooks/useTableOrder';
import TableCard from '../../lib/components/pos/TableCard';
import TableScreenHeader from '../../lib/components/pos/TableScreenHeader';
import CategoryTabs from '../../lib/components/pos/CategoryTabs';
import ProductGrid from '../../lib/components/pos/ProductGrid';
import CartPanel from '../../lib/components/pos/CartPanel';
import ModifierSheet from '../../lib/components/pos/ModifierSheet';
import AreaFilter from '../../lib/components/pos/AreaFilter';
import OrderHeader from '../../lib/components/pos/OrderHeader';
import type { Table, TableStatus } from '../../lib/components/pos/TableCard';

export default function TableSelection() {
  const { openSidebar } = useSidebar();
  const gutter = 0; // Flat Grid style
  const hPad = 0;
  const insets = useSafeAreaInsets();
  const { isWide, isLandscape, width, breakpoint, containerWidth } = useResponsive();
  const [selectedTable, setSelectedTable] = useState<{ id: string; name: string } | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState('Tất cả');
  const [leftPanelWidth, setLeftPanelWidth] = useState(containerWidth);

  const orderState = useTableOrder(selectedTable?.id || '', selectedTable?.name || '', () => {
    setSelectedTable(null);
    loadData();
  });
  const {
    products: menuProducts,
    loading: menuLoading,
    filteredItems,
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
  const CARD_COLS = breakpoint === 'mobile' || breakpoint === 'tablet-portrait' ? 3 : 4;
  const panelWidth = isSplitLayout ? leftPanelWidth : containerWidth;
  const cardWidth = Math.floor((panelWidth - hPad * 2 - gutter * (CARD_COLS - 1)) / CARD_COLS);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [tableData, orders] = await Promise.all([
        api.getTables(),
        api.getOrders().catch(() => []),
      ]);
      const orderTotals: Record<string, number> = {};
      const orderItemCounts: Record<string, number> = {};
      const orderTimes: Record<string, string> = {};

      (orders || []).forEach((o: any) => {
        if (o.status !== 'da_thanh_toan' && o.table_id) {
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
            } catch {
              orderTimes[o.table_id] = '--:--';
            }
          }
        }
      });

      setTables(
        tableData.map((t: any) => ({
          id: t.id,
          name: t.name,
          capacity: t.capacity || 4,
          area: t.area || t.location || undefined,
          status: (t.status === 'dang_su_dung' ? 'co_khach' : t.status) as TableStatus,
          orderTotal: orderTotals[t.id],
          orderItemCount: orderItemCounts[t.id] || 0,
          orderTime: orderTimes[t.id] || undefined,
        }))
      );
    } catch (e: any) {
      setError(e?.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
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
          <ActivityIndicator size="large" color={'#F97316'} />
          <Text style={{ ...font.bodySmall, color: '#737373' }}>Đang tải...</Text>
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
          <Text style={{ ...font.sectionTitle, color: '#171717', textAlign: 'center' }}>
            Không thể kết nối
          </Text>
          <Text style={{ ...font.caption, color: '#737373', textAlign: 'center' }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => loadData()}
            style={{
              paddingHorizontal: 12,
              minHeight: 40,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#F97316',
              borderRadius: 8,
            }}
          >
            <Text style={{ ...font.buttonSmall, color: colors.text.inverse }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    return (
      <View style={{ flex: 1 }}>
        <AreaFilter areas={areas} selectedArea={selectedArea} onSelectArea={setSelectedArea} />
        <FlatList
          key={`cols-${CARD_COLS}`}
          data={displayTables}
          numColumns={CARD_COLS}
          extraData={`${cardWidth}-${selectedTable?.id}`}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ gap: gutter, justifyContent: 'center' }}
          contentContainerStyle={{
            paddingHorizontal: hPad,
            paddingTop: 0,
            paddingBottom: 32 + insets.bottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={'#F97316'}
              colors={['#F97316']}
            />
          }
          ListHeaderComponent={null}
          renderItem={({ item }) => (
            <View style={{ width: cardWidth }}>
              <TableCard
                table={item}
                selected={selectedTable?.id === item.id}
                onPress={() => handleTablePress(item)}
                isWide={isWide}
                cardWidth={cardWidth}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={{ paddingTop: 60, alignItems: 'center', gap: 8}}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  backgroundColor: '#F5F5F5',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="table-furniture" size={32} color={colors.border.strong} />
              </View>
              <Text style={{ ...font.sectionTitle, color: '#171717' }}>
                {tables.length === 0 ? 'Chưa có bàn nào' : 'Không tìm thấy bàn'}
              </Text>
              <Text
                style={{
                  ...font.caption,
                  color: '#737373',
                  textAlign: 'center',
                  paddingHorizontal: 12,
                }}
              >
                {tables.length === 0
                  ? 'Thêm bàn trong phần cài đặt hoặc kiểm tra kết nối backend'
                  : 'Không tìm thấy bàn'}
              </Text>
            </View>
          }
        />
      </View>
    );
  };

  // iPad Landscape / Desktop: 62/38 Master-Detail Split Layout
  if (isSplitLayout) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View
            style={{ flex: 62, borderRightWidth: 1, borderColor: '#E5E5E5' }}
            onLayout={(e) => setLeftPanelWidth(e.nativeEvent.layout.width)}
          >
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

          <View style={{ flex: 38, backgroundColor: '#FFFFFF' }}>
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
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                    backgroundColor: '#F5F5F5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Icon name="cart-outline" size={40} color={'#737373'} />
                </View>
                <Text style={{ ...font.sectionTitle, color: '#171717', marginBottom: 4 }}>
                  Giỏ hàng
                </Text>
                <Text
                  style={{
                    ...font.bodySmall,
                    color: '#737373',
                    textAlign: 'center',
                    paddingHorizontal: 40,
                  }}
                >
                  Chọn bàn và gọi món để xem giỏ hàng
                </Text>
              </View>
            )}
          </View>
        </View>

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
      </View>
    );
  }

  // Mobile
  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={{ flex: 1, backgroundColor: '#FAFAFA' }}
    >
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
    </SafeAreaView>
  );
}

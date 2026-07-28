import React, { useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { useSidebar } from '../../context/SidebarContext';
import { useTableOrder } from '../../hooks/useTableOrder';
import { usePOSSettings } from '../../hooks/usePOSSettings';
import CategoryTabs from './CategoryTabs';
import ProductGrid from './ProductGrid';
import CartPanel from './CartPanel';
import MobileCartBar from './MobileCartBar';
import ModifierSheet from './ModifierSheet';
import OrderHeader from './OrderHeader';

interface POSOrderScreenProps {
  tableId: string;
  tableName: string;
  onClose?: () => void;
}

export default function POSOrderScreen({ tableId, tableName, onClose }: POSOrderScreenProps) {
  const { openSidebar } = useSidebar();
  const { settings } = usePOSSettings();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isWide = SCREEN_WIDTH > 768;
  const breakpoint =
    SCREEN_WIDTH > 1200
      ? 'desktop'
      : SCREEN_WIDTH > 1024
        ? 'tablet-landscape'
        : SCREEN_WIDTH > 768
          ? 'tablet-portrait'
          : 'mobile';
  const panelWidth = isWide ? SCREEN_WIDTH * 0.65 : SCREEN_WIDTH;

  const ord = useTableOrder(tableId, tableName, onClose);

  const filteredItems = useMemo(
    () =>
      ord.activeCategory === 'all'
        ? ord.products
        : ord.products.filter((i) => i.category === ord.activeCategory),
    [ord.activeCategory, ord.products]
  );

  if (ord.loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.app,
        }}
      >
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={{ flex: 1, backgroundColor: colors.surface.app }}
    >
      <OrderHeader
        tableName={tableName}
        itemsCount={ord.itemCount}
        productsCount={ord.products.length}
        isWide={isWide}
        onClose={onClose}
        onOpenSidebar={openSidebar}
      />

      <CategoryTabs
        activeCategory={ord.activeCategory}
        onSelectCategory={ord.setActiveCategory}
        isWide={isWide}
      />

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.surface.app }}>
          <View
            style={{
              flex: 7,
              position: 'relative',
              borderRightWidth: 1,
              borderRightColor: colors.border.default,
            }}
          >
            <ProductGrid
              products={filteredItems}
              loading={ord.loading}
              isWide={isWide}
              breakpoint={breakpoint}
              panelWidth={panelWidth}
              onProductPress={ord.handleProductPress}
              onQuickAdd={ord.quickAdd}
              onQuickSubtract={ord.quickSubtract}
              getItemCartCount={ord.getItemCartCount}
              menuLayoutMode={settings.menuLayoutMode}
            />
          </View>
          <View style={{ flex: 3, backgroundColor: colors.surface.card }}>
            <CartPanel
              cart={ord.cart}
              total={ord.total}
              itemCount={ord.itemCount}
              onUpdateQty={ord.updateQty}
              onSetQty={ord.setQty}
              onRemoveItem={ord.removeItem}
              onCancelItem={ord.cancelItem}
              onMoveItem={ord.moveItem}
              onMoveItemToTable={ord.moveItemToTable}
              onSplitBill={ord.splitBill}
              onMergeBill={ord.mergeBill}
              onMoveTable={ord.moveTable}
              onSplitTable={ord.splitTable}
              onMergeTable={ord.mergeTable}
              onOpenModifier={ord.openModifierForEdit}
              onSendToKitchen={ord.handleSendToKitchen}
              onSaveTable={ord.handleSaveTable}
              onPay={ord.handlePay}
              onPrintTemporary={ord.handlePrintTemporary}
              submitting={ord.submitting}
              isWide={isWide}
              cartSheet={ord.cartSheet}
              setCartSheet={ord.setCartSheet}
              onToggleServiceType={ord.toggleServiceType}
              onEditNote={ord.handleEditNote}
              tableId={tableId}
            />
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <ProductGrid
            products={filteredItems}
            loading={ord.loading}
            isWide={isWide}
            breakpoint={breakpoint}
            panelWidth={panelWidth}
            onProductPress={ord.handleProductPress}
            onQuickAdd={ord.quickAdd}
            onQuickSubtract={ord.quickSubtract}
            getItemCartCount={ord.getItemCartCount}
            menuLayoutMode={settings.menuLayoutMode}
          />
          <MobileCartBar
            itemCount={ord.itemCount}
            total={ord.total}
            onPress={() => ord.setCartSheet(true)}
            onSendToKitchen={ord.handleSendToKitchen}
            onSave={ord.handleSaveTable}
            onPay={ord.handlePay}
            submitting={ord.submitting}
            hasUnsentItems={ord.cart.some(
              (i) =>
                !(i.isSent && i.status && !['moi', undefined, ''].includes(i.status)) &&
                !i.cancelReason
            )}
          />

          <CartPanel
            cart={ord.cart}
            total={ord.total}
            itemCount={ord.itemCount}
            onUpdateQty={ord.updateQty}
            onSetQty={ord.setQty}
            onRemoveItem={ord.removeItem}
            onCancelItem={ord.cancelItem}
            onMoveItem={ord.moveItem}
            onMoveItemToTable={ord.moveItemToTable}
            onSplitBill={ord.splitBill}
            onMergeBill={ord.mergeBill}
            onMoveTable={ord.moveTable}
            onSplitTable={ord.splitTable}
            onMergeTable={ord.mergeTable}
            onOpenModifier={ord.openModifierForEdit}
            onSendToKitchen={ord.handleSendToKitchen}
            onSaveTable={ord.handleSaveTable}
            onPay={ord.handlePay}
            onPrintTemporary={ord.handlePrintTemporary}
            submitting={ord.submitting}
            isWide={isWide}
            cartSheet={ord.cartSheet}
            setCartSheet={ord.setCartSheet}
            onToggleServiceType={ord.toggleServiceType}
            onEditNote={ord.handleEditNote}
            tableId={tableId}
            tableName={tableName}
          />
        </View>
      )}

      <ModifierSheet
        modalItem={ord.modalItem}
        modalQty={ord.modalQty}
        setModalQty={ord.setModalQty}
        modalSize={ord.modalSize}
        setModalSize={ord.setModalSize}
        modalToppings={ord.modalToppings}
        setModalToppings={ord.setModalToppings}
        modalNote={ord.modalNote}
        setModalNote={ord.setModalNote}
        modalPrice={ord.modalPrice}
        isWide={isWide}
        onClose={ord.closeModifierSheet}
        onSave={ord.saveEditFromModal}
        onAdd={ord.addToCartFromModal}
      />
    </SafeAreaView>
  );
}

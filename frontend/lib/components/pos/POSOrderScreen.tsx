import React, { useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { useSidebar } from '../../context/SidebarContext';
import { useTableOrder } from '../../hooks/useTableOrder';
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
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isWide = SCREEN_WIDTH > 768;
  const breakpoint = SCREEN_WIDTH > 1200 ? 'desktop'
    : SCREEN_WIDTH > 1024 ? 'tablet-landscape'
    : SCREEN_WIDTH > 768 ? 'tablet-portrait'
    : 'mobile';
  const panelWidth = isWide ? SCREEN_WIDTH * 0.65 : SCREEN_WIDTH;

  const ord = useTableOrder(tableId, tableName, onClose);

  const filteredItems = useMemo(() =>
    ord.activeCategory === 'all' ? ord.products : ord.products.filter(i => i.category === ord.activeCategory),
    [ord.activeCategory, ord.products]);

  if (ord.loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface.app }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
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
          <View style={{ flex: 6, position: 'relative', borderRightWidth: 1, borderRightColor: colors.border.default }}>
            <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 12, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              <ProductGrid
                products={filteredItems}
                loading={ord.loading}
                isWide={isWide}
                breakpoint={breakpoint}
                panelWidth={panelWidth}
                onProductPress={ord.handleProductPress}
                getItemCartCount={ord.getItemCartCount}
              />
            </ScrollView>
          </View>
          <View style={{ flex: 4, backgroundColor: colors.surface.card }}>
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
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 6, paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
            <ProductGrid
              products={filteredItems}
              loading={ord.loading}
              isWide={isWide}
              breakpoint={breakpoint}
              panelWidth={panelWidth}
              onProductPress={ord.handleProductPress}
              getItemCartCount={ord.getItemCartCount}
            />
          </ScrollView>

          <MobileCartBar
            itemCount={ord.itemCount}
            total={ord.total}
            onPress={() => ord.setCartSheet(true)}
            onSave={ord.handleSaveTable}
            onPay={ord.handlePay}
            submitting={ord.submitting}
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
            submitting={ord.submitting}
            isWide={isWide}
            cartSheet={ord.cartSheet}
            setCartSheet={ord.setCartSheet}
            onToggleServiceType={ord.toggleServiceType}
            onEditNote={ord.handleEditNote}
            tableId={tableId}
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

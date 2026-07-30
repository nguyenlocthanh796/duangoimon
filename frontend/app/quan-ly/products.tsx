import { useState } from 'react';
import { StyleSheet } from 'react-native';
import PageShell from '../../lib/components/quan-ly/PageShell';

// Import sub-routes
import MenuScreen from './_menu';
import OptionCategoryManager from '../../lib/components/quan-ly/menu/OptionCategoryManager';
import RecipesScreen from './_recipes';
import StockScreen from './_stock';
import SuppliersScreen from './_suppliers';
import PurchaseOrdersScreen from './_purchase-orders';

const tabs = [
  { id: 'menu', name: 'Thực đơn', icon: 'food' },
  { id: 'categoriesOptions', name: 'Danh mục', icon: 'shape-outline' },
  { id: 'recipes', name: 'Công thức', icon: 'flask-outline' },
  { id: 'stock', name: 'Tồn kho', icon: 'package-variant-closed' },
  { id: 'suppliers', name: 'Nhà cung cấp', icon: 'truck-delivery' },
  { id: 'purchaseOrders', name: 'Nhập hàng', icon: 'file-document-outline' },
];

const searchableTabs = ['menu', 'recipes', 'stock', 'suppliers', 'purchaseOrders'];

export default function ProductsModule() {
  return (
    <PageShell
      title="Sản phẩm & Kho hàng"
      subtitle="Quản lý thực đơn, danh mục, topping size & đơn nhập kho"
      tabs={tabs}
      searchableTabIds={searchableTabs}
      renderContent={(activeTab, isSearchOpen) => {
        switch (activeTab) {
          case 'menu': return <MenuScreen isSearchOpen={isSearchOpen} />;
          case 'categoriesOptions': return <OptionCategoryManager isSearchOpen={isSearchOpen} />;
          case 'recipes': return <RecipesScreen isSearchOpen={isSearchOpen} />;
          case 'stock': return <StockScreen isSearchOpen={isSearchOpen} />;
          case 'suppliers': return <SuppliersScreen isSearchOpen={isSearchOpen} />;
          case 'purchaseOrders': return <PurchaseOrdersScreen isSearchOpen={isSearchOpen} />;
          default: return null;
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentWrap: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    position: 'relative',
    zIndex: 10,
  },
});

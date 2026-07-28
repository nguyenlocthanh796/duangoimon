import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { useSidebar } from '../../lib/context/SidebarContext';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ModuleTabs, { ModuleTab } from '../../lib/components/quan-ly/ModuleTabs';

// Import sub-routes
import MenuScreen from './_menu';
import OptionCategoryManager from '../../lib/components/quan-ly/menu/OptionCategoryManager';
import RecipesScreen from './_recipes';
import StockScreen from './_stock';
import SuppliersScreen from './_suppliers';
import PurchaseOrdersScreen from './_purchase-orders';

const tabs: ModuleTab[] = [
  { id: 'menu', name: 'Thực đơn', icon: 'food' },
  { id: 'categoriesOptions', name: 'Danh mục', icon: 'shape-outline' },
  { id: 'recipes', name: 'Công thức', icon: 'flask-outline' },
  { id: 'stock', name: 'Tồn kho', icon: 'package-variant-closed' },
  { id: 'suppliers', name: 'Nhà cung cấp', icon: 'truck-delivery' },
  { id: 'purchaseOrders', name: 'Nhập hàng', icon: 'file-document-outline' },
];

export default function ProductsModule() {
  const { openSidebar } = useSidebar();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [activeTab, setActiveTab] = useState('menu');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchableTabs = ['menu', 'recipes', 'stock', 'suppliers', 'purchaseOrders'];
  const isSearchable = searchableTabs.includes(activeTab);

  const toggleSearch = () => {
    if (isSearchable) setIsSearchOpen(!isSearchOpen);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'menu':
        return <MenuScreen isSearchOpen={isSearchOpen} />;
      case 'categoriesOptions':
        return <OptionCategoryManager isSearchOpen={isSearchOpen} />;
      case 'recipes':
        return <RecipesScreen isSearchOpen={isSearchOpen} />;
      case 'stock':
        return <StockScreen isSearchOpen={isSearchOpen} />;
      case 'suppliers':
        return <SuppliersScreen isSearchOpen={isSearchOpen} />;
      case 'purchaseOrders':
        return <PurchaseOrdersScreen isSearchOpen={isSearchOpen} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Sản phẩm & Kho hàng"
        subtitle="Quản lý thực đơn, danh mục, topping size & đơn nhập kho"
        onMenuPress={openSidebar}
        compact={!isWide}
        right={
          <TouchableOpacity
            onPress={toggleSearch}
            disabled={!isSearchable}
            style={{ padding: 8, opacity: isSearchable ? 1 : 0.3 }}
          >
            <Icon name={isSearchOpen ? 'close' : 'magnify'} size={22} color={colors.text.primary} />
          </TouchableOpacity>
        }
      />
      <View style={styles.contentWrap}>
        <ModuleTabs
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsSearchOpen(false);
          }}
        />
        <View style={styles.content}>{renderContent()}</View>
      </View>
    </SafeAreaView>
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

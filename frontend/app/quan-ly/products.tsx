import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { useSidebar } from '../../lib/context/SidebarContext';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ModuleTabs, { ModuleTab } from '../../lib/components/quan-ly/ModuleTabs';

// Import hidden sub-routes
import MenuScreen from './_menu';
import RecipesScreen from './_recipes';
import StockScreen from './_stock';
import SuppliersScreen from './_suppliers';
import PurchaseOrdersScreen from './_purchase-orders';

const tabs: ModuleTab[] = [
  { id: 'menu', name: 'Thực đơn', icon: 'food' },
  { id: 'recipes', name: 'Công thức BOM', icon: 'flask-outline' },
  { id: 'stock', name: 'Tồn kho', icon: 'package-variant-closed' },
  { id: 'suppliers', name: 'Nhà cung cấp', icon: 'truck-delivery' },
  { id: 'purchaseOrders', name: 'Nhập hàng PO', icon: 'file-document-outline' },
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
      case 'menu': return <MenuScreen />;
      case 'recipes': return <RecipesScreen />;
      case 'stock': return <StockScreen />;
      case 'suppliers': return <SuppliersScreen />;
      case 'purchaseOrders': return <PurchaseOrdersScreen />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader 
        title="Sản phẩm & Kho hàng"
        subtitle="Quản lý thực đơn, công thức định lượng & đơn nhập kho"
        onMenuPress={openSidebar} 
        compact={!isWide}
        right={
          <TouchableOpacity 
            onPress={toggleSearch} 
            disabled={!isSearchable}
            style={{ padding: 8, opacity: isSearchable ? 1 : 0.3 }}
          >
            <Icon name={isSearchOpen ? "close" : "magnify"} size={22} color={colors.text.primary} />
          </TouchableOpacity>
        }
      />
      <ModuleTabs tabs={tabs} activeTab={activeTab} onSelectTab={(tab) => { setActiveTab(tab); setIsSearchOpen(false); }} />
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  content: {
    flex: 1,
  },
});

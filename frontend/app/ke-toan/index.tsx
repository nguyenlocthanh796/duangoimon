import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { useSidebar } from '../../lib/context/SidebarContext';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ModuleTabs, { ModuleTab } from '../../lib/components/quan-ly/ModuleTabs';

import KeToanOverviewScreen from './_overview';
import ThuChiSubScreen from './_thu-chi';
import InvoicesSubScreen from './_invoices';
import ThueSubModule from './_thue';

const tabs: ModuleTab[] = [
  { id: 'overview', name: 'Tổng quan', icon: 'view-dashboard-outline' },
  { id: 'thuchi', name: 'Thu Chi', icon: 'cash-register' },
  { id: 'invoices', name: 'Hóa đơn', icon: 'file-document-outline' },
  { id: 'tax', name: 'Sổ thuế', icon: 'calculator' },
];

export default function KeToanParentShell() {
  const { openSidebar } = useSidebar();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [activeTab, setActiveTab] = useState('overview');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchableTabs = ['thuchi', 'invoices', 'tax'];
  const isSearchable = searchableTabs.includes(activeTab);

  const toggleSearch = () => {
    if (isSearchable) setIsSearchOpen(!isSearchOpen);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <KeToanOverviewScreen onSelectTab={(t) => setActiveTab(t)} />;
      case 'thuchi': return <ThuChiSubScreen isSearchOpen={isSearchOpen} />;
      case 'invoices': return <InvoicesSubScreen isSearchOpen={isSearchOpen} />;
      case 'tax': return <ThueSubModule isSearchOpen={isSearchOpen} />;
      default: return <KeToanOverviewScreen onSelectTab={(t) => setActiveTab(t)} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={isWide ? ['top', 'bottom', 'left', 'right'] : ['left', 'right']}>
      <ScreenHeader
        title="Kế Toán & Thuế"
        subtitle="Quản lý dòng tiền, hóa đơn VAT & sổ sách kê khai thuế HKD"
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
      <ModuleTabs
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsSearchOpen(false);
        }}
      />
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
});

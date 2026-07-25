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
  { id: 'overview', name: 'Tổng quan tài chính', icon: 'speedometer' },
  { id: 'thuchi', name: 'Quản lý Thu Chi', icon: 'swap-vertical' },
  { id: 'invoices', name: 'Hóa đơn VAT', icon: 'receipt' },
  { id: 'tax', name: 'Sổ Sách & Thuế HKD', icon: 'book-open-page-variant' },
];

export default function KeToanParentShell() {
  const { openSidebar } = useSidebar();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <KeToanOverviewScreen onSelectTab={(t) => setActiveTab(t)} />;
      case 'thuchi': return <ThuChiSubScreen />;
      case 'invoices': return <InvoicesSubScreen />;
      case 'tax': return <ThueSubModule />;
      default: return <KeToanOverviewScreen onSelectTab={(t) => setActiveTab(t)} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Kế Toán & Thuế"
        subtitle="Quản lý dòng tiền, hóa đơn VAT & sổ sách kê khai thuế HKD"
        onMenuPress={openSidebar}
        compact={!isWide}
      />
      <ModuleTabs
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
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
    backgroundColor: colors.surface.app,
  },
  content: {
    flex: 1,
  },
});

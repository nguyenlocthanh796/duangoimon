import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { useSidebar } from '../../lib/context/SidebarContext';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ModuleTabs, { ModuleTab } from '../../lib/components/quan-ly/ModuleTabs';

// Import hidden sub-routes
import UsersScreen from './_users';
import TablesScreen from './_tables';
import StationsScreen from './_stations';
import BranchesScreen from './_branches';
import AuditScreen from './_audit';

const tabs: ModuleTab[] = [
  { id: 'users', name: 'Nhân viên', icon: 'badge-account-outline' },
  { id: 'tables', name: 'Sơ đồ bàn', icon: 'table-furniture' },
  { id: 'stations', name: 'Khu vực bếp', icon: 'coffee-maker-outline' },
  { id: 'branches', name: 'Chi nhánh', icon: 'storefront-outline' },
  { id: 'audit', name: 'Kiểm toán', icon: 'clipboard-text-outline' },
];

export default function SystemModule() {
  const { openSidebar } = useSidebar();
  const [activeTab, setActiveTab] = useState('users');

  const renderContent = () => {
    switch (activeTab) {
      case 'users': return <UsersScreen />;
      case 'tables': return <TablesScreen />;
      case 'stations': return <StationsScreen />;
      case 'branches': return <BranchesScreen />;
      case 'audit': return <AuditScreen />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Hệ thống & Vận hành" onMenuPress={openSidebar} right={
          <TouchableOpacity 
            disabled={true}
            style={{ padding: 8, opacity: 0.3 }}
          >
            <Icon name="magnify" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        } />
      <ModuleTabs tabs={tabs} activeTab={activeTab} onSelectTab={setActiveTab} />
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
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

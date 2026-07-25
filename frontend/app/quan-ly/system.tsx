import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Hệ thống & Vận hành"
        subtitle="Quản lý tài khoản nhân viên, sơ đồ bàn & cấu hình trạm bếp"
        onMenuPress={openSidebar}
        compact={!isWide}
        right={
          <View style={styles.iconCircle}>
            <Icon name="magnify" size={18} color={colors.text.secondary} />
          </View>
        }
      />
      <ModuleTabs tabs={tabs} activeTab={activeTab} onSelectTab={setActiveTab} />
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
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justify: 'center',
  },
});

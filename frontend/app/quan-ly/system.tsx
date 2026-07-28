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
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchableTabs = ['users', 'tables', 'stations', 'branches', 'audit'];
  const isSearchable = searchableTabs.includes(activeTab);

  const toggleSearch = () => {
    if (isSearchable) setIsSearchOpen(!isSearchOpen);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users': return <UsersScreen isSearchOpen={isSearchOpen} />;
      case 'tables': return <TablesScreen isSearchOpen={isSearchOpen} />;
      case 'stations': return <StationsScreen isSearchOpen={isSearchOpen} />;
      case 'branches': return <BranchesScreen isSearchOpen={isSearchOpen} />;
      case 'audit': return <AuditScreen isSearchOpen={isSearchOpen} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Hệ thống & Vận hành"
        subtitle="Quản lý tài khoản nhân viên, sơ đồ bàn & cấu hình trạm bếp"
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
        <View style={styles.content}>
          {renderContent()}
        </View>
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
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

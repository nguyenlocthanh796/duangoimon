import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { useSidebar } from '../../lib/context/SidebarContext';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ModuleTabs, { ModuleTab } from '../../lib/components/quan-ly/ModuleTabs';

// Import hidden sub-routes
import ExecDashboardScreen from './_exec-dashboard';
import ReportsScreen from './_reports';
import BiReportsScreen from './_bi-reports';
import MenuEngScreen from './_menu-eng';
import ForecastScreen from './_forecast';
import ShiftsScreen from './_shifts';

const tabs: ModuleTab[] = [
  { id: 'execDashboard', name: 'Điều hành', icon: 'view-dashboard' },
  { id: 'reports', name: 'Báo cáo', icon: 'file-chart' },
  { id: 'biReports', name: 'Báo cáo BI', icon: 'google-analytics' },
  { id: 'menuEng', name: 'Menu Eng BCG', icon: 'chart-pie' },
  { id: 'forecast', name: 'Dự báo', icon: 'chart-timeline-variant' },
  { id: 'shifts', name: 'Ca làm việc', icon: 'clock-outline' },
];

export default function AnalyticsModule() {
  const { openSidebar } = useSidebar();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [activeTab, setActiveTab] = useState('execDashboard');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchableTabs = ['reports', 'biReports', 'shifts'];
  const isSearchable = searchableTabs.includes(activeTab);

  const toggleSearch = () => {
    if (isSearchable) setIsSearchOpen(!isSearchOpen);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'execDashboard': return <ExecDashboardScreen />;
      case 'reports': return <ReportsScreen isSearchOpen={isSearchOpen} />;
      case 'biReports': return <BiReportsScreen isSearchOpen={isSearchOpen} />;
      case 'menuEng': return <MenuEngScreen />;
      case 'forecast': return <ForecastScreen />;
      case 'shifts': return <ShiftsScreen isSearchOpen={isSearchOpen} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Báo cáo & Phân tích"
        subtitle="Phân tích báo cáo điều hành, BI, P&L & dự báo doanh thu"
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
    position: 'relative',
    zIndex: 10,
  },
});

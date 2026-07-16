import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
  { id: 'menuEng', name: 'Phân tích thực đơn', icon: 'chart-pie' },
  { id: 'forecast', name: 'Dự báo', icon: 'chart-timeline-variant' },
  { id: 'shifts', name: 'Ca làm việc', icon: 'clock-outline' },
];

export default function AnalyticsModule() {
  const { openSidebar } = useSidebar();
  const [activeTab, setActiveTab] = useState('execDashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'execDashboard': return <ExecDashboardScreen />;
      case 'reports': return <ReportsScreen />;
      case 'biReports': return <BiReportsScreen />;
      case 'menuEng': return <MenuEngScreen />;
      case 'forecast': return <ForecastScreen />;
      case 'shifts': return <ShiftsScreen />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Báo cáo & Phân tích" onMenuPress={openSidebar} right={
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

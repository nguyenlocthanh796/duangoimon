import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import { useSidebar } from '../../lib/context/SidebarContext';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ModuleTabs, { ModuleTab } from '../../lib/components/quan-ly/ModuleTabs';

// Import hidden sub-routes
import CustomersScreen from './_customers';
import MembershipScreen from './_membership';
import PromoScreen from './_promo';
import MarketingScreen from './_marketing';
import BookingScreen from './_booking';

const tabs: ModuleTab[] = [
  { id: 'customers', name: 'Khách hàng', icon: 'account-group' },
  { id: 'membership', name: 'Thành viên', icon: 'crown' },
  { id: 'promo', name: 'Khuyến mãi', icon: 'ticket-percent-outline' },
  { id: 'marketing', name: 'Marketing', icon: 'bullhorn' },
  { id: 'booking', name: 'Đặt bàn', icon: 'calendar-text' },
];

export default function CrmModule() {
  const { openSidebar } = useSidebar();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [activeTab, setActiveTab] = useState('customers');

  const renderContent = () => {
    switch (activeTab) {
      case 'customers': return <CustomersScreen />;
      case 'membership': return <MembershipScreen />;
      case 'promo': return <PromoScreen />;
      case 'marketing': return <MarketingScreen />;
      case 'booking': return <BookingScreen />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Khách hàng & Marketing"
        subtitle="Quản lý CRM, tích điểm hội viên, voucher & đặt bàn"
        onMenuPress={openSidebar}
        compact={!isWide}
        right={
          <TouchableOpacity 
            disabled={true}
            style={{ padding: 8, opacity: 0.3 }}
          >
            <Icon name="magnify" size={22} color={colors.text.primary} />
          </TouchableOpacity>
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
});

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchableTabs = ['customers', 'membership', 'promo', 'marketing', 'booking'];
  const isSearchable = searchableTabs.includes(activeTab);

  const toggleSearch = () => {
    if (isSearchable) setIsSearchOpen(!isSearchOpen);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'customers': return <CustomersScreen isSearchOpen={isSearchOpen} />;
      case 'membership': return <MembershipScreen isSearchOpen={isSearchOpen} />;
      case 'promo': return <PromoScreen isSearchOpen={isSearchOpen} />;
      case 'marketing': return <MarketingScreen isSearchOpen={isSearchOpen} />;
      case 'booking': return <BookingScreen isSearchOpen={isSearchOpen} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Khách hàng & Marketing"
        subtitle="Quản lý CRM, tích điểm hội viên, voucher & đặt bàn"
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
});

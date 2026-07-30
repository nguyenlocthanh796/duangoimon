import { StyleSheet } from 'react-native';
import PageShell from '../../lib/components/quan-ly/PageShell';

// Import hidden sub-routes
import CustomersScreen from './_customers';
import MembershipScreen from './_membership';
import PromoScreen from './_promo';
import MarketingScreen from './_marketing';
import BookingScreen from './_booking';

const tabs = [
  { id: 'customers', name: 'Khách hàng', icon: 'account-group' },
  { id: 'membership', name: 'Thành viên', icon: 'crown' },
  { id: 'promo', name: 'Khuyến mãi', icon: 'ticket-percent-outline' },
  { id: 'marketing', name: 'Marketing', icon: 'bullhorn' },
  { id: 'booking', name: 'Đặt bàn', icon: 'calendar-text' },
];

const searchableTabs = ['customers', 'membership', 'promo', 'marketing', 'booking'];

export default function CrmModule() {
  return (
    <PageShell
      title="Khách hàng & Marketing"
      subtitle="Quản lý CRM, tích điểm hội viên, voucher & đặt bàn"
      tabs={tabs}
      searchableTabIds={searchableTabs}
      renderContent={(activeTab, isSearchOpen) => {
        switch (activeTab) {
          case 'customers': return <CustomersScreen isSearchOpen={isSearchOpen} />;
          case 'membership': return <MembershipScreen isSearchOpen={isSearchOpen} />;
          case 'promo': return <PromoScreen isSearchOpen={isSearchOpen} />;
          case 'marketing': return <MarketingScreen isSearchOpen={isSearchOpen} />;
          case 'booking': return <BookingScreen isSearchOpen={isSearchOpen} />;
          default: return null;
        }
      }}
    />
  );
}

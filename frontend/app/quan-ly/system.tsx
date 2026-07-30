import { StyleSheet } from 'react-native';
import PageShell from '../../lib/components/quan-ly/PageShell';

// Import hidden sub-routes
import UsersScreen from './_users';
import TablesScreen from './_tables';
import StationsScreen from './_stations';
import BranchesScreen from './_branches';
import AuditScreen from './_audit';

const tabs = [
  { id: 'users', name: 'Nhân viên', icon: 'badge-account-outline' },
  { id: 'tables', name: 'Sơ đồ bàn', icon: 'table-furniture' },
  { id: 'stations', name: 'Khu vực bếp', icon: 'coffee-maker-outline' },
  { id: 'branches', name: 'Chi nhánh', icon: 'storefront-outline' },
  { id: 'audit', name: 'Kiểm toán', icon: 'clipboard-text-outline' },
];

const searchableTabs = ['users', 'tables', 'stations', 'branches', 'audit'];

export default function SystemModule() {
  return (
    <PageShell
      title="Hệ thống & Vận hành"
      subtitle="Quản lý tài khoản nhân viên, sơ đồ bàn & cấu hình trạm bếp"
      tabs={tabs}
      searchableTabIds={searchableTabs}
      renderContent={(activeTab, isSearchOpen) => {
        switch (activeTab) {
          case 'users': return <UsersScreen isSearchOpen={isSearchOpen} />;
          case 'tables': return <TablesScreen isSearchOpen={isSearchOpen} />;
          case 'stations': return <StationsScreen isSearchOpen={isSearchOpen} />;
          case 'branches': return <BranchesScreen isSearchOpen={isSearchOpen} />;
          case 'audit': return <AuditScreen isSearchOpen={isSearchOpen} />;
          default: return null;
        }
      }}
    />
  );
}

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../../lib/theme';
import PillTabs from '../../lib/components/ui/PillTabs';

import TierDashboard from './thue/tier';
import SoSachScreen from './thue/so-sach';
import DeclarationScreen from './thue/declaration';
import BankAccountsScreen from './thue/bank-accounts';
import DeadlinesScreen from './thue/deadlines';
import LegacyScreen from './thue/legacy';

const taxSubTabs = [
  { id: 'tier', label: 'Phân tầng HKD' },
  { id: 'so-sach', label: 'Sổ kế toán' },
  { id: 'declaration', label: 'Kê khai thuế' },
  { id: 'bank', label: 'TK Ngân hàng' },
  { id: 'deadlines', label: 'Hạn nộp thuế' },
  { id: 'legacy', label: 'Dữ liệu chuyển tiếp' },
];

export default function ThueSubModule({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const [subTab, setSubTab] = useState('tier');

  const renderContent = () => {
    switch (subTab) {
      case 'tier': return <TierDashboard />;
      case 'so-sach': return <SoSachScreen />;
      case 'declaration': return <DeclarationScreen />;
      case 'bank': return <BankAccountsScreen />;
      case 'deadlines': return <DeadlinesScreen />;
      case 'legacy': return <LegacyScreen />;
      default: return <TierDashboard />;
    }
  };

  return (
    <View style={styles.container}>
      <PillTabs items={taxSubTabs} activeId={subTab} onSelect={setSubTab} />
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1 },
});

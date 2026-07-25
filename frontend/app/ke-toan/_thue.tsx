import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';

import TierDashboard from './thue/tier';
import SoSachScreen from './thue/so-sach';
import DeclarationScreen from './thue/declaration';
import BankAccountsScreen from './thue/bank-accounts';
import DeadlinesScreen from './thue/deadlines';
import LegacyScreen from './thue/legacy';

const taxSubTabs = [
  { id: 'tier', label: 'Phân Tầng HKD', icon: 'chart-bell-curve' },
  { id: 'so-sach', label: 'Sổ Kế Toán (7 Mẫu)', icon: 'book-open-page-variant' },
  { id: 'declaration', label: 'Kê Khai Thuế', icon: 'file-document-edit' },
  { id: 'bank', label: 'TK Ngân Hàng', icon: 'bank' },
  { id: 'deadlines', label: 'Hạn Nộp Thuế', icon: 'calendar-alert' },
  { id: 'legacy', label: 'Chuyển Tiếp Dữ Liệu', icon: 'package-variant-closed' },
];

export default function ThueSubModule() {
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
      <View style={styles.tabBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {taxSubTabs.map((t) => {
            const active = subTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.pillBtn, active && styles.pillBtnActive]}
                onPress={() => setSubTab(t.id)}
              >
                <Icon name={t.icon as any} size={14} color={active ? colors.brand.primary : '#65676B'} />
                <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                  {t.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  tabBarWrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillBtnActive: {
    backgroundColor: colors.brand.primaryBg,
    borderColor: '#FFEDD5',
  },
  content: { flex: 1 },
});

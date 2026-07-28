import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import { api, DeclarationDeadline } from '../../../lib/api';
import { colors } from '../../../lib/theme';
import AppText from '../../../lib/components/ui/AppText';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { useAuth } from '../../../lib/context/AuthContext';
import StatusBadge from '../../../lib/components/ui/StatusBadge';

function generateFallbackDeadlines(): DeclarationDeadline[] {
  return [
    { id: 'd1', branch_id: 'b1', form: 'Tờ khai Thuế GTGT & TNCN Tháng 7/2026', period_type: 'thang', due_date: '2026-08-20', reminded_14: true, reminded_7: false, reminded_3: false, reminded_1: false, submitted: false },
    { id: 'd2', branch_id: 'b1', form: 'Báo cáo tình hình sử dụng hóa đơn Quý 2', period_type: 'quy', due_date: '2026-07-30', reminded_14: true, reminded_7: true, reminded_3: false, reminded_1: false, submitted: true },
    { id: 'd3', branch_id: 'b1', form: 'Tờ khai thuế khoán Quý 3/2026', period_type: 'quy', due_date: '2026-09-30', reminded_14: false, reminded_7: false, reminded_3: false, reminded_1: false, submitted: false },
    { id: 'd4', branch_id: 'b1', form: 'Quyết toán thuế kinh doanh năm 2026', period_type: 'nam', due_date: '2027-03-31', reminded_14: false, reminded_7: false, reminded_3: false, reminded_1: false, submitted: false },
  ];
}

export default function DeadlinesScreen() {
  const { isWide } = useResponsive();
  const { branchId } = useAuth();
  
  const [deadlines, setDeadlines] = useState<DeclarationDeadline[]>(generateFallbackDeadlines());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const bid = branchId || 'demo-branch';
      const list = await api.getTaxDeadlines(bid).catch(() => []);
      if (Array.isArray(list) && list.length > 0) {
        setDeadlines(list);
      } else {
        setDeadlines(generateFallbackDeadlines());
      }
    } catch {
      setDeadlines(generateFallbackDeadlines());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ padding: 6, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={styles.cardBox}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <AppText variant="md" weight="bold" color="#0F172A">Lịch Hạn Nộp Thuế & Tờ Khai Năm 2026</AppText>
          <AppText variant="sm" color="#64748B">{deadlines.length} mốc thời gian</AppText>
        </View>

        {deadlines.map((item, idx) => (
          <View key={item.id || idx} style={styles.itemRow}>
            <View style={[styles.avatarIcon, { backgroundColor: item.submitted ? '#DCFCE7' : '#FEF3C7' }]}>
              <AppText variant="sm" weight="bold" color={item.submitted ? '#16A34A' : '#D97706'} style={{ fontSize: 13 }}>
                {item.submitted ? '✓' : '!'}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#0F172A">{item.form}</AppText>
              <AppText variant="sm" color="#64748B" style={{ marginTop: 2 }}>
                Hạn chót: {item.due_date} · {item.period_type === 'thang' ? 'Tháng' : item.period_type === 'quy' ? 'Quý' : 'Năm'}
              </AppText>
            </View>
            <StatusBadge label={item.submitted ? 'Đã hoàn thành' : 'Đang theo dõi'} severity={item.submitted ? 'success' : 'warning'} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  avatarIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

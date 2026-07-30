import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import { api } from '../../../lib/api';
import { colors, formatVND } from '../../../lib/theme';
import AppText from '../../../lib/components/ui/AppText';
import { useAuth } from '../../../lib/context/AuthContext';

function generateFallbackLegacyChecklist() {
  return {
    id: 'lc1',
    branch_id: 'b1',
    total_value: 145000000,
    items: [
      { product: 'Thịt bò tươi nhập khẩu (Kg)', opening_qty: 120, avg_cost: 250000, value: 30000000 },
      { product: 'Bia Heineken thùng 24 lon', opening_qty: 150, avg_cost: 400000, value: 60000000 },
      { product: 'Rượu vang Chile cao cấp (Chai)', opening_qty: 50, avg_cost: 1100000, value: 55000000 },
    ],
  };
}

export default function LegacyScreen() {
  const { branchId } = useAuth();
  
  const [checklist, setChecklist] = useState<any>(generateFallbackLegacyChecklist());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const bid = branchId || 'demo-branch';
      const data = await api.getTaxLegacyChecklist(bid).catch(() => null);
      if (data && data.items) {
        setChecklist(data);
      } else {
        setChecklist(generateFallbackLegacyChecklist());
      }
    } catch {
      setChecklist(generateFallbackLegacyChecklist());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const totalValue = (checklist?.items || []).reduce((s: number, item: any) => s + (item.value || 0), 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ padding: 6, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={styles.cardBox}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <AppText variant="md" color="#0F172A">Dữ Liệu Chuyển Tiếp Tồn Kho Đầu Kỳ (Bảng kê 01/BK-HTK)</AppText>
          <AppText variant="sm" color="#64748B">Kê khai ban đầu</AppText>
        </View>

        <View style={styles.totalRow}>
          <AppText variant="sm" color="#64748B">Tổng giá trị tồn kho đầu kỳ:</AppText>
          <AppText variant="md" color="#0F172A">
            {formatVND(totalValue)}
          </AppText>
        </View>

        {(checklist?.items || []).map((item: any, idx: number) => (
          <View key={idx} style={styles.itemRow}>
            <View style={styles.avatarIcon}>
              <AppText variant="sm" color="#F97316" style={{ fontSize: 12 }}>
                {String(idx + 1).padStart(2, '0')}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color="#0F172A">{item.product}</AppText>
              <AppText variant="sm" color="#64748B" style={{ marginTop: 2 }}>
                Tồn: {item.opening_qty} · Đơn giá: {formatVND(item.avg_cost)}
              </AppText>
            </View>
            <AppText variant="md" color="#0F172A">{formatVND(item.value)}</AppText>
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    marginBottom: 8,
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
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

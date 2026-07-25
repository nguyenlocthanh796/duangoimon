import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, LegacyChecklist } from '../../../lib/api';
import { colors, formatVND } from '../../../lib/theme';
import AppText from '../../../lib/components/ui/AppText';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { useAuth } from '../../../lib/context/AuthContext';

function generateFallbackLegacyChecklist(): LegacyChecklist {
  return {
    branch_id: 'b1',
    generated_at: '2026-01-01',
    items: [
      { product: 'Cà phê hạt Robusta Đắk Lắk (1kg)', opening_qty: 45, avg_cost: 180000, value: 8100000 },
      { product: 'Sữa tươi tiệt trùng Vinamilk 1L', opening_qty: 120, avg_cost: 32000, value: 3840000 },
      { product: 'Đường tinh luyện Biên Hòa (1kg)', opening_qty: 50, avg_cost: 22000, value: 1100000 },
      { product: 'Ly giấy F&B 500ml mang về (cái)', opening_qty: 1500, avg_cost: 1200, value: 1800000 },
    ],
  };
}

export default function LegacyScreen() {
  const { isWide } = useResponsive();
  const { branchId } = useAuth();
  
  const [checklist, setChecklist] = useState<LegacyChecklist>(generateFallbackLegacyChecklist());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const bid = branchId || 'demo-branch';
      const data = await api.getTaxLegacyChecklist(bid).catch(() => null);
      if (data && Array.isArray(data.items) && data.items.length > 0) {
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

  const totalValue = checklist.items.reduce((s, item) => s + (item.value || 0), 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.app }}
      contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={styles.cardBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Icon name="package-variant-closed" size={24} color={colors.brand.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">Bảng Kê Hàng Tồn Kho Thực Tế Đầu Kỳ (Mẫu 01/BK-HTK)</AppText>
            <AppText variant="sm" color="#65676B">Xác nhận số dư tồn kho hàng hóa vật tư đầu kỳ</AppText>
          </View>
        </View>

        <View style={styles.totalRow}>
          <AppText variant="sm" color="#65676B">Tổng giá trị tồn kho đầu kỳ:</AppText>
          <AppText variant="lg" weight="bold" color={colors.brand.primary}>{formatVND(totalValue)}</AppText>
        </View>

        {checklist.items.map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <View style={styles.avatarIcon}>
              <Icon name="cube-outline" size={20} color={colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#050505">{item.product}</AppText>
              <AppText variant="sm" color="#65676B" style={{ marginTop: 2 }}>
                Tồn: {item.opening_qty} · Đơn giá: {formatVND(item.avg_cost)}
              </AppText>
            </View>
            <AppText variant="md" weight="bold" color="#050505">{formatVND(item.value)}</AppText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardBox: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  avatarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

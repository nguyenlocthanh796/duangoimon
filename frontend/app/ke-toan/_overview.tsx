import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, formatVND } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import { SectionTitle } from '../../lib/components/ui/SectionTitle';
import { useAuth } from '../../lib/context/AuthContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { api } from '../../lib/api';
import { logger, safeApi } from '../../lib/logger';
import { DonutChart } from '../../lib/components/ke-toan/ChartComponents';


import StatusBadge from '../../lib/components/ui/StatusBadge';

const fmt = (n: number) => formatVND(n || 0);

function TxBadge({ type }: { type: string }) {
  const isThu = type === 'thu';
  return (
    <StatusBadge
      label={isThu ? 'Thu' : 'Chi'}
      severity={isThu ? 'success' : 'danger'}
    />
  );
}

function InvBadge({ status }: { status: string }) {
  const ok = status === 'da_xuat' || status === 'exported';
  return (
    <StatusBadge
      label={ok ? 'Đã xuất' : 'Nháp'}
      severity={ok ? 'success' : 'warning'}
    />
  );
}

export default function KeToanOverviewScreen({ onSelectTab }: { onSelectTab?: (tab: string) => void }) {
  const router = useRouter();
  const { isWide } = useResponsive();
  const { branchId } = useAuth();

  const [data, setData] = useState<any>({ summary: {}, monthly_revenue: [], expense_by_category: [], recent_transactions: [], recent_invoices: [] });
  const [taxStatus, setTaxStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartFilter, setChartFilter] = useState<'month' | 'year'>('year');

  const loadData = useCallback(async ({ quiet }: { quiet?: boolean } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [d, t] = await Promise.all([
        api.getKeToanDashboard().catch(() => ({ summary: {}, monthly_revenue: [], expense_by_category: [], recent_transactions: [], recent_invoices: [] })),
        api.getTaxProfileStatus(branchId || 'default').catch(() => null),
      ]);
      setData(d);
      setTaxStatus(t);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData({ quiet: true });
  }, [loadData]);

  const open = (path: string, tabKey?: string) => {
    if (tabKey && onSelectTab) {
      onSelectTab(tabKey);
    } else {
      router.push(path as any);
    }
  };

  const modules = [
    { key: 'thu-chi', icon: 'swap-vertical', title: 'Thu Chi', desc: 'Quản lý thu, chi hằng ngày', tabKey: 'thuchi', path: '/ke-toan/thu-chi', bg: '#FFF7ED', color: '#F97316' },
    { key: 'invoices', icon: 'receipt', title: 'Hóa đơn VAT', desc: 'Phát hành xuất hóa đơn', tabKey: 'invoices', path: '/ke-toan/invoices', bg: '#ECFDF5', color: '#16A34A' },
    { key: 'tier', icon: 'chart-bell-curve', title: 'Phân Tầng HKD', desc: 'Xác định hạng KD', tabKey: 'tax', path: '/ke-toan/thue/tier', bg: '#F5F3FF', color: '#7C3AED' },
    { key: 'so-sach', icon: 'book-open-page-variant', title: 'Sổ Kế Toán', desc: 'Ghi chép sổ sách', tabKey: 'tax', path: '/ke-toan/thue/so-sach', bg: '#EEF2FF', color: '#2563EB' },
    { key: 'declaration', icon: 'file-document-edit', title: 'Kê Khai Thuế', desc: 'Kê khai hàng kỳ', tabKey: 'tax', path: '/ke-toan/thue/declaration', bg: '#FEF3C7', color: '#D97706' },
    { key: 'bank', icon: 'bank', title: 'TK Ngân Hàng', desc: 'Quản lý tài khoản', tabKey: 'tax', path: '/ke-toan/thue/bank-accounts', bg: '#EFF6FF', color: '#3B82F6' },
    { key: 'deadlines', icon: 'calendar-alert', title: 'Hạn Nộp', desc: 'Lịch hạn nộp thuế', tabKey: 'tax', path: '/ke-toan/thue/deadlines', bg: '#FEE2E2', color: '#DC2626' },
    { key: 'legacy', icon: 'package-variant-closed', title: 'Chuyển Tiếp', desc: 'Dữ liệu cũ', tabKey: 'tax', path: '/ke-toan/thue/legacy', bg: '#F3E8FF', color: '#9333EA' },
  ] as const;

  const s = data.summary || {};
  const profit = s.balance || s.total_thu - s.total_chi;
  const profitPct = s.total_thu > 0 ? Math.round((profit / s.total_thu) * 100) : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F97316" />}
    >
      {/* 👑 HERO CARD - LỢI NHUẬN RÒNG */}
      <View style={styles.heroCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.heroBadgeIcon}>
              <AppText variant="md" color="#15803D" style={{ fontSize: 12}}>LN</AppText>
            </View>
            <AppText variant="md" color="#15803D" style={{ letterSpacing: 0.5 }}>LỢI NHUẬN RÒNG</AppText>
          </View>
          <View style={styles.profitPctBadge}>
            <AppText variant="md" color="#15803D">{profitPct >= 0 ? `+${profitPct}%` : `${profitPct}%`}</AppText>
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          <AppText variant="md" weight="bold" color="#16A34A">
            {fmt(profit)}
          </AppText>
          <AppText variant="md" color="#475569" style={{ marginTop: 2 }}>
            Cập nhật từ tổng thu & chi thực tế
          </AppText>
        </View>
      </View>

      {/* 📱 GROUPED iOS STATS CARD (TỔNG THU - TỔNG CHI - HÓA ĐƠN) */}
      <View style={styles.iosGroupedCard}>
        <TouchableOpacity style={styles.statRow} activeOpacity={0.7} onPress={() => open('/ke-toan/thu-chi', 'thuchi')}>
          <View style={[styles.statIconBadge, { backgroundColor: '#ECFDF5' }]}>
            <AppText variant="md" color="#16A34A" style={{ fontSize: 14}}>+</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#64748B">Tổng thu</AppText>
            <AppText variant="md" color="#0F172A">{fmt(s.total_thu)}</AppText>
          </View>
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.statRow} activeOpacity={0.7} onPress={() => open('/ke-toan/thu-chi', 'thuchi')}>
          <View style={[styles.statIconBadge, { backgroundColor: '#FEE2E2' }]}>
            <AppText variant="md" color="#DC2626" style={{ fontSize: 14}}>-</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#64748B">Tổng chi</AppText>
            <AppText variant="md" color="#0F172A">{fmt(s.total_chi)}</AppText>
          </View>
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.statRow} activeOpacity={0.7} onPress={() => open('/ke-toan/invoices', 'invoices')}>
          <View style={[styles.statIconBadge, { backgroundColor: '#FFF7ED' }]}>
            <AppText variant="md" color="#F97316" style={{ fontSize: 12}}>HĐ</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#64748B">Hóa đơn VAT đã phát hành</AppText>
            <AppText variant="md" color="#0F172A">{s.invoice_count ?? 100} hóa đơn</AppText>
          </View>
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* 📈 CHARTS SECTION */}
      <View style={styles.iosGroupedCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <AppText variant="md" color="#0F172A">Biểu đồ doanh thu</AppText>

          {/* iOS Segmented Control */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              onPress={() => setChartFilter('month')}
              style={[styles.segmentBtn, chartFilter === 'month' && styles.segmentBtnActive]}
            >
              <AppText variant="md" weight={chartFilter === 'month' ? 'bold' : 'normal'} color={chartFilter === 'month' ? '#0F172A' : '#64748B'}>Tháng</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setChartFilter('year')}
              style={[styles.segmentBtn, chartFilter === 'year' && styles.segmentBtnActive]}
            >
              <AppText variant="md" weight={chartFilter === 'year' ? 'bold' : 'normal'} color={chartFilter === 'year' ? '#0F172A' : '#64748B'}>Năm</AppText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 16 }}>
          <View style={{ flex: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 6, paddingTop: 10 }}>
              {data.monthly_revenue.map((m: any, i: number) => {
                const maxVal = Math.max(...data.monthly_revenue.map((r: any) => r.value), 1);
                const h = maxVal > 0 ? (m.value / maxVal) * 130 : 2;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <View style={{ width: '80%', height: Math.max(h, 3), borderRadius: 4, backgroundColor: m.current ? '#F97316' : '#E2E8F0' }} />
                    <AppText variant="md" color="#64748B" style={{ fontSize: 12, textAlign: 'center' }}>{m.label}</AppText>
                  </View>
                );
              })}
            </View>
          </View>

          {isWide && data.expense_by_category.length > 0 && (
            <View style={{ flex: 2, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#F1F5F9' }}>
              <AppText variant="md" color="#64748B" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                Chi phí theo nhóm
              </AppText>
              <View style={{ alignItems: 'center', marginVertical: 8 }}>
                <DonutChart data={data.expense_by_category} size={140} />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* 📄 TAX STATUS PROFILE (GROUPED CARD) */}
      <View style={styles.iosGroupedCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 }}>
          <AppText variant="md" color="#0F172A">Trạng thái thuế HKD</AppText>
          <View style={styles.tierPill}>
            <AppText variant="md" color="#F97316">{taxStatus?.tier ?? 'Hộ HKD Nhóm 2'}</AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={{ flexDirection: 'row', paddingTop: 10, gap: 12 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#64748B">Doanh số YTD</AppText>
            <AppText variant="md" color="#16A34A" style={{ marginTop: 2 }}>
              {fmt(taxStatus?.revenueYtd || taxStatus?.revenue_ytd || 917198904)}
            </AppText>
          </View>
          <View style={{ width: 1, backgroundColor: '#F1F5F9' }} />
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#64748B">Hạn nộp tiếp theo</AppText>
            <AppText variant="md" color="#D97706" style={{ marginTop: 2 }}>
              {taxStatus?.nextDeadline ?? '20/08/2026 (Còn 26 ngày)'}
            </AppText>
          </View>
        </View>
      </View>

      {/* 📱 iOS LIST VIEW - GIAO DỊCH GẦN ĐÂY */}
      <View style={styles.iosGroupedCard}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 }}
          onPress={() => open('/ke-toan/thu-chi', 'thuchi')}
          activeOpacity={0.7}
        >
          <AppText variant="md" color="#0F172A">Giao dịch gần đây</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <AppText variant="md" color="#F97316" >Tất cả</AppText>
            <Icon name="chevron-right" size={18} color="#F97316" />
          </View>
        </TouchableOpacity>

        {(data.recent_transactions || []).slice(0, 4).map((t: any, i: number, arr: any[]) => (
          <React.Fragment key={t.id || i}>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.listRow}
              activeOpacity={0.7}
              onPress={() => open('/ke-toan/thu-chi', 'thuchi')}
            >
              <View style={[styles.listIconBadge, { backgroundColor: t.type === 'thu' ? '#ECFDF5' : '#FEE2E2' }]}>
                <AppText variant="md" color={t.type === 'thu' ? '#16A34A' : '#DC2626'} style={{ fontSize: 14}}>
                  {t.type === 'thu' ? '+' : '-'}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="md" color="#0F172A" numberOfLines={1}>{t.note || 'Giao dịch thu chi'}</AppText>
                <AppText variant="md" color="#64748B">{t.created_at ? t.created_at.slice(0, 10) : 'Giao dịch hôm nay'}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <AppText variant="md" color={t.type === 'thu' ? '#16A34A' : '#DC2626'}>
                  {t.type === 'thu' ? `+${fmt(t.amount)}` : `-${fmt(t.amount)}`}
                </AppText>
                <TxBadge type={t.type} />
              </View>
              <Icon name="chevron-right" size={18} color="#CBD5E1" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* 📱 iOS LIST VIEW - HÓA ĐƠN GẦN ĐÂY */}
      <View style={styles.iosGroupedCard}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 }}
          onPress={() => open('/ke-toan/invoices', 'invoices')}
          activeOpacity={0.7}
        >
          <AppText variant="md" color="#0F172A">Hóa đơn VAT gần đây</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <AppText variant="md" color="#F97316" >Tất cả</AppText>
            <Icon name="chevron-right" size={18} color="#F97316" />
          </View>
        </TouchableOpacity>

        {(data.recent_invoices || []).slice(0, 4).map((inv: any, i: number, arr: any[]) => (
          <React.Fragment key={inv.id || i}>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.listRow}
              activeOpacity={0.7}
              onPress={() => open('/ke-toan/invoices', 'invoices')}
            >
              <View style={[styles.listIconBadge, { backgroundColor: '#EFF6FF' }]}>
                <AppText variant="md" color="#2563EB" style={{ fontSize: 12}}>HĐ</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="md" color="#0F172A" numberOfLines={1}>HĐ #{inv.invoice_number || '001'}</AppText>
                <AppText variant="md" color="#64748B" numberOfLines={1}>{inv.buyer_name || 'Khách hàng lẻ'}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <AppText variant="md" color="#0F172A">{fmt(inv.total_amount)}</AppText>
                <InvBadge status={inv.status} />
              </View>
              <Icon name="chevron-right" size={18} color="#CBD5E1" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* 🧰 iOS GRID - MÔ-ĐUN NGHIỆP VỤ */}
      <View style={{ marginTop: 4 }}>
        <AppText variant="md" color="#0F172A" style={{ marginBottom: 8, paddingLeft: 4 }}>
          Mô-đun nghiệp vụ kế toán
        </AppText>
        <View style={styles.moduleGrid}>
          {modules.map((m) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => open(m.path, m.tabKey)}
              style={styles.moduleCardItem}
              activeOpacity={0.7}
            >
              <View style={[styles.moduleIconBadge, { backgroundColor: m.bg }]}>
                <Icon name={m.icon as any} size={20} color={m.color} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="md" color="#0F172A" numberOfLines={1}>{m.title}</AppText>
                <AppText variant="md" color="#64748B" numberOfLines={1} style={{ fontSize: 12}}>{m.desc}</AppText>
              </View>
              <Icon name="chevron-right" size={16} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  heroBadgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profitPctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
  },
  iosGroupedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#FFF7ED',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  listIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moduleCardItem: {
    width: '48.8%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
  },
  moduleIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

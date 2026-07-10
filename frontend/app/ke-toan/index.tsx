import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api, Transaction, Invoice } from '../../lib/api';
import { colors, font, shape } from '../../lib/theme';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import GradientHeader from '../../lib/components/ui/GradientHeader';
import ModuleCard from '../../lib/components/ui/ModuleCard';

const formatVND = (n: number) => (n ?? 0).toLocaleString('vi-VN') + '₫';
const DEMO_BRANCH = '11111111-1111-1111-1111-111111111111';

const MODULES = [
  { key: 'thu-chi', icon: 'swap-vertical', title: 'Thu Chi', desc: 'Quản lý thu chi kế toán', path: '/ke-toan/thu-chi' },
  { key: 'invoices', icon: 'receipt', title: 'Hóa đơn VAT', desc: 'Xuất & quản lý HĐ điện tử', path: '/ke-toan/invoices' },
  { key: 'tier', icon: 'chart-bell-curve', title: 'Phân Tầng HKD', desc: 'Nhóm 1–4 & cảnh báo doanh thu', path: '/ke-toan/thue/tier' },
  { key: 'so-sach', icon: 'book-open-page-variant', title: 'Sổ Kế Toán', desc: 'S1a / S2a–e / S3a (TT152)', path: '/ke-toan/thue/so-sach' },
  { key: 'decl', icon: 'file-document-edit', title: 'Kê Khai Thuế', desc: 'Xuất XML 01/CNKD', path: '/ke-toan/thue/declaration' },
  { key: 'bank', icon: 'bank', title: 'TK Ngân Hàng', desc: '01/BK-STK thông báo tài khoản', path: '/ke-toan/thue/bank-accounts' },
  { key: 'deadline', icon: 'calendar-alert', title: 'Hạn Nộp & Cảnh báo', desc: 'Lịch nộp & leo thang', path: '/ke-toan/thue/deadlines' },
  { key: 'legacy', icon: 'package-variant-closed', title: 'Kê Khai Chuyển Tiếp', desc: '01/BK-HTK tồn kho', path: '/ke-toan/thue/legacy' },
];

function daysLeft(due: string): number {
  return Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
}

export default function KeToanHub() {
  const { openSidebar } = useSidebar();
  const { isWide, columns } = useResponsive();
  const router = useRouter();
  const [kpi, setKpi] = useState<{ thu: number; chi: number; unpaid: number; taxDue: number } | null>(null);
  const [alerts, setAlerts] = useState<{ text: string; severity: 'danger' | 'warning' | 'success'; path?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const numCols = columns(240);
  const modWidthPct: `${number}%` = `${100 / numCols}%`;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [txs, invs, profiles] = await Promise.all([
        api.getTransactions(),
        api.getInvoices(),
        api.getTaxProfiles(DEMO_BRANCH),
      ]);
      const thu = (txs as Transaction[]).filter(t => t.type === 'thu').reduce((s, t) => s + t.amount, 0);
      const chi = (txs as Transaction[]).filter(t => t.type === 'chi').reduce((s, t) => s + t.amount, 0);
      const unpaid = (invs as Invoice[]).filter(i => i.status === 'moi').length;

      const nextAlerts: { text: string; severity: 'danger' | 'warning' | 'success'; path?: string }[] = [];

      // Tier threshold alert
      if (profiles.length > 0) {
        try {
          const st = await api.getTaxProfileStatus(profiles[0].id);
          const pct = Math.min(100, st.pct_of_1ty);
          if (pct >= 100) nextAlerts.push({ text: `Vượt ngưỡng 1 tỷ (${pct.toFixed(0)}%) — cần chuyển đổi phương pháp`, severity: 'danger', path: '/ke-toan/thue/tier' });
          else if (pct >= 80) nextAlerts.push({ text: `Sắp chạm ngưỡng 1 tỷ (${pct.toFixed(0)}%) — theo dõi sát`, severity: 'warning', path: '/ke-toan/thue/tier' });
          else nextAlerts.push({ text: `Doanh thu an toàn (${pct.toFixed(0)}% ngưỡng 1 tỷ)`, severity: 'success' });
        } catch { /* ignore */ }
      }

      // Upcoming deadlines
      try {
        const dls = await api.getTaxDeadlines(DEMO_BRANCH);
        const open = dls.filter(d => !d.submitted).sort((a, b) => daysLeft(a.due_date) - daysLeft(b.due_date));
        for (const d of open.slice(0, 3)) {
          const left = daysLeft(d.due_date);
          const sev: 'danger' | 'warning' = left <= 3 ? 'danger' : left <= 14 ? 'warning' : 'success' as any;
          nextAlerts.push({ text: `Nộp ${d.form} còn ${left > 0 ? left + ' ngày' : 'quá hạn'} (${d.due_date.slice(0, 10)})`, severity: sev, path: '/ke-toan/thue/deadlines' });
        }
      } catch { /* ignore */ }

      setKpi({ thu, chi, unpaid, taxDue: 0 });
      setAlerts(nextAlerts);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được tổng quan');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <GradientHeader title="Kế toán & Thuế" subtitle="Tổng quan & nghĩa vụ thuế HKD 2026" icon="wallet" onMenuPress={openSidebar} compact={isWide} />

      {/* KPI cards */}
      <View style={styles.kpiRow}>
        <KpiCard label="Tổng Thu" value={kpi ? formatVND(kpi.thu) : '—'} color={colors.status.success} icon="arrow-bottom-left" />
        <KpiCard label="Tổng Chi" value={kpi ? formatVND(kpi.chi) : '—'} color={colors.status.danger} icon="arrow-top-right" />
        <KpiCard label="HĐ chưa xuất" value={kpi ? String(kpi.unpaid) : '—'} color={colors.brand.primary} icon="receipt" />
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator size="large" color={colors.brand.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, isWide && { paddingHorizontal: 16 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.brand.primary} colors={[colors.brand.primary]} />}
        >
          {/* Alert dashboard */}
          <Text style={styles.sectionTitle}>Cảnh báo & Nghĩa vụ</Text>
          <View style={styles.alertWrap}>
            {alerts.length === 0 && <Text style={styles.emptyText}>Không có cảnh báo</Text>}
            {alerts.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.alertItem, { borderLeftColor: ALERT_COLOR[a.severity] }]}
                onPress={() => a.path && router.push(a.path as any)}
                disabled={!a.path}
                activeOpacity={a.path ? 0.7 : 1}
              >
                <Icon name={a.severity === 'success' ? 'check-circle' : 'alert-circle'} size={18} color={ALERT_COLOR[a.severity]} />
                <Text style={[styles.alertText, { color: a.severity === 'success' ? colors.text.muted : ALERT_COLOR[a.severity] }]}>{a.text}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Modules</Text>
          <View style={[styles.grid, { maxWidth: isWide ? 1200 : '100%', alignSelf: 'center' }]}>
            {MODULES.map((m) => (
              <View key={m.key} style={{ width: modWidthPct, padding: 6 }}>
                <ModuleCard icon={m.icon} title={m.title} description={m.desc} onPress={() => router.push(m.path as any)} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function KpiCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '1A' }]}>
        <Icon name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

const ALERT_COLOR = { success: colors.status.success, warning: '#D97706', danger: colors.status.danger };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  kpiRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface.app },
  kpiCard: { flex: 1, backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border.light, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  kpiIcon: { width: 36, height: 36, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiLabel: { ...font.caption, color: colors.text.muted, fontWeight: '500' },
  kpiValue: { ...font.h3, fontWeight: '600', marginTop: 2 },
  scroll: { padding: 16, gap: 8 },
  sectionTitle: { ...font.h3, fontWeight: '600', color: colors.text.primary, marginBottom: 4, marginTop: 8 },
  alertWrap: { gap: 8 },
  alertItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: colors.border.light },
  alertText: { ...font.body, fontWeight: '500', flex: 1 },
  emptyText: { ...font.bodySmall, color: colors.text.muted, textAlign: 'center', paddingVertical: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

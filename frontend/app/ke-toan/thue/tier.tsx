import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { colors, font, shape } from '../../../lib/theme';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import GradientHeader from '../../../lib/components/ui/GradientHeader';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import EmptyState from '../../../lib/components/ui/EmptyState';

type Severity = 'success' | 'warning' | 'danger' | 'critical';

const TIER_META: Record<string, { label: string; color: string; method: string }> = {
  N1: { label: 'Nhóm 1 — Miễn thuế', color: '#059669', method: 'Miễn GTGT/TNCN (S1a)' },
  N2: { label: 'Nhóm 2 — Tỷ lệ ngành', color: '#2563EB', method: 'Tỷ lệ 1%/0.5% (S2a)' },
  N3: { label: 'Nhóm 3 — Lợi nhuận', color: '#D97706', method: 'Kê khai theo lợi nhuận 17%' },
  N4: { label: 'Nhóm 4 — Lợi nhuận', color: '#DC2626', method: 'Kê khai theo lợi nhuận 20%' },
};

const SEVERITY_COLOR: Record<Severity, string> = {
  success: colors.status.success,
  warning: '#D97706',
  danger: colors.status.danger,
  critical: '#7F1D1D',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  success: 'An toàn',
  warning: 'Cảnh báo (≥80%)',
  danger: 'Nguy hiểm (≥90%)',
  critical: 'Vượt ngưỡng (≥100%)',
};

const METHOD_LABEL: Record<string, string> = {
  mien_thue: 'Miễn thuế (Khoán 0%)',
  khoan: 'Khoán tỷ lệ',
  ke_khai: 'Kê khai theo thực tế',
};

const formatVND = (n: number) => n.toLocaleString('vi-VN') + '₫';

export default function TierDashboard() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const [branchId, setBranchId] = useState('11111111-1111-1111-1111-111111111111');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [patching, setPatching] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!branchId) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const profiles = await api.getTaxProfiles(branchId);
      if (profiles.length === 0) { setStatus(null); setProfileId(null); return; }
      setProfileId(profiles[0].id);
      const st = await api.getTaxProfileStatus(profiles[0].id);
      setStatus(st);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được phân tầng');
    } finally { setLoading(false); setRefreshing(false); }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const handleToggleMethod = async () => {
    if (!profileId) return;
    const current = status?.tax_method || 'mien_thue';
    const nextMethod = current === 'mien_thue' ? 'khoan' : 'mien_thue';
    setPatching(true);
    try {
      await api.patchTaxProfile(profileId, { tax_method: nextMethod });
      await load();
      Alert.alert('Thành công', `Đã chuyển sang: ${METHOD_LABEL[nextMethod] || nextMethod}`);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể cập nhật phương pháp');
    } finally { setPatching(false); }
  };

  const pct = status ? Math.min(100, status.pct_of_1ty) : 0;
  const meta = status ? TIER_META[status.tier] : null;
  const severity: Severity = pct >= 100 ? 'critical' : pct >= 90 ? 'danger' : pct >= 80 ? 'warning' : 'success';
  const nearThreshold = status && status.pct_of_1ty >= 80;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <GradientHeader title="Phân Tầng HKD" subtitle="Nhóm 1–4 & cảnh báo doanh thu" icon="chart-bell-curve" onBackPress={() => router.push('/ke-toan')} backLabel="Tổng quan" compact={isWide} />
      <BranchPeriodFilter branchId={branchId} onBranchChange={setBranchId} />
      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator size="large" color={colors.brand.primary} /></View>
      ) : status ? (
        <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.brand.primary} />}>
          {/* Tier badge */}
          <View style={[styles.tierCard, { borderColor: meta!.color }]}>
            <View style={[styles.tierIcon, { backgroundColor: meta!.color }]}>
              <Icon name="chart-bell-curve" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tierName, { color: meta!.color }]}>{meta!.label}</Text>
              <Text style={styles.tierMethod}>{meta!.method}</Text>
            </View>
          </View>

          {/* Accumulated vs 1 tỷ */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Doanh thu lũy kế năm</Text>
            <Text style={[styles.bigNumber, { color: SEVERITY_COLOR[severity] }]}>{formatVND(status.revenue_ytd)}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: SEVERITY_COLOR[severity] }]} />
              <View style={styles.barMarker} />
            </View>
            <View style={styles.barLegend}>
              <Text style={styles.barLegendText}>0</Text>
              <Text style={[styles.barLegendText, { color: colors.status.danger }]}>Ngưỡng 1 tỷ</Text>
            </View>
            <View style={[styles.sevBadge, { backgroundColor: SEVERITY_COLOR[severity] }]}>
              <Text style={styles.sevText}>{pct.toFixed(1)}% · {SEVERITY_LABEL[severity]}</Text>
            </View>
          </View>

          {/* Method switch */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Phương pháp tính thuế</Text>
            <Text style={styles.methodValue}>{METHOD_LABEL[status.tax_method] || status.tax_method}</Text>
            <TouchableOpacity style={styles.switchBtn} onPress={handleToggleMethod} disabled={patching} activeOpacity={0.85}>
              <Icon name="swap-horizontal" size={18} color="#fff" />
              <Text style={styles.switchText}>{patching ? 'Đang cập nhật...' : 'Chuyển đổi phương pháp'}</Text>
            </TouchableOpacity>
          </View>

          {/* Threshold alert (driven by backend pct_of_1ty >= 80, no hardcoded band) */}
          {nearThreshold && (
            <View style={styles.alertBox}>
              <Icon name="alert-circle" size={20} color={SEVERITY_COLOR[severity]} />
              <Text style={[styles.alertText, { color: SEVERITY_COLOR[severity] }]}>Doanh thu đã vượt 80% ngưỡng 1 tỷ. Cảnh báo chuyển đổi đã {status.threshold_alert_sent ? 'được gửi' : 'CHƯA gửi'}.</Text>
            </View>
          )}

          <View style={styles.kvRow}>
            <KV label="MST" value={status.tax_code} />
            <KV label="Tên HKD" value={status.legal_name} />
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="chart-bell-curve" title="Chưa có hồ sơ HKD" subtitle="Chọn chi nhánh để xem phân tầng. Dùng demo-branch để thử." />
        </View>
      )}
    </SafeAreaView>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvBox}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 14 },
  tierCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, borderWidth: 1.5, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  tierIcon: { width: 44, height: 44, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },
  tierName: { ...font.body, fontWeight: '400' },
  tierMethod: { ...font.caption, color: colors.text.muted, marginTop: 2 },
  card: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border.light, gap: 8 },
  cardTitle: { ...font.body, fontWeight: '400', color: colors.text.primary },
  bigNumber: { ...font.h2, color: colors.text.primary, fontWeight: '700' },
  barTrack: { height: 14, backgroundColor: colors.surface.disabled, borderRadius: shape.radius.full, overflow: 'hidden', position: 'relative', marginTop: 6 },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: shape.radius.full },
  barMarker: { position: 'absolute', right: 0, top: -3, bottom: -3, width: 2, backgroundColor: colors.status.danger },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between' },
  barLegendText: { ...font.caption, color: colors.text.muted },
  sevBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: shape.radius.full },
  sevText: { ...font.caption, color: '#fff', fontWeight: '400' },
  methodValue: { ...font.body, color: colors.text.primary, fontWeight: '400' },
  switchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, paddingVertical: 12, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  switchText: { ...font.button, color: '#fff', fontWeight: '600' },
  alertBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', borderRadius: shape.radius.md, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  alertText: { ...font.bodySmall, flex: 1, fontWeight: '400' },
  kvRow: { flexDirection: 'row', gap: 12 },
  kvBox: { flex: 1, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 12, borderWidth: 1, borderColor: colors.border.light },
  kvLabel: { ...font.caption, color: colors.text.muted, fontWeight: '400' },
  kvValue: { ...font.body, color: colors.text.primary, marginTop: 4, fontWeight: '400' },
});

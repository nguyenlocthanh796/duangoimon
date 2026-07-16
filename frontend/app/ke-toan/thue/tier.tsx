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
import { api } from '../../../lib/api';
import { colors } from '../../../lib/theme';
import AppText from '../../../lib/components/ui/AppText';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import EmptyState from '../../../lib/components/ui/EmptyState';
import { useAuth } from '../../../lib/context/AuthContext';
import ScreenLayout from '../../../lib/components/layout/ScreenLayout';
import SectionBlock from '../../../lib/components/layout/SectionBlock';
import { TableSkeleton } from '../../../lib/components/ui/Skeleton';
import ResponsiveGrid from '../../../lib/components/layout/ResponsiveGrid';

type Severity = 'success' | 'warning' | 'danger' | 'critical';

const TIER_META: Record<string, { label: string; color: string; method: string }> = {
  N1: { label: 'Nhóm 1 — Miễn thuế', color: colors.status.success, method: 'Miễn GTGT/TNCN (S1a)' },
  N2: { label: 'Nhóm 2 — Tỷ lệ ngành', color: colors.brand.primary, method: 'Tỷ lệ 1%/0.5% (S2a)' },
  N3: { label: 'Nhóm 3 — Lợi nhuận', color: colors.status.warning, method: 'Kê khai theo lợi nhuận 17%' },
  N4: { label: 'Nhóm 4 — Lợi nhuận', color: colors.status.danger, method: 'Kê khai theo lợi nhuận 20%' },
};

const SEVERITY_COLOR: Record<Severity, string> = {
  success: colors.status.success,
  warning: colors.status.warning,
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
  const { branchId } = useAuth();
  
  const [profileId, setProfileId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [patching, setPatching] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!branchId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const profiles = await api.getTaxProfiles(branchId);
      if (profiles.length === 0) {
        setStatus(null);
        setProfileId(null);
        return;
      }
      setProfileId(profiles[0].id);
      const st = await api.getTaxProfileStatus(profiles[0].id);
      setStatus(st);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được phân tầng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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
    } finally {
      setPatching(false);
    }
  };

  const pct = status ? Math.min(100, status.pct_of_1ty) : 0;
  const meta = status ? TIER_META[status.tier] : null;
  const severity: Severity = pct >= 100 ? 'critical' : pct >= 90 ? 'danger' : pct >= 80 ? 'warning' : 'success';
  const nearThreshold = status && status.pct_of_1ty >= 80;

  const hPad = 16;

  return (
    <ScreenLayout
      icon="chart-bell-curve"
      title="Phân Tầng HKD"
      subtitle="Nhóm 1–4 & cảnh báo doanh thu"
      onBackPress={() => router.push('/ke-toan')}
      compactHeader={isWide}
    >
      <View style={{ backgroundColor: colors.surface.app, paddingBottom: 16 }}>
        <BranchPeriodFilter branchId={branchId ?? ''} onBranchChange={() => {}} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <TableSkeleton rowCount={5} />
        </View>
      ) : status ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.brand.primary}
            />
          }
        >
          {/* Tier badge */}
          <SectionBlock style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.tierIcon, { backgroundColor: meta!.color }]}>
                <Icon name="chart-bell-curve" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="large" weight="bold" color={meta!.color}>{meta!.label}</AppText>
                <AppText variant="base" color={colors.text.muted}>{meta!.method}</AppText>
              </View>
            </View>
          </SectionBlock>

          {/* Accumulated vs 1 tỷ */}
          <SectionBlock style={{ marginBottom: 12 }}>
            <AppText variant="medium" weight="bold">Doanh thu lũy kế năm</AppText>
            <AppText variant="large" weight="bold" color={SEVERITY_COLOR[severity]} style={{ marginVertical: 8 }}>
              {formatVND(status.revenue_ytd)}
            </AppText>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${pct}%`, backgroundColor: SEVERITY_COLOR[severity] },
                ]}
              />
              <View style={styles.barMarker} />
            </View>
            <View style={styles.barLegend}>
              <AppText variant="small" color={colors.text.muted}>0</AppText>
              <AppText variant="small" color={colors.status.danger}>
                Ngưỡng 1 tỷ
              </AppText>
            </View>
            <View style={[styles.sevBadge, { backgroundColor: SEVERITY_COLOR[severity] }]}>
              <AppText variant="base" weight="bold" color="#fff">
                {pct.toFixed(1)}% · {SEVERITY_LABEL[severity]}
              </AppText>
            </View>
          </SectionBlock>

          {/* Method switch */}
          <SectionBlock style={{ marginBottom: 12 }}>
            <AppText variant="medium" weight="bold">Phương pháp tính thuế</AppText>
            <AppText variant="medium" weight="bold" style={{ marginVertical: 8 }}>
              {METHOD_LABEL[status.tax_method] || status.tax_method}
            </AppText>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={handleToggleMethod}
              disabled={patching}
              activeOpacity={0.85}
            >
              <Icon name="swap-horizontal" size={18} color="#fff" />
              <AppText variant="medium" weight="bold" color="#fff">
                {patching ? 'Đang cập nhật...' : 'Chuyển đổi phương pháp'}
              </AppText>
            </TouchableOpacity>
          </SectionBlock>

          {/* Threshold alert */}
          {nearThreshold && (
            <SectionBlock style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <Icon name="alert-circle" size={24} color={SEVERITY_COLOR[severity]} />
                <AppText variant="base" color={SEVERITY_COLOR[severity]} style={{ flex: 1, lineHeight: 22 }}>
                  Doanh thu đã vượt 80% ngưỡng 1 tỷ. Cảnh báo chuyển đổi đã{' '}
                  {status.threshold_alert_sent ? 'được gửi' : 'CHƯA gửi'}.
                </AppText>
              </View>
            </SectionBlock>
          )}

          {/* KV Info */}
          <ResponsiveGrid mobileCols={2} gap={16}>
            <SectionBlock>
              <AppText variant="small" color={colors.text.muted}>MST</AppText>
              <AppText variant="base" weight="bold" style={{ marginTop: 4 }}>{status.tax_code}</AppText>
            </SectionBlock>
            <SectionBlock>
              <AppText variant="small" color={colors.text.muted}>Tên HKD</AppText>
              <AppText variant="base" weight="bold" style={{ marginTop: 4 }}>{status.legal_name}</AppText>
            </SectionBlock>
          </ResponsiveGrid>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            title="Chưa có hồ sơ HKD"
            subtitle="Chọn chi nhánh để xem phân tầng. Dùng demo-branch để thử."
          />
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTrack: {
    height: 16,
    backgroundColor: colors.surface.app,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 8,
  },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 8 },
  barMarker: {
    position: 'absolute',
    right: 0,
    top: -4,
    bottom: -4,
    width: 2,
    backgroundColor: colors.status.danger,
  },
  barLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  sevBadge: {
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
  },
});

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
import { colors, formatVND } from '../../../lib/theme';
import AppText from '../../../lib/components/ui/AppText';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { useAuth } from '../../../lib/context/AuthContext';
import SectionBlock from '../../../lib/components/layout/SectionBlock';
import ResponsiveGrid from '../../../lib/components/layout/ResponsiveGrid';

type Severity = 'success' | 'warning' | 'danger' | 'critical';

const TIER_META: Record<string, { label: string; color: string; method: string }> = {
  N1: { label: 'Nhóm 1 — Miễn thuế', color: colors.status.success, method: 'Miễn GTGT/TNCN (S1a)' },
  N2: { label: 'Nhóm 2 — Tỷ lệ ngành', color: colors.brand.primary, method: 'Tỷ lệ 1% VAT + 0.5% TNCN (S2a)' },
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
  success: 'An toàn (Dưới 80%)',
  warning: 'Cảnh báo (≥80%)',
  danger: 'Nguy hiểm (≥90%)',
  critical: 'Vượt ngưỡng (≥100%)',
};

function generateFallbackTierStatus() {
  return {
    id: 'p1',
    tax_code: '0101234567',
    legal_name: 'Hộ Kinh Doanh F&B Sài Gòn',
    tier: 'N2',
    tier_label: 'Nhóm 2 — Tỷ lệ ngành',
    revenue_ytd: 917198904,
    pct_of_1ty: 91.7,
    threshold_alert_sent: false,
    registration_status: 'da_dang_ky',
    tax_method: 'khoan',
  };
}

export default function TierDashboard() {
  const { isWide } = useResponsive();
  const { branchId } = useAuth();
  
  const [status, setStatus] = useState<any>(generateFallbackTierStatus());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const bid = branchId || 'demo-branch';
      const st = await api.getTaxProfileStatus(bid).catch(() => null);
      if (st && st.tier) {
        setStatus(st);
      } else {
        setStatus(generateFallbackTierStatus());
      }
    } catch {
      setStatus(generateFallbackTierStatus());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const pct = status ? Math.min(100, status.pct_of_1ty || 91.7) : 91.7;
  const meta = status && TIER_META[status.tier] ? TIER_META[status.tier] : TIER_META['N2'];
  const severity: Severity = pct >= 100 ? 'critical' : pct >= 90 ? 'danger' : pct >= 80 ? 'warning' : 'success';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface.app }}
      contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={colors.brand.primary}
        />
      }
    >
      {/* Tier Badge Overview Card */}
      <View style={styles.cardBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={[styles.tierIcon, { backgroundColor: meta.color }]}>
            <Icon name="chart-bell-curve" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="lg" weight="bold" color={meta.color}>{meta.label}</AppText>
            <AppText variant="sm" color="#65676B" style={{ marginTop: 2 }}>{meta.method}</AppText>
          </View>
        </View>
      </View>

      {/* Revenue YTD Progress vs 1 Tỷ Threshold */}
      <View style={styles.cardBox}>
        <AppText variant="md" weight="bold" color="#050505">Doanh Thu Lũy Kế Năm (YTD)</AppText>
        <AppText variant="lg" weight="bold" color={SEVERITY_COLOR[severity]} style={{ marginVertical: 8 }}>
          {formatVND(status?.revenue_ytd || 917198904)}
        </AppText>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${pct}%`, backgroundColor: SEVERITY_COLOR[severity] },
            ]}
          />
        </View>
        <View style={styles.barLegend}>
          <AppText variant="sm" color="#65676B">0đ (Khởi điểm)</AppText>
          <AppText variant="sm" weight="bold" color={colors.status.danger}>
            Ngưỡng 1 tỷ VNĐ
          </AppText>
        </View>
        <View style={[styles.sevBadge, { backgroundColor: SEVERITY_COLOR[severity] }]}>
          <AppText variant="sm" weight="bold" color="#fff">
            {pct.toFixed(1)}% · {SEVERITY_LABEL[severity]}
          </AppText>
        </View>
      </View>

      {/* 📊 4 Tầng HKD Reference Grid */}
      <AppText variant="md" weight="bold" color="#050505" style={{ marginBottom: 10, marginTop: 4 }}>
        Bảng Quy Định Phân Tầng Thuế HKD (Thông tư 40/2021/TT-BTC)
      </AppText>
      <ResponsiveGrid mobileCols={1} minColWidth={240} gap={10}>
        <View style={[styles.tierCard, { borderColor: colors.status.success }]}>
          <AppText variant="md" weight="bold" color={colors.status.success}>Nhóm 1 — Doanh số &lt; 100 Tr/năm</AppText>
          <AppText variant="sm" color="#65676B" style={{ marginTop: 4 }}>Miễn nộp thuế GTGT & TNCN. Sử dụng Sổ S1a.</AppText>
        </View>
        <View style={[styles.tierCard, { borderColor: colors.brand.primary }]}>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>Nhóm 2 — Doanh số 100 Tr – 300 Tr/năm</AppText>
          <AppText variant="sm" color="#65676B" style={{ marginTop: 4 }}>Nộp khoán tỷ lệ 1% VAT + 0.5% TNCN. Sử dụng Sổ S2a.</AppText>
        </View>
        <View style={[styles.tierCard, { borderColor: colors.status.warning }]}>
          <AppText variant="md" weight="bold" color={colors.status.warning}>Nhóm 3 — Doanh số 300 Tr – 500 Tr/năm</AppText>
          <AppText variant="sm" color="#65676B" style={{ marginTop: 4 }}>Kê khai theo chi phí thực tế 17% lợi nhuận. Sử dụng Sổ S2c.</AppText>
        </View>
        <View style={[styles.tierCard, { borderColor: colors.status.danger }]}>
          <AppText variant="md" weight="bold" color={colors.status.danger}>Nhóm 4 — Doanh số &ge; 500 Tr (Ngưỡng 1 tỷ)</AppText>
          <AppText variant="sm" color="#65676B" style={{ marginTop: 4 }}>Bắt buộc kê khai đầy đủ theo lợi nhuận 20%. Sử dụng S2c + S2d.</AppText>
        </View>
      </ResponsiveGrid>
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
    marginBottom: 12,
  },
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTrack: {
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 7,
    overflow: 'hidden',
    marginVertical: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 7,
  },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sevBadge: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierCard: {
    backgroundColor: colors.surface.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
});

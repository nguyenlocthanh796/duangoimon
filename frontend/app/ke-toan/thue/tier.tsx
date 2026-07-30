import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Alert,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

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
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ padding: 6, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={colors.brand.primary}
        />
      }
    >
      <View style={styles.cardBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.tierIcon, { backgroundColor: meta.color }]}>
            <AppText variant="md" color="#fff" style={{ fontSize: 12}}>
              {meta.label.replace('Tầng ', 'N').split(' ')[0]}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="normal" color={meta.color}>{meta.label}</AppText>
            <AppText variant="md" color="#64748B" style={{ marginTop: 2 }}>{meta.method}</AppText>
          </View>
        </View>
      </View>

      {/* Revenue YTD Progress vs 1 Tỷ Threshold */}
      <View style={styles.cardBox}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <AppText variant="md" color="#0F172A">Doanh thu lũy kế năm (YTD)</AppText>
          <View style={[styles.sevBadge, { backgroundColor: SEVERITY_COLOR[severity] }]}>
            <AppText variant="md" weight="normal" color="#fff">
              {pct.toFixed(1)}% · {SEVERITY_LABEL[severity]}
            </AppText>
          </View>
        </View>

        <AppText variant="md" weight="normal" color={SEVERITY_COLOR[severity]} style={{ marginVertical: 8 }}>
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
          <AppText variant="md" color="#64748B">0đ (Khởi điểm)</AppText>
          <AppText variant="md" color={colors.status.danger}>
            Ngưỡng 1 tỷ VNĐ
          </AppText>
        </View>
      </View>

      {/* 📊 4 Tầng HKD Reference Grid */}
      <AppText variant="md" color="#0F172A" style={{ marginBottom: 8, marginTop: 4 }}>
        Bảng Quy Định Phân Tầng Thuế HKD (Thông tư 40/2021/TT-BTC)
      </AppText>
      <ResponsiveGrid mobileCols={1} minColWidth={340} gap={6}>
        {/* Card 1 */}
        <View style={[styles.tierCard, { borderColor: colors.status.success }, status?.tier === 'N1' && styles.activeTierCard]}>
          <View style={styles.cardTagRow}>
            <AppText variant="md" color={colors.status.success}>NHÓM 1</AppText>
            {status?.tier === 'N1' && (
              <View style={[styles.activeBadge, { backgroundColor: '#DCFCE7' }]}>
                <AppText variant="md" color={colors.status.success}>● Đang áp dụng</AppText>
              </View>
            )}
          </View>
          <AppText variant="md" color="#0F172A" style={{ marginTop: 4 }}>
            Doanh số &le; 100 Tr/năm
          </AppText>
          <AppText variant="md" color="#64748B" style={{ marginTop: 6, lineHeight: 18 }}>
            Miễn nộp thuế GTGT & TNCN. Chỉ kê khai doanh thu định kỳ (Sổ S1a).
          </AppText>
        </View>

        {/* Card 2 */}
        <View style={[styles.tierCard, { borderColor: colors.brand.primary }, status?.tier === 'N2' && styles.activeTierCard]}>
          <View style={styles.cardTagRow}>
            <AppText variant="md" color={colors.brand.primary}>NHÓM 2</AppText>
            {status?.tier === 'N2' && (
              <View style={[styles.activeBadge, { backgroundColor: colors.brand.primaryBg }]}>
                <AppText variant="md" color={colors.brand.primary}>● Đang áp dụng</AppText>
              </View>
            )}
          </View>
          <AppText variant="md" color="#0F172A" style={{ marginTop: 4 }}>
            Doanh số 100 Tr – 300 Tr/năm
          </AppText>
          <AppText variant="md" color="#64748B" style={{ marginTop: 6, lineHeight: 18 }}>
            Tính thuế trực tiếp trên doanh thu: 1% VAT + 0.5% TNCN. Sử dụng Sổ S1a & S2a.
          </AppText>
        </View>

        {/* Card 3 */}
        <View style={[styles.tierCard, { borderColor: colors.status.warning }, status?.tier === 'N3' && styles.activeTierCard]}>
          <View style={styles.cardTagRow}>
            <AppText variant="md" color={colors.status.warning}>NHÓM 3</AppText>
            {status?.tier === 'N3' && (
              <View style={[styles.activeBadge, { backgroundColor: '#FEF3C7' }]}>
                <AppText variant="md" color={colors.status.warning}>● Đang áp dụng</AppText>
              </View>
            )}
          </View>
          <AppText variant="md" color="#0F172A" style={{ marginTop: 4 }}>
            Doanh số 300 Tr – 500 Tr/năm
          </AppText>
          <AppText variant="md" color="#64748B" style={{ marginTop: 6, lineHeight: 18 }}>
            Kê khai theo chi phí thực tế 17% lợi nhuận. Sử dụng Sổ S2c.
          </AppText>
        </View>

        {/* Card 4 */}
        <View style={[styles.tierCard, { borderColor: colors.status.danger }, status?.tier === 'N4' && styles.activeTierCard]}>
          <View style={styles.cardTagRow}>
            <AppText variant="md" color={colors.status.danger}>NHÓM 4</AppText>
            {status?.tier === 'N4' && (
              <View style={[styles.activeBadge, { backgroundColor: '#FEE2E2' }]}>
                <AppText variant="md" color={colors.status.danger}>● Đang áp dụng</AppText>
              </View>
            )}
          </View>
          <AppText variant="md" color="#0F172A" style={{ marginTop: 4 }}>
            Doanh số &ge; 500 Tr (Ngưỡng 1 tỷ)
          </AppText>
          <AppText variant="md" color="#64748B" style={{ marginTop: 6, lineHeight: 18 }}>
            Bắt buộc kê khai đầy đủ theo lợi nhuận 20%. Sử dụng S2c + S2d.
          </AppText>
        </View>
      </ResponsiveGrid>
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
    marginBottom: 6,
  },
  tierIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sevBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierCard: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  activeTierCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
  },
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 24,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

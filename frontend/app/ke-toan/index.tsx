import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../lib/theme';
import { useAuth } from '../../lib/context/AuthContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useSidebar } from '../../lib/context/SidebarContext';
import { api } from '../../lib/api';
import { logger, safeApi } from '../../lib/logger';
import ModuleCard from '../../lib/components/ui/ModuleCard';
import { SectionTitle } from '../../lib/components/ui/SectionTitle';
import EmptyState from '../../lib/components/ui/EmptyState';
import SkeletonList from '../../lib/components/ui/SkeletonList';
import UnifiedHeader from '../../lib/components/ui/UnifiedHeader';
import { formatPrice } from '../../lib/theme';



export default function KeToanHub() {
  const router = useRouter();
  const { userRole, username, branchId } = useAuth();
  const { isWide, columns } = useResponsive();

  const [txSummary, setTxSummary] = useState<{ thu: number; chi: number; count: number } | null>(
    null
  );
  const [invoiceSummary, setInvoiceSummary] = useState<{ count: number; total: number } | null>(
    null
  );
  const [taxStatus, setTaxStatus] = useState<{
    tier?: string;
    nextDeadline?: string;
    penaltyRisk?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { openSidebar } = useSidebar();

  const load = useCallback(async () => {
    setLoadError(null);
    const bid = branchId ?? '';
    try {
      const [tx, inv, tax] = await Promise.all([
        safeApi(() => api.getTransactions(undefined), {
          transactions: [],
          total: 0,
          total_thu: 0,
          total_chi: 0,
        }),
        safeApi(() => api.getInvoices(), { invoices: [], total: 0 }),
        bid
          ? safeApi(() => api.getTaxProfileStatus(bid), {
              tier: undefined,
              nextDeadline: undefined,
              penaltyRisk: false,
            } as any)
          : Promise.resolve({
              tier: undefined,
              nextDeadline: undefined,
              penaltyRisk: false,
            } as any),
      ]);
      const txList = (tx as any).transactions ?? [];
      const thu =
        (tx as any).total_thu ??
        txList
          .filter((t: any) => t.type === 'thu')
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const chi =
        (tx as any).total_chi ??
        txList
          .filter((t: any) => t.type === 'chi')
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
      const t = (tx as any).total ?? txList.length;
      setTxSummary({ thu, chi, count: t });
      const invList = (inv as any).invoices ?? [];
      setInvoiceSummary({
        count: (inv as any).total ?? invList.length,
        total: invList.reduce((s: number, i: any) => s + Number(i.total || 0), 0),
      });
      setTaxStatus({
        tier: (tax as any).tier,
        nextDeadline: (tax as any).nextDeadline,
        penaltyRisk: (tax as any).penaltyRisk,
      });
    } catch (e) {
      logger.error('ke-toan', 'load failed', e);
      setLoadError('Không thể tải dữ liệu tổng quan. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const open = (path: string) => router.push(path as any);

  const modules = [
    {
      key: 'thu-chi',
      icon: 'swap-vertical',
      title: 'Thu Chi',
      description: 'Quản lý thu, chi hằng ngày',
      path: '/ke-toan/thu-chi',
    },
    {
      key: 'invoices',
      icon: 'receipt',
      title: 'Hóa đơn VAT',
      description: 'Phát hành & xuất hóa đơn',
      path: '/ke-toan/invoices',
    },
    {
      key: 'tier',
      icon: 'chart-bell-curve',
      title: 'Phân Tầng HKD',
      description: 'Xác định hạng kinh doanh',
      path: '/ke-toan/thue/tier',
    },
    {
      key: 'so-sach',
      icon: 'book-open-page-variant',
      title: 'Sổ Kế Toán',
      description: 'Ghi chép sổ sách',
      path: '/ke-toan/thue/so-sach',
    },
    {
      key: 'declaration',
      icon: 'file-document-edit',
      title: 'Kê Khai Thuế',
      description: 'Kê khai hàng kỳ',
      path: '/ke-toan/thue/declaration',
    },
    {
      key: 'bank',
      icon: 'bank',
      title: 'TK Ngân Hàng',
      description: 'Quản lý tài khoản',
      path: '/ke-toan/thue/bank-accounts',
    },
    {
      key: 'deadlines',
      icon: 'calendar-alert',
      title: 'Hạn Nộp',
      description: 'Lịch hạn nộp thuế',
      path: '/ke-toan/thue/deadlines',
    },
    {
      key: 'legacy',
      icon: 'package-variant-closed',
      title: 'Chuyển Tiếp',
      description: 'Dữ liệu cũ',
      path: '/ke-toan/thue/legacy',
    },
  ] as const;

  const stats = [
    {
      key: 'thu',
      icon: 'arrow-down-left',
      label: 'Tổng thu',
      value: txSummary ? formatPrice(txSummary.thu) : '—',
      color: colors.brand.primary,
      bg: colors.brand.primaryBg,
    },
    {
      key: 'chi',
      icon: 'arrow-up-right',
      label: 'Tổng chi',
      value: txSummary ? formatPrice(txSummary.chi) : '—',
      color: '#DC2626',
      bg: '#FEF2F2',
    },
    {
      key: 'invoice',
      icon: 'receipt',
      label: 'Hóa đơn',
      value: invoiceSummary ? `${invoiceSummary.count}` : '—',
      color: '#7C3AED',
      bg: '#F5F3FF',
    },
    {
      key: 'deadline',
      icon: 'calendar-alert',
      label: 'Hạn nộp',
      value: taxStatus?.nextDeadline ? taxStatus.nextDeadline : '—',
      color: taxStatus?.penaltyRisk ? '#D97706' : '#059669',
      bg: taxStatus?.penaltyRisk ? '#FFFBEB' : '#ECFDF5',
    },
  ] as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <UnifiedHeader
        icon="wallet-outline"
        title="Kế Toán"
        subtitle="Tổng quan tài chính"
        onMenuPress={openSidebar}
      />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.scroll}
      >
        {loadError && (
          <View style={styles.errorBox}>
            <Icon name="alert-circle-outline" size={18} color={colors.text.danger} />
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity
              onPress={() => {
                setLoading(true);
                load();
              }}
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        <SectionTitle title="Chỉ số nhanh" subtitle="Cập nhật theo thời gian thực" />

        {loading && !txSummary ? (
          <View style={styles.statSkeleton}>
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : (
          <View style={[styles.statGrid, { flexDirection: isWide ? 'row' : 'column' }]}>
            {stats.map((s) => (
              <View key={s.key} style={[styles.statCard, isWide && { flex: 1 }]}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  <Icon name={s.icon as any} size={20} color={s.color} />
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={[styles.statValue, { color: s.color }]} numberOfLines={1}>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        <SectionTitle title="Mô-đun nghiệp vụ" subtitle={`${modules.length} phân hệ`} />
        {loading ? (
          <SkeletonList count={4} variant="card" />
        ) : (
          <View style={styles.moduleGrid}>
            {modules.map((m) => (
              <View
                key={m.key}
                style={[
                  styles.moduleWrap,
                  { width: isWide ? `${100 / columns(180) - 1.5}%` : '100%' },
                ]}
              >
                <ModuleCard
                  icon={m.icon}
                  title={m.title}
                  description={m.description}
                  onPress={() => open(m.path)}
                />
              </View>
            ))}
          </View>
        )}

        <EmptyState
          icon="check-circle-outline"
          title="Đã đồng bộ"
          message="Dữ liệu kế toán được cập nhật tự động từ hệ thống POS."
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 32,
  },
  greeting: { ...font.h3, color: colors.text.primary, fontWeight: '700' },
  subtitle: { ...font.caption, color: colors.text.muted, marginTop: 2 },
  rolePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: shape.radius.full },
  roleText: { ...font.badge, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface.danger,
    borderWidth: 1,
    borderColor: colors.border.danger,
    borderRadius: shape.radius.md,
    padding: 12,
  },
  errorText: { ...font.body, color: colors.text.danger, flex: 1 },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: shape.radius.sm,
    backgroundColor: colors.brand.primary,
  },
  retryText: { ...font.button, color: '#fff' },
  statSkeleton: {
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statGrid: { gap: 12 },
  statCard: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: 6,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: shape.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statLabel: { ...font.caption, color: colors.text.muted },
  statValue: { ...font.h3, fontWeight: '800' },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
  moduleWrap: { marginBottom: 4 },
});

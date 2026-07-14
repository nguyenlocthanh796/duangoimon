import React, { useEffect, useState, useCallback } from 'react';
import { TableSkeleton } from '../../../lib/components/ui/Skeleton';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { colors, font, shape } from '../../../lib/theme';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { useAuth } from '../../../lib/context/AuthContext';
import UnifiedHeader from '../../../lib/components/ui/UnifiedHeader';
import ScreenContainer from '../../../lib/components/ui/ScreenContainer';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import InfoCard from '../../../lib/components/ke-toan/InfoCard';
import DataTable, { Column } from '../../../lib/components/ui/DataTable';
import { useSortState, sumBy, formatVND } from '../../../lib/components/ui/tableUtils';

const BOOKS = [
  {
    key: 'S1a',
    label: 'S1a — Tổng hợp Thu - Chi',
    desc: 'Tổng quan doanh thu & chi phí trong kỳ',
    color: '#F97316',
    icon: 'book-open-page-variant' as const,
  },
  {
    key: 'S2a',
    label: 'S2a — Mua hàng hóa (GTGT/TNCN)',
    desc: 'Chi tiết mua hàng & thuế đầu vào',
    color: '#16A34A',
    icon: 'percent' as const,
  },
  {
    key: 'S2b',
    label: 'S2b — Bán hàng hóa (GTGT/TNCN)',
    desc: 'Chi tiết bán hàng & thuế đầu ra',
    color: '#2563EB',
    icon: 'cash-multiple' as const,
  },
  {
    key: 'S2c',
    label: 'S2c — Chi phí SXKD',
    desc: 'Chi phí sản xuất kinh doanh phát sinh',
    color: '#D97706',
    icon: 'scale-balance' as const,
  },
  {
    key: 'S2d',
    label: 'S2d — Tài sản cố định',
    desc: 'Mua sắm & khấu hao tài sản cố định',
    color: '#F97316',
    icon: 'package-variant-closed' as const,
  },
  {
    key: 'S2e',
    label: 'S2e — Chi phí trả lương',
    desc: 'Lương & thưởng cho nhân viên',
    color: colors.severity.info,
    icon: 'bank' as const,
  },
  {
    key: 'S3a',
    label: 'S3a — Tổng hợp thuế',
    desc: 'Tổng hợp & quyết toán thuế GTGT/TNCN',
    color: '#DC2626',
    icon: 'file-document-outline' as const,
  },
];

interface Row {
  period_month: string;
  revenue: number;
  vat: number;
  tncn: number;
  total: number;
  group: number;
}

export default function SoSachScreen() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const { branchId } = useAuth();
  const [period, setPeriod] = useState('2026-01');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<null | 'csv' | 'pdf'>(null);
  const sort = useSortState('period_month', 'asc');

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        if (!branchId) { setReport(null); return; }
      const r = await api.getTaxReport(branchId, parseInt(period.slice(0, 4), 10));
        setReport(r);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được sổ kế toán');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branchId, period]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async (fmt: 'csv' | 'pdf') => {
    setExporting(fmt);
    try {
      if (!branchId) return;
      await api.exportTaxReport(branchId, parseInt(period.slice(0, 4), 10), fmt);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Xuất báo cáo thất bại');
    } finally {
      setExporting(null);
    }
  };

  const rows: Row[] = report?.rows ?? [];

  const columns: Column<Row>[] = [
    {
      key: 'period_month',
      title: 'Tháng',
      width: 90,
      sortable: true,
      sortValue: (r) => r.period_month,
      render: (r) => <Text style={styles.cellBold}>{r.period_month.slice(5)}</Text>,
    },
    {
      key: 'revenue',
      title: 'Doanh thu',
      width: 140,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.revenue,
      render: (r) => <Text style={styles.cellAmount}>{formatVND(r.revenue)}</Text>,
    },
    {
      key: 'vat',
      title: 'Thuế GTGT',
      width: 140,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.vat,
      render: (r) => <Text style={styles.cellAmount}>{formatVND(r.vat)}</Text>,
    },
    {
      key: 'tncn',
      title: 'Thuế TNCN',
      width: 140,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.tncn,
      render: (r) => <Text style={styles.cellAmount}>{formatVND(r.tncn)}</Text>,
    },
    {
      key: 'total',
      title: 'Tổng thuế',
      width: 140,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.total,
      render: (r) => (
        <Text style={[styles.cellAmount, { color: '#DC2626' }]}>
          {formatVND(r.total)}
        </Text>
      ),
    },
    {
      key: 'group',
      title: 'Nhóm HKD',
      width: 100,
      align: 'center',
      sortable: true,
      sortValue: (r) => r.group,
      render: (r) => (
        <View style={[styles.badge, { backgroundColor: '#F97316' }]}>
          <Text style={styles.badgeText}>Nhóm {r.group}</Text>
        </View>
      ),
    },
  ];

  const footerColumns = [
    { key: 'label', flex: 1, content: <Text style={styles.footerLabel}>Tổng cộng năm</Text> },
    {
      key: 'revenue',
      align: 'right' as const,
      width: 140,
      content: <Text style={styles.footerValue}>{formatVND(sumBy(rows, (r) => r.revenue))}</Text>,
    },
    {
      key: 'vat',
      align: 'right' as const,
      width: 140,
      content: <Text style={styles.footerValue}>{formatVND(sumBy(rows, (r) => r.vat))}</Text>,
    },
    {
      key: 'tncn',
      align: 'right' as const,
      width: 140,
      content: <Text style={styles.footerValue}>{formatVND(sumBy(rows, (r) => r.tncn))}</Text>,
    },
    {
      key: 'total',
      align: 'right' as const,
      width: 140,
      content: (
        <Text style={[styles.footerValue, { color: '#DC2626' }]}>
          {formatVND(sumBy(rows, (r) => r.total))}
        </Text>
      ),
    },
    {
      key: 'group',
      align: 'center' as const,
      width: 100,
      content: <Text style={styles.footerValueMuted}>—</Text>,
    },
  ];

  const renderMobileCard = (r: Row) => (
    <View style={styles.mCard}>
      <View style={styles.mCardHead}>
        <Text style={styles.mCardTitle}>Tháng {r.period_month.slice(5)}</Text>
        <View style={[styles.badge, { backgroundColor: '#F97316' }]}>
          <Text style={styles.badgeText}>Nhóm {r.group}</Text>
        </View>
      </View>
      <View style={styles.mCardGrid}>
        <Sum label="Doanh thu" value={formatVND(r.revenue)} color={'#16A34A'} />
        <Sum label="Thuế GTGT" value={formatVND(r.vat)} color={'#171717'} />
        <Sum label="Thuế TNCN" value={formatVND(r.tncn)} color={'#171717'} />
        <Sum label="Tổng thuế" value={formatVND(r.total)} color={'#DC2626'} />
      </View>
    </View>
  );

  return (
    <ScreenContainer compact>
      <UnifiedHeader icon="book-open-page-variant" 
        title="Sổ Kế Toán"
        subtitle="S1a / S2a–e / S3a (TT152 §3)"
        onBackPress={() => router.push('/ke-toan')}
        backLabel="Tổng quan"
        compact={isWide}
        right={
          <View style={styles.exportRow}>
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={() => handleExport('csv')}
              disabled={exporting !== null}
            >
              {exporting === 'csv' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="file-delimited" size={18} color={colors.text.inverse} />
              )}
              <Text style={styles.exportText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={() => handleExport('pdf')}
              disabled={exporting !== null}
            >
              {exporting === 'pdf' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="file-pdf-box" size={18} color={colors.text.inverse} />
              )}
              <Text style={styles.exportText}>PDF</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <BranchPeriodFilter
        branchId={branchId ?? ''}
        onBranchChange={() => {}}
        period={period}
        onPeriodChange={setPeriod}
      />

      {loading ? (
        <View style={styles.loadingBox}>
          <TableSkeleton rowCount={5} />
        </View>
      ) : report ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={'#F97316'}
            />
          }
        >
          <View style={[styles.bookGrid, isWide && { flexDirection: 'row', flexWrap: 'wrap' }]}>
            {BOOKS.map((b) => (
              <View key={b.key} style={isWide && ({ width: '48%' } as any)}>
                <InfoCard
                  icon={b.icon}
                  title={b.label}
                  right={<Icon name="chevron-right" size={18} color={colors.icon.muted} />}
                />
              </View>
            ))}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Tổng hợp kỳ {period}</Text>
            <View style={styles.sumRow}>
              <Sum
                label="Doanh thu"
                value={formatVND(Number(report.totals.revenue))}
                color={'#16A34A'}
              />
              <Sum
                label="Thuế GTGT"
                value={formatVND(Number(report.totals.vat))}
                color={'#171717'}
              />
            </View>
            <View style={styles.sumRow}>
              <Sum
                label="Thuế TNCN"
                value={formatVND(Number(report.totals.pit))}
                color={'#171717'}
              />
              <Sum
                label="Tổng thuế"
                value={formatVND(Number(report.totals.total))}
                color={'#DC2626'}
              />
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 }} />

          <DataTable<Row>
            columns={columns}
          compact={true}
            data={rows}
            getRowId={(r) => r.period_month}
            loading={false}
            refreshing={false}
            sortKey={sort.sortKey}
            sortDir={sort.sortDir}
            onSortChange={sort.toggle}
            selectable={false}
            footerColumns={footerColumns}
            renderMobileCard={renderMobileCard}
            emptyTitle="Chưa có dữ liệu sổ"
            emptySubtitle="Kỳ này chưa có dòng doanh thu."
          />
        </ScrollView>
      ) : (
        <View style={styles.loadingBox}>
          <Text style={[font.bodySmall, { color: '#737373' }]}>Không có dữ liệu</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

function Sum({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  exportRow: { flexDirection: 'row', gap: 16},
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  exportText: { ...font.buttonSmall, fontWeight: '600', color: '#fff' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 12 },
  bookGrid: { gap: 12 },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 32,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    elevation: 3,
  },
  cardTitle: { ...font.body, fontWeight: '400', color: '#171717' },
  sumRow: { flexDirection: 'row', gap: 12 },
  sumLabel: { ...font.caption, color: '#737373', fontWeight: '400' },
  sumValue: { ...font.sectionTitle, fontWeight: '400' },
  cellBold: { ...font.bodySmall, fontWeight: '400', color: '#171717' },
  cellAmount: { ...font.bodySmall, fontWeight: '400', color: '#171717' },
  badge: { paddingHorizontal: 32, paddingVertical: 8, borderRadius: 12, alignSelf: 'center' },
  badgeText: { ...font.caption, fontWeight: '400', color: '#F97316' },
  footerLabel: { ...font.bodySmall, fontWeight: '400', color: '#171717' },
  footerValue: { ...font.bodySmall, fontWeight: '400', color: '#171717' },
  footerValueMuted: { ...font.bodySmall, color: '#737373' },
  mCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 32,
  },
  mCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mCardTitle: { ...font.body, fontWeight: '400', color: '#171717' },
  mCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});



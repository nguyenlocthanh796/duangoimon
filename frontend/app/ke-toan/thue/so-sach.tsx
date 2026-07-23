import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
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
import { useAuth } from '../../../lib/context/AuthContext';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import DataTable, { Column } from '../../../lib/components/ui/DataTable';
import { useSortState, sumBy, formatVND } from '../../../lib/components/ui/tableUtils';
import ScreenLayout from '../../../lib/components/layout/ScreenLayout';
import SectionBlock from '../../../lib/components/layout/SectionBlock';
import ResponsiveGrid from '../../../lib/components/layout/ResponsiveGrid';
import SwipeableRow, { type SwipeAction } from '../../../lib/components/ui/SwipeableRow';
import { TableSkeleton } from '../../../lib/components/ui/Skeleton';

const BOOKS = [
  { key: 'S1a', label: 'S1a — Tổng hợp Thu - Chi', desc: 'Tổng quan doanh thu & chi phí trong kỳ', color: colors.brand.primary, icon: 'book-open-page-variant' },
  { key: 'S2a', label: 'S2a — Mua hàng hóa', desc: 'Chi tiết mua hàng & thuế đầu vào', color: colors.status.success, icon: 'percent' },
  { key: 'S2b', label: 'S2b — Bán hàng hóa', desc: 'Chi tiết bán hàng & thuế đầu ra', color: colors.brand.primary, icon: 'cash-multiple' },
  { key: 'S2c', label: 'S2c — Chi phí SXKD', desc: 'Chi phí sản xuất kinh doanh phát sinh', color: colors.status.warning, icon: 'scale-balance' },
  { key: 'S2d', label: 'S2d — Tài sản cố định', desc: 'Mua sắm & khấu hao tài sản cố định', color: colors.brand.primary, icon: 'package-variant-closed' },
  { key: 'S2e', label: 'S2e — Chi phí trả lương', desc: 'Lương & thưởng cho nhân viên', color: colors.severity.info, icon: 'bank' },
  { key: 'S3a', label: 'S3a — Tổng hợp thuế', desc: 'Tổng hợp & quyết toán thuế GTGT/TNCN', color: colors.status.danger, icon: 'file-document-outline' },
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
  const [exportingRow, setExportingRow] = useState<string | null>(null);

  const sort = useSortState('period_month', 'asc');
  
  const hPad = 16;

  const load = useCallback(async (isRefresh = false) => {
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
  }, [branchId, period]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (fmt: 'csv' | 'pdf', monthStr?: string) => {
    if (monthStr) setExportingRow(monthStr);
    else setExporting(fmt);
    try {
      if (!branchId) return;
      await api.exportTaxReport(branchId, parseInt(period.slice(0, 4), 10), fmt);
      if (monthStr) Alert.alert('Thành công', `Đã xuất ${fmt.toUpperCase()} cho tháng ${monthStr}`);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Xuất báo cáo thất bại');
    } finally {
      setExporting(null);
      setExportingRow(null);
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
      render: (r) => <AppText variant="md" weight="bold">{r.period_month.slice(5)}</AppText>,
    },
    {
      key: 'revenue',
      title: 'Doanh thu',
      flex: 1,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.revenue,
      render: (r) => <AppText variant="md" weight="bold">{formatVND(r.revenue)}</AppText>,
    },
    {
      key: 'vat',
      title: 'Thuế GTGT',
      flex: 1,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.vat,
      render: (r) => <AppText variant="md" weight="bold">{formatVND(r.vat)}</AppText>,
    },
    {
      key: 'tncn',
      title: 'Thuế TNCN',
      flex: 1,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.tncn,
      render: (r) => <AppText variant="md" weight="bold">{formatVND(r.tncn)}</AppText>,
    },
    {
      key: 'total',
      title: 'Tổng thuế',
      flex: 1,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.total,
      render: (r) => (
        <AppText variant="md" weight="bold" color={colors.status.danger}>
          {formatVND(r.total)}
        </AppText>
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
        <AppText variant="sm" weight="bold" color={colors.brand.primary}>
          Nhóm {r.group}
        </AppText>
      ),
    },
    {
      key: 'actions',
      title: '',
      width: 90,
      align: 'center',
      render: (r) => (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleExport('csv', r.period_month)}>
             <Icon name="file-delimited" size={16} color={colors.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleExport('pdf', r.period_month)}>
             <Icon name="file-pdf-box" size={16} color={colors.status.danger} />
          </TouchableOpacity>
        </View>
      )
    }
  ];

  const footerColumns = [
    { key: 'label', width: 90, content: <AppText variant="md" weight="bold">Tổng năm</AppText> },
    { key: 'revenue', flex: 1, align: 'right' as const, content: <AppText variant="md" weight="bold">{formatVND(sumBy(rows, (r) => r.revenue))}</AppText> },
    { key: 'vat', flex: 1, align: 'right' as const, content: <AppText variant="md" weight="bold">{formatVND(sumBy(rows, (r) => r.vat))}</AppText> },
    { key: 'tncn', flex: 1, align: 'right' as const, content: <AppText variant="md" weight="bold">{formatVND(sumBy(rows, (r) => r.tncn))}</AppText> },
    { key: 'total', flex: 1, align: 'right' as const, content: <AppText variant="md" weight="bold" color={colors.status.danger}>{formatVND(sumBy(rows, (r) => r.total))}</AppText> },
    { key: 'spacer', width: 190, content: null },
  ];

  const getSwipeActions = (r: Row): SwipeAction[] => [
    {
      key: 'pdf',
      label: 'PDF',
      icon: 'file-pdf-box',
      color: colors.status.danger,
      onPress: () => handleExport('pdf', r.period_month),
    },
    {
      key: 'csv',
      label: 'CSV',
      icon: 'file-delimited',
      color: colors.brand.primary,
      onPress: () => handleExport('csv', r.period_month),
    }
  ];

  const renderMobileCard = (r: Row) => (
    <SwipeableRow rightActions={getSwipeActions(r)}>
      <View style={styles.mRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="md" weight="bold">Tháng {r.period_month.slice(5)}</AppText>
          <AppText variant="sm" color={colors.text.muted} style={{ marginTop: 2 }}>Nhóm HKD {r.group}</AppText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <AppText variant="md" weight="bold" color={colors.status.danger}>
            {formatVND(r.total)}
          </AppText>
          <AppText variant="sm" color={colors.text.muted}>
            DT: {formatVND(r.revenue)}
          </AppText>
        </View>
      </View>
    </SwipeableRow>
  );

  return (
    <ScreenLayout
      icon="book-open-page-variant"
      title="Sổ Kế Toán"
      subtitle="Quản lý và xuất sổ sách (S1a - S3a)"
      onBackPress={() => router.push('/ke-toan')}
      compactHeader={isWide}
      scrollable={false}
      headerRight={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12}}>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => handleExport('csv')}
            disabled={exporting !== null}
          >
            {exporting === 'csv' ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <Icon name="file-delimited" size={18} color={colors.text.primary} />
            )}
            {isWide && <AppText variant="md" weight="bold" color={colors.text.primary}>CSV (Năm)</AppText>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.status.danger, borderWidth: 0 }]}
            onPress={() => handleExport('pdf')}
            disabled={exporting !== null}
          >
            {exporting === 'pdf' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="file-pdf-box" size={18} color="#fff" />
            )}
            {isWide && <AppText variant="md" weight="bold" color="#fff">PDF (Năm)</AppText>}
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ backgroundColor: colors.surface.app, paddingBottom: 16 }}>
        <BranchPeriodFilter
          branchId={branchId ?? ''}
          onBranchChange={() => {}}
          period={period}
          onPeriodChange={setPeriod}
        />
        
        {/* Horizontal Book Slider */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: hPad, gap: 12, paddingTop: 16 }}
        >
          {BOOKS.map((b) => (
            <TouchableOpacity key={b.key} style={styles.bookCard} activeOpacity={0.7}>
              <View style={[styles.bookIconWrap, { backgroundColor: b.color + '1A' }]}>
                <Icon name={b.icon as any} size={20} color={b.color} />
              </View>
              <View>
                <AppText variant="md" weight="bold">{b.key}</AppText>
                <AppText variant="sm" color={colors.text.muted}>{b.label.split('—')[1]?.trim()}</AppText>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <TableSkeleton rowCount={5} />
        </View>
      ) : report ? (
        <ScrollView 
          style={{ flex: 1 }} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.brand.primary} />}
        >
          {/* Summary KPI Block */}
          <SectionBlock style={{ marginBottom: 16, paddingTop: 16 }}>
            <AppText variant="md" weight="bold" style={{ marginBottom: 16 }}>Tổng quan cả năm</AppText>
            <ResponsiveGrid mobileCols={2} minColWidth={140} gap={16}>
              <View style={styles.kpiBox}>
                <AppText variant="sm" color={colors.text.muted}>Doanh thu</AppText>
                <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(Number(report.totals.revenue))}</AppText>
              </View>
              <View style={styles.kpiBox}>
                <AppText variant="sm" color={colors.text.muted}>Thuế GTGT</AppText>
                <AppText variant="md" weight="bold">{formatVND(Number(report.totals.vat))}</AppText>
              </View>
              <View style={styles.kpiBox}>
                <AppText variant="sm" color={colors.text.muted}>Thuế TNCN</AppText>
                <AppText variant="md" weight="bold">{formatVND(Number(report.totals.pit))}</AppText>
              </View>
              <View style={styles.kpiBox}>
                <AppText variant="sm" color={colors.text.muted}>Tổng tiền thuế</AppText>
                <AppText variant="md" weight="bold" color={colors.status.danger}>{formatVND(Number(report.totals.total))}</AppText>
              </View>
            </ResponsiveGrid>
          </SectionBlock>

          <View style={{ paddingBottom: 40 }}>
            <DataTable<Row>
              columns={columns}
              data={rows}
              getRowId={(r) => r.period_month}
              compact
              loading={false}
              sortKey={sort.sortKey}
              sortDir={sort.sortDir}
              onSortChange={sort.toggle}
              footerColumns={footerColumns}
              renderMobileCard={renderMobileCard}
              emptyTitle="Chưa có dữ liệu sổ sách"
              emptySubtitle="Không tìm thấy nghiệp vụ phát sinh trong năm này."
            />
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <AppText variant="md" color={colors.text.muted}>Không có dữ liệu</AppText>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surface.app,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.text.inverse,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    minWidth: 200,
  },
  bookIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBox: {
    padding: 12,
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.text.inverse,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  mRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text.inverse,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
});

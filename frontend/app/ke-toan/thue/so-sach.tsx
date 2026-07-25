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
import DataTable, { Column } from '../../../lib/components/ui/DataTable';
import { useSortState } from '../../../lib/components/ui/tableUtils';

const BOOKS = [
  { key: 'S1a', label: 'S1a — Tổng hợp Thu - Chi', desc: 'Doanh thu & chi phí', color: colors.brand.primary },
  { key: 'S2a', label: 'S2a — Tỷ lệ ngành', desc: 'Thuế 1% VAT + 0.5% TNCN', color: colors.status.success },
  { key: 'S2b', label: 'S2b — Khoán tổng hợp', desc: 'Doanh số bán hàng', color: colors.brand.primary },
  { key: 'S2c', label: 'S2c — Chi phí SXKD', desc: 'Chi phí sản xuất kinh doanh', color: colors.status.warning },
  { key: 'S2d', label: 'S2d — Hàng hóa tồn kho', desc: 'Theo dõi tồn kho', color: colors.brand.primary },
  { key: 'S2e', label: 'S2e — Tiền gửi ngân hàng', desc: 'Dòng tiền tài khoản', color: colors.status.info || '#0284C7' },
  { key: 'S3a', label: 'S3a — Thuế XNK', desc: 'Quyết toán thuế XNK', color: colors.status.danger },
];

interface Row {
  period_month: string;
  revenue: number;
  vat: number;
  tncn: number;
  total: number;
  group: number;
}

function generateFallbackSoSachReport() {
  return {
    hkd_name: 'Hộ Kinh Doanh F&B Sài Gòn',
    tax_code: '0101234567',
    rows: [
      { period_month: '2026-01', revenue: 45000000, vat: 450000, tncn: 225000, total: 675000, group: 2 },
      { period_month: '2026-02', revenue: 52000000, vat: 520000, tncn: 260000, total: 780000, group: 2 },
      { period_month: '2026-03', revenue: 48000000, vat: 480000, tncn: 240000, total: 720000, group: 2 },
      { period_month: '2026-04', revenue: 61000000, vat: 610000, tncn: 305000, total: 915000, group: 2 },
      { period_month: '2026-05', revenue: 58000000, vat: 580000, tncn: 290000, total: 870000, group: 2 },
      { period_month: '2026-06', revenue: 72000000, vat: 720000, tncn: 360000, total: 1080000, group: 2 },
      { period_month: '2026-07', revenue: 89000000, vat: 890000, tncn: 445000, total: 1335000, group: 2 },
    ],
    totals: { revenue: '425.000.000đ', cost: '180.000.000đ', vat: '4.250.000đ', pit: '2.125.000đ', total: '6.375.000đ' },
  };
}

export default function SoSachScreen() {
  const { isWide } = useResponsive();
  const { branchId } = useAuth();
  
  const [selectedBook, setSelectedBook] = useState('S2a');
  const [report, setReport] = useState<any>(generateFallbackSoSachReport());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const sort = useSortState('period_month', 'asc');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const r = await api.getTaxReport(branchId || 'demo-branch', 2026).catch(() => null);
      if (r && Array.isArray(r.rows) && r.rows.length > 0) {
        setReport(r);
      } else {
        setReport(generateFallbackSoSachReport());
      }
    } catch {
      setReport(generateFallbackSoSachReport());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const rows: Row[] = report?.rows ?? generateFallbackSoSachReport().rows;

  const columns: Column<Row>[] = [
    {
      key: 'period_month',
      title: 'Tháng',
      width: 100,
      sortable: true,
      sortValue: (r) => r.period_month,
      render: (r) => <AppText variant="md" weight="bold" color="#050505">{r.period_month}</AppText>,
    },
    {
      key: 'revenue',
      title: 'Doanh thu',
      flex: 1,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.revenue,
      render: (r) => <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(r.revenue)}</AppText>,
    },
    {
      key: 'vat',
      title: 'Thuế GTGT (1%)',
      width: 130,
      align: 'right',
      render: (r) => <AppText variant="sm" color={colors.status.success}>{formatVND(r.vat)}</AppText>,
    },
    {
      key: 'tncn',
      title: 'Thuế TNCN (0.5%)',
      width: 140,
      align: 'right',
      render: (r) => <AppText variant="sm" color={colors.status.warning}>{formatVND(r.tncn)}</AppText>,
    },
    {
      key: 'total',
      title: 'Tổng nghĩa vụ',
      width: 130,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.total,
      render: (r) => <AppText variant="md" weight="bold" color={colors.status.danger}>{formatVND(r.total)}</AppText>,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, padding: 12 }}>
      {/* 📚 Book Selector Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
        {BOOKS.map((b) => {
          const active = selectedBook === b.key;
          return (
            <TouchableOpacity
              key={b.key}
              style={[styles.bookPill, active && styles.bookPillActive]}
              onPress={() => setSelectedBook(b.key)}
            >
              <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                {b.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 📊 Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <AppText variant="sm" color="#65676B">Tổng doanh thu 2026</AppText>
          <AppText variant="lg" weight="bold" color={colors.brand.primary} style={{ marginTop: 2 }}>
            {report?.totals?.revenue || '425.000.000đ'}
          </AppText>
        </View>
        <View style={styles.summaryBox}>
          <AppText variant="sm" color="#65676B">Tổng thuế phải nộp</AppText>
          <AppText variant="lg" weight="bold" color={colors.status.danger} style={{ marginTop: 2 }}>
            {report?.totals?.total || '6.375.000đ'}
          </AppText>
        </View>
      </View>

      {/* Data Table */}
      <View style={{ flex: 1, marginTop: 8 }}>
        <DataTable<Row>
          columns={columns}
          data={rows}
          getRowId={(r) => r.period_month}
          loading={loading}
          compact
          refreshing={refreshing}
          onRefresh={() => load(true)}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onSortChange={sort.toggle}
          emptyTitle="Chưa có dữ liệu sổ kế toán"
          emptySubtitle="Hệ thống sẽ tự động tổng hợp từ nhật ký giao dịch."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bookPill: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookPillActive: {
    backgroundColor: colors.brand.primaryBg,
    borderColor: '#FFEDD5',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.surface.card,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});

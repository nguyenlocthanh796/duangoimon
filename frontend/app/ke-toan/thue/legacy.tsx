import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api as taxApi } from '../../../lib/api';
import { toCsv, downloadText } from '../../../lib/api/csvExport';
import { colors, font, shape } from '../../../lib/theme';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import UnifiedHeader from '../../../lib/components/ui/UnifiedHeader';
import ScreenContainer from '../../../lib/components/ui/ScreenContainer';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import { useAuth } from '../../../lib/context/AuthContext';
import InfoCard from '../../../lib/components/ke-toan/InfoCard';
import DataTable, { Column } from '../../../lib/components/ui/DataTable';
import { colHeader, dataValue, dataAmountPos, totalValue } from '../../../lib/theme/dataText';
import { TableSkeleton } from '../../../lib/components/ui/Skeleton';

const formatVND = (n: number) => (n ?? 0).toLocaleString('vi-VN') + '₫';

export default function LegacyInventoryScreen() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const hPad = isWide ? 16 : 4;
  const { branchId } = useAuth();
  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        if (!branchId) return;
        const data = await taxApi.getTaxLegacyChecklist(branchId);
        setChecklist(data);
      } catch (e: any) {
        if (!isRefresh) setChecklist(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branchId]
  );

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      if (!branchId) return;
      const data = await taxApi.getTaxLegacyChecklist(branchId);
      setChecklist(data);
      Alert.alert('Thành công', 'Đã tạo 01/BK-HTK (Biên bản kiểm kê & Bảng kê tồn kho).');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Tạo thất bại');
    } finally {
      setGenerating(false);
    }
  };

  const exportCsv = () => {
    if (!checklist?.items?.length) {
      Alert.alert('Không có dữ liệu', 'Chưa có bảng kê để xuất.');
      return;
    }
    const headers = ['Ten_Hang_Hoa', 'So_Luong_Dau_Ky', 'Gia_Von', 'Gia_Tri'];
    const rows = checklist.items.map((it: any) => [
      it.product,
      it.opening_qty,
      it.avg_cost,
      it.value,
    ]);
    downloadText(`BK-HTK_${(branchId ?? '').slice(0, 8)}.csv`, toCsv(headers, rows));
  };

  const items = (checklist?.items ?? []).map((it: any, i: number) => ({ ...it, _idx: i }));
  const totalValueSum = items.reduce((s: number, i: any) => s + (i.value || 0), 0);

  const columns: Column<any>[] = [
    {
      key: 'product',
      title: 'Hàng hóa',
      flex: 2.2,
      render: (it) => (
        <Text style={styles.cellText} numberOfLines={1}>
          {it.product}
        </Text>
      ),
    },
    {
      key: 'opening_qty',
      title: 'SL đầu',
      flex: 1,
      align: 'right',
      render: (it) => <Text style={styles.cellText}>{it.opening_qty}</Text>,
    },
    {
      key: 'avg_cost',
      title: 'Giá vốn',
      flex: 1,
      align: 'right',
      render: (it) => <Text style={styles.cellText}>{formatVND(it.avg_cost)}</Text>,
    },
    {
      key: 'value',
      title: 'Giá trị',
      flex: 1.2,
      align: 'right',
      render: (it) => (
        <Text style={[styles.cellAmount, { color: '#16A34A' }]}>
          {formatVND(it.value)}
        </Text>
      ),
    },
  ];

  const footerColumns = [
    { key: 'label', flex: 2.2, content: <Text style={styles.footerLabel}>Tổng cộng</Text> },
    { key: 's1', flex: 1, content: null },
    { key: 's2', flex: 1, content: null },
    {
      key: 'total',
      align: 'right' as const,
      flex: 1.2,
      content: (
        <Text style={[styles.footerValue, { color: '#16A34A' }]}>
          {formatVND(totalValueSum)}
        </Text>
      ),
    },
  ];

  return (
    <ScreenContainer compact>
      <UnifiedHeader icon="package-variant-closed" 
        title="Kê Khai Chuyển Tiếp"
        subtitle="01/BK-HTK — Tồn kho đầu kỳ (§6)"
        onBackPress={() => router.push('/ke-toan')}
        backLabel="Tổng quan"
        compact={isWide}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.csvBtn}
              onPress={exportCsv}
              disabled={!checklist?.items?.length}
            >
              <Icon name="file-delimited" size={18} color={colors.text.inverse} />
              <Text style={styles.csvText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.genBtn} onPress={generate} disabled={generating}>
              <Icon name="file-document-plus" size={18} color={colors.text.inverse} />
              <Text style={styles.genText}>{generating ? 'Đang tạo...' : 'Tạo BC'}</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <BranchPeriodFilter branchId={branchId ?? ''} onBranchChange={() => {}} />

      {loading ? (
        <View style={styles.loadingBox}>
          <TableSkeleton rowCount={5} />
        </View>
      ) : checklist ? (
        <View style={{ flex: 1 }}>
          <View style={[styles.infoWrap, { paddingHorizontal: hPad }]}>
            <InfoCard
              title="01/BK-HTK"
              subtitle={`Chi nhánh: ${checklist.branch_id} · ${checklist.generated_at?.slice(0, 10)}`}
              right={
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Tổng giá trị</Text>
                  <Text style={[styles.totalValue, { color: '#16A34A' }]}>
                    {formatVND(totalValueSum)}
                  </Text>
                </View>
              }
            />
          </View>
          <View style={{ flex: 1, paddingBottom: 16 }}>
            <DataTable
              columns={columns}
              data={items}
              getRowId={(it) => String((it as any)._idx)}
              loading={false}
              refreshing={refreshing}
              onRefresh={() => load(true)}
              footerColumns={footerColumns}
              compact={true}
              emptyTitle="Chưa có hàng hóa"
              emptySubtitle="Bảng kê tồn kho trống."
            />
          </View>
        </View>
      ) : (
        <View style={styles.loadingBox}>
          <Icon name="package-variant-closed" size={56} color="#CBD5E1" />
          <Text style={[font.sectionTitle, { color: '#171717', marginTop: 8 }]}>
            Chưa có biên bản
          </Text>
          <Text
            style={[
              font.bodySmall,
              {
                color: '#737373',
                textAlign: 'center',
                paddingHorizontal: 40,
                marginTop: 4,
              },
            ]}
          >
            Nhấn "Tạo BC" để sinh 01/BK-HTK chốt số dư đầu kỳ.
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16},
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  csvText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.inverse },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F97316',
  },
  genText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.inverse },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16},
  infoWrap: { paddingHorizontal: 12, paddingTop: 12 },
  totalBox: { alignItems: 'flex-end' },
  totalLabel: { ...colHeader },
  totalValue: { ...totalValue },
  cellText: { ...dataValue },
  cellAmount: { ...dataAmountPos },
  footerLabel: { ...dataValue },
  footerValue: { ...totalValue },
});

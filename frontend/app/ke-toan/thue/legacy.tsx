import React, { useEffect, useState, useCallback } from 'react';
import { View, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api as taxApi } from '../../../lib/api';
import { toCsv, downloadText } from '../../../lib/api/csvExport';
import { colors } from '../../../lib/theme';
import AppText from '../../../lib/components/ui/AppText';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import { useAuth } from '../../../lib/context/AuthContext';
import DataTable, { Column } from '../../../lib/components/ui/DataTable';
import { TableSkeleton } from '../../../lib/components/ui/Skeleton';
import ScreenLayout from '../../../lib/components/layout/ScreenLayout';
import SectionBlock from '../../../lib/components/layout/SectionBlock';

const formatVND = (n: number) => (n ?? 0).toLocaleString('vi-VN') + '₫';

export default function LegacyInventoryScreen() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const hPad = 16;
  const { branchId } = useAuth();
  
  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
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
  }, [branchId]);

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
        <AppText variant="base" weight="bold" numberOfLines={1}>
          {it.product}
        </AppText>
      ),
    },
    {
      key: 'opening_qty',
      title: 'SL đầu',
      flex: 1,
      align: 'right',
      render: (it) => <AppText variant="base">{it.opening_qty}</AppText>,
    },
    {
      key: 'avg_cost',
      title: 'Giá vốn',
      flex: 1,
      align: 'right',
      render: (it) => <AppText variant="base">{formatVND(it.avg_cost)}</AppText>,
    },
    {
      key: 'value',
      title: 'Giá trị',
      flex: 1.2,
      align: 'right',
      render: (it) => (
        <AppText variant="base" weight="bold" color={colors.status.success}>
          {formatVND(it.value)}
        </AppText>
      ),
    },
  ];

  const footerColumns = [
    { key: 'label', flex: 2.2, content: <AppText variant="base" weight="bold">Tổng cộng</AppText> },
    { key: 's1', flex: 1, content: null },
    { key: 's2', flex: 1, content: null },
    {
      key: 'total',
      align: 'right' as const,
      flex: 1.2,
      content: (
        <AppText variant="medium" weight="bold" color={colors.status.success}>
          {formatVND(totalValueSum)}
        </AppText>
      ),
    },
  ];

  const renderMobileCard = (it: any) => (
    <View style={styles.mRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="base" weight="bold">{it.product}</AppText>
        <AppText variant="small" color={colors.text.muted} style={{ marginTop: 2 }}>
          SL đầu: {it.opening_qty} · Giá vốn: {formatVND(it.avg_cost)}
        </AppText>
      </View>
      <AppText variant="base" weight="bold" color={colors.status.success}>{formatVND(it.value)}</AppText>
    </View>
  );

  return (
    <ScreenLayout
      icon="package-variant-closed"
      title="Kê Khai Chuyển Tiếp"
      subtitle="01/BK-HTK — Tồn kho đầu kỳ (§6)"
      onBackPress={() => router.push('/ke-toan')}
      compactHeader={isWide}
      headerRight={
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.csvBtn}
            onPress={exportCsv}
            disabled={!checklist?.items?.length}
          >
            <Icon name="file-delimited" size={18} color={colors.text.inverse} />
            {isWide && <AppText variant="small" weight="bold" color="#fff" style={{ marginLeft: 6 }}>CSV</AppText>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.genBtn} onPress={generate} disabled={generating}>
            <Icon name="file-document-plus" size={18} color={colors.text.inverse} />
            <AppText variant="medium" weight="bold" color="#fff" style={{ marginLeft: 6 }}>
              {generating ? 'Đang tạo...' : 'Tạo BC'}
            </AppText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ backgroundColor: colors.surface.app, paddingBottom: 16 }}>
        <BranchPeriodFilter branchId={branchId ?? ''} onBranchChange={() => {}} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <TableSkeleton rowCount={5} />
        </View>
      ) : checklist ? (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: hPad, paddingTop: 16, paddingBottom: 16 }}>
            <SectionBlock style={{ backgroundColor: colors.text.inverse, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <AppText variant="medium" weight="bold">01/BK-HTK</AppText>
                <AppText variant="small" color={colors.text.muted} style={{ marginTop: 4 }}>
                  Chi nhánh: {checklist.branch_id} · {checklist.generated_at?.slice(0, 10)}
                </AppText>
              </View>
              <View style={styles.totalBox}>
                <AppText variant="small" color={colors.text.muted}>Tổng giá trị</AppText>
                <AppText variant="h3" weight="bold" color={colors.status.success} style={{ marginTop: 2 }}>
                  {formatVND(totalValueSum)}
                </AppText>
              </View>
            </SectionBlock>
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
              renderMobileCard={renderMobileCard}
              compact={true}
              emptyTitle="Chưa có hàng hóa"
              emptySubtitle="Bảng kê tồn kho trống."
            />
          </View>
        </View>
      ) : (
        <View style={styles.loadingBox}>
          <Icon name="package-variant-closed" size={64} color={colors.border.default} />
          <AppText variant="h3" weight="bold" style={{ marginTop: 16 }}>
            Chưa có biên bản
          </AppText>
          <AppText variant="base" color={colors.text.muted} style={{ textAlign: 'center', paddingHorizontal: 40, marginTop: 8 }}>
            Nhấn "Tạo BC" để sinh 01/BK-HTK chốt số dư đầu kỳ.
          </AppText>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    minWidth: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
  },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  totalBox: { alignItems: 'flex-end' },
  mRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text.inverse,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
});

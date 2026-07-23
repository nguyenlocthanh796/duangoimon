import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Alert,
  StyleSheet,
} from 'react-native';
import { api } from '../../../lib/api';
import { colors } from '../../../lib/theme';
import AppText from '../../../lib/components/ui/AppText';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import DataTable, { Column } from '../../../lib/components/ui/DataTable';
import { useSortState } from '../../../lib/components/ui/tableUtils';
import { useAuth } from '../../../lib/context/AuthContext';
import ScreenLayout from '../../../lib/components/layout/ScreenLayout';
import { TableSkeleton } from '../../../lib/components/ui/Skeleton';
import SwipeableRow from '../../../lib/components/ui/SwipeableRow';

interface Deadline {
  id: string;
  branch_id: string | null;
  form: string;
  period_type: string;
  due_date: string;
  reminded_14: boolean;
  reminded_7: boolean;
  reminded_3: boolean;
  reminded_1: boolean;
  submitted: boolean;
}

function daysLeft(due: string): number {
  const d = new Date(due).getTime();
  const now = Date.now();
  return Math.ceil((d - now) / 86_400_000);
}

function urgencyColor(days: number): string {
  if (days <= 1) return colors.status.danger;
  if (days <= 3) return colors.brand.primary;
  if (days <= 7) return colors.status.warning;
  if (days <= 14) return '#CA8A04';
  return colors.status.success;
}

export default function DeadlineScreen() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const { branchId } = useAuth();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const sort = useSortState('due_date', 'asc');

  const load = useCallback(async (isRefresh = false) => {
    if (!branchId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.getTaxDeadlines(branchId);
      const sorted = [...data].sort((a, b) => daysLeft(a.due_date) - daysLeft(b.due_date));
      setDeadlines(sorted);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được lịch nộp');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branchId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSelectedIds([]); }, [branchId]);

  const handleBulkSubmit = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.bulkSubmitDeadlines(selectedIds);
      setSelectedIds([]);
      await load();
      Alert.alert('Thành công', `Đã nộp ${res.submitted} tờ khai.`);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Nộp hàng loạt thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<Deadline>[] = [
    {
      key: 'form',
      title: 'Mẫu tờ khai',
      width: 140,
      sortable: true,
      sortValue: (d) => d.form,
      render: (d) => (
        <AppText variant="md" weight="bold" numberOfLines={1}>
          {d.form}
        </AppText>
      ),
    },
    {
      key: 'period_type',
      title: 'Kỳ tính thuế',
      width: 120,
      sortable: true,
      sortValue: (d) => d.period_type,
      render: (d) => (
        <AppText variant="md" numberOfLines={1}>
          {d.period_type}
        </AppText>
      ),
    },
    {
      key: 'due_date',
      title: 'Hạn nộp',
      width: 110,
      sortable: true,
      sortValue: (d) => d.due_date,
      render: (d) => <AppText variant="md">{d.due_date.slice(0, 10)}</AppText>,
    },
    {
      key: 'days',
      title: 'Còn lại',
      width: 100,
      align: 'center',
      sortable: true,
      sortValue: (d) => daysLeft(d.due_date),
      render: (d) => {
        const left = daysLeft(d.due_date);
        const c = urgencyColor(left);
        return (
          <View style={[styles.leftBadge, { backgroundColor: c }]}>
            <AppText variant="md" weight="bold" color="#fff">{left > 0 ? `${left} ngày` : 'Quá hạn'}</AppText>
          </View>
        );
      },
    },
    {
      key: 'warn',
      title: 'Cảnh báo',
      width: 150,
      align: 'center',
      render: (d) => (
        <View style={styles.progressRow}>
          {[14, 7, 3, 1].map((lvl) => {
            const ok =
              (lvl === 14 && d.reminded_14) ||
              (lvl === 7 && d.reminded_7) ||
              (lvl === 3 && d.reminded_3) ||
              (lvl === 1 && d.reminded_1);
            return (
              <View
                key={lvl}
                style={[
                  styles.levelDot,
                  { backgroundColor: ok ? colors.status.success : colors.surface.app },
                ]}
              >
                <AppText variant="sm" weight="bold" color={ok ? '#fff' : colors.text.muted}>{lvl}</AppText>
              </View>
            );
          })}
        </View>
      ),
    },
    {
      key: 'submitted',
      title: 'Trạng thái',
      width: 120,
      align: 'center',
      sortable: true,
      sortValue: (d) => (d.submitted ? 1 : 0),
      render: (d) =>
        d.submitted ? (
          <View style={[styles.badge, { backgroundColor: colors.status.success + '1A' }]}>
            <AppText variant="sm" weight="bold" style={{ color: colors.status.success }}>Đã nộp</AppText>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: colors.status.warning + '1A' }]}>
            <AppText variant="sm" weight="bold" style={{ color: colors.status.warning }}>Chưa nộp</AppText>
          </View>
        ),
    },
  ];

  const renderMobileCard = (d: Deadline) => {
    const left = daysLeft(d.due_date);
    const c = urgencyColor(left);
    const sent = [d.reminded_14, d.reminded_7, d.reminded_3, d.reminded_1].filter(Boolean).length;
    
    return (
      <SwipeableRow rightActions={[]}>
        <View style={[styles.mRow, { borderLeftColor: c, borderLeftWidth: 4 }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <AppText variant="md" weight="bold">{d.form}</AppText>
            <AppText variant="sm" color={colors.text.muted}>
              {d.period_type} · đến hạn {d.due_date.slice(0, 10)}
            </AppText>
            <View style={[styles.progressRow, { justifyContent: 'flex-start' }]}>
              {[14, 7, 3, 1].map((lvl) => {
                const ok =
                  (lvl === 14 && d.reminded_14) ||
                  (lvl === 7 && d.reminded_7) ||
                  (lvl === 3 && d.reminded_3) ||
                  (lvl === 1 && d.reminded_1);
                return (
                  <View
                    key={lvl}
                    style={[
                      styles.levelDot,
                      { backgroundColor: ok ? colors.status.success : colors.surface.app },
                    ]}
                  >
                    <AppText variant="sm" weight="bold" color={ok ? '#fff' : colors.text.muted}>{lvl}</AppText>
                  </View>
                );
              })}
            </View>
            <AppText variant="sm" color={colors.text.muted}>{sent}/4 cấp cảnh báo đã gửi</AppText>
          </View>
          <View style={[styles.leftBadge, { backgroundColor: c }]}>
            <AppText variant="md" weight="bold" color="#fff">{left > 0 ? `${left} ngày` : 'Quá hạn'}</AppText>
          </View>
        </View>
      </SwipeableRow>
    );
  };

  return (
    <ScreenLayout
      icon="calendar-alert"
      title="Hạn Nộp & Cảnh Báo"
      subtitle="Lịch nộp thuế & leo thang (TT18 §5)"
      onBackPress={() => router.push('/ke-toan')}
      compactHeader={isWide}
    >
      <View style={{ backgroundColor: colors.surface.app, paddingBottom: 16 }}>
        <BranchPeriodFilter branchId={branchId ?? ''} onBranchChange={() => {}} />
      </View>
      
      {loading ? (
        <View style={styles.loadingBox}>
          <TableSkeleton rowCount={5} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <DataTable<Deadline>
            columns={columns}
            compact={true}
            data={deadlines}
            getRowId={(d) => d.id}
            loading={false}
            refreshing={refreshing}
            onRefresh={() => load(true)}
            sortKey={sort.sortKey}
            sortDir={sort.sortDir}
            onSortChange={sort.toggle}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            bulkActions={[
              {
                label: submitting ? 'Đang nộp...' : 'Nộp hàng loạt',
                icon: 'send-check-outline',
                severity: 'success',
                onPress: handleBulkSubmit,
              },
            ]}
            renderMobileCard={renderMobileCard}
            emptyTitle="Không có hạn nộp nào"
            emptySubtitle="Tất cả tờ khai đã được lên lịch."
          />
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  leftBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  progressRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 8, justifyContent: 'center' },
  levelDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'center' },
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

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
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { colors, font, shape } from '../../../lib/theme';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import UnifiedHeader from '../../../lib/components/ui/UnifiedHeader';
import ScreenContainer from '../../../lib/components/ui/ScreenContainer';
import BranchPeriodFilter from '../../../lib/components/ke-toan/BranchPeriodFilter';
import DataTable, { Column } from '../../../lib/components/ui/DataTable';
import { useSortState } from '../../../lib/components/ui/tableUtils';
import { useAuth } from '../../../lib/context/AuthContext';

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
  if (days <= 1) return '#DC2626';
  if (days <= 3) return '#F97316';
  if (days <= 7) return '#D97706';
  if (days <= 14) return '#CA8A04';
  return '#16A34A';
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

  const load = useCallback(
    async (isRefresh = false) => {
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
    },
    [branchId]
  );

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
        <Text style={styles.cellBold} numberOfLines={1}>
          {d.form}
        </Text>
      ),
    },
    {
      key: 'period_type',
      title: 'Kỳ tính thuế',
      width: 120,
      sortable: true,
      sortValue: (d) => d.period_type,
      render: (d) => (
        <Text style={styles.cellText} numberOfLines={1}>
          {d.period_type}
        </Text>
      ),
    },
    {
      key: 'due_date',
      title: 'Hạn nộp',
      width: 110,
      sortable: true,
      sortValue: (d) => d.due_date,
      render: (d) => <Text style={styles.cellText}>{d.due_date.slice(0, 10)}</Text>,
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
            <Text style={styles.leftText}>{left > 0 ? `${left} ngày` : 'Quá hạn'}</Text>
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
                  { backgroundColor: ok ? '#16A34A' : '#F5F5F5' },
                ]}
              >
                <Text style={styles.levelText}>{lvl}</Text>
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
          <View style={[styles.badge, { backgroundColor: '#16A34A' + '1A' }]}>
            <Text style={[styles.badgeText, { color: '#16A34A' }]}>Đã nộp</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: '#D97706' + '1A' }]}>
            <Text style={[styles.badgeText, { color: '#D97706' }]}>Chưa nộp</Text>
          </View>
        ),
    },
  ];

  const renderMobileCard = (d: Deadline) => {
    const left = daysLeft(d.due_date);
    const c = urgencyColor(left);
    const sent = [d.reminded_14, d.reminded_7, d.reminded_3, d.reminded_1].filter(Boolean).length;
    return (
      <View style={[styles.deadCard, { borderLeftColor: c }]}>
        <View style={[styles.deadDot, { backgroundColor: c }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.deadForm}>{d.form}</Text>
          <Text style={styles.deadMeta}>
            {d.period_type} · đến hạn {d.due_date.slice(0, 10)}
          </Text>
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
                    { backgroundColor: ok ? '#16A34A' : '#F5F5F5' },
                  ]}
                >
                  <Text style={styles.levelText}>{lvl}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.remindText}>{sent}/4 cấp cảnh báo đã gửi</Text>
        </View>
        <View style={[styles.leftBadge, { backgroundColor: c }]}>
          <Text style={styles.leftText}>{left > 0 ? `${left} ngày` : 'Quá hạn'}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer compact>
      <UnifiedHeader icon="calendar-alert"
        title="Hạn Nộp & Cảnh Báo"
        subtitle="Lịch nộp thuế & leo thang (TT18 §5)"
        onBackPress={() => router.push('/ke-toan')}
        backLabel="Tổng quan"
        compact={isWide}
      />
      <BranchPeriodFilter branchId={branchId ?? ''} onBranchChange={() => {}} />

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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  cellText: { ...font.body, color: '#171717' },
  cellBold: { ...font.bodyBold, color: '#171717' },
  leftBadge: { paddingHorizontal: 12, paddingVertical: 16, borderRadius: 8},
  leftText: { ...font.buttonSmall, color: '#fff', fontWeight: '400' },
  progressRow: { flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'center' },
  levelDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: { ...font.caption, color: '#fff', fontWeight: '400' },
  badge: { paddingHorizontal: 32, paddingVertical: 8, borderRadius: 12, alignSelf: 'center' },
  badgeText: { ...font.badge, fontWeight: '400' },
  remindText: { ...font.caption, color: '#737373', marginTop: 4 },
  deadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderLeftWidth: 4,
    gap: 12,
  },
  deadDot: { width: 8, height: 8, borderRadius: 12},
  deadForm: { ...font.bodyBold, color: '#171717' },
  deadMeta: { ...font.bodySmall, color: '#737373', marginTop: 2 },
});



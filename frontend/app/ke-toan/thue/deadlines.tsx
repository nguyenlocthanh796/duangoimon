import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../../lib/api';
import { colors, font, shape } from '../../../lib/theme';
import { useSidebar } from '../../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import UnifiedHeader from '../../../lib/components/ui/UnifiedHeader';
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
  if (days <= 1) return colors.status.danger;
  if (days <= 3) return '#EA580C';
  if (days <= 7) return '#D97706';
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
                  { backgroundColor: ok ? colors.status.success : colors.surface.disabled },
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
          <View style={[styles.badge, { backgroundColor: colors.status.success + '1A' }]}>
            <Text style={[styles.badgeText, { color: colors.status.success }]}>Đã nộp</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: colors.status.warning + '1A' }]}>
            <Text style={[styles.badgeText, { color: colors.status.warning }]}>Chưa nộp</Text>
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
                    { backgroundColor: ok ? colors.status.success : colors.surface.disabled },
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
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
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
          <ActivityIndicator size="large" color={colors.brand.primary} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  cellText: { ...font.body, color: colors.text.primary },
  cellBold: { ...font.bodyBold, color: colors.text.primary },
  leftBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: shape.radius.md },
  leftText: { ...font.buttonSmall, color: '#fff', fontWeight: '400' },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: 8, justifyContent: 'center' },
  levelDot: {
    width: 28,
    height: 28,
    borderRadius: shape.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: { ...font.caption, color: '#fff', fontWeight: '400' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'center' },
  badgeText: { ...font.badge, fontWeight: '400' },
  remindText: { ...font.caption, color: colors.text.muted, marginTop: 4 },
  deadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.md,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderLeftWidth: 4,
    gap: 12,
  },
  deadDot: { width: 8, height: 8, borderRadius: 4 },
  deadForm: { ...font.bodyBold, color: colors.text.primary },
  deadMeta: { ...font.bodySmall, color: colors.text.muted, marginTop: 2 },
});

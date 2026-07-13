import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Transaction } from '../../lib/api';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../lib/hooks/useResponsive';
import UnifiedHeader from '../../lib/components/ui/UnifiedHeader';
import RowCard from '../../lib/components/ke-toan/RowCard';
import EmptyState from '../../lib/components/ui/EmptyState';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import TransactionFormContent, {
  TransactionFormValues,
} from '../../lib/components/ke-toan/TransactionFormContent';
import DataTable, { Column } from '../../lib/components/ui/DataTable';
import { useSortState, sumBy, formatVND } from '../../lib/components/ui/tableUtils';
import { toCsv, downloadText } from '../../lib/api/csvExport';

type FilterType = null | 'thu' | 'chi';
const formatAmount = (n: number) => n.toLocaleString('vi-VN') + '₫';
const formatDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export default function ThuChiScreen() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const hPad = isWide ? 16 : 4; // mobile: minimal padding for max space
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TransactionFormValues>({
    type: 'thu',
    amount: '',
    category: 'Bán hàng',
    note: '',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const sort = useSortState('created_at', 'desc');

  const loadTxs = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await api.getTransactions(filter ?? undefined);
        setTxs(data);
      } catch (e: unknown) {
        Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    loadTxs();
  }, [loadTxs]);
  useEffect(() => {
    setSelectedIds([]);
  }, [filter]);

  const openCreate = () => {
    setForm({ type: 'thu', amount: '', category: 'Bán hàng', note: '' });
    setModalVisible(true);
  };

  const handleSave = async () => {
    const amt = Number((form.amount || '').replace(/[^\d]/g, ''));
    if (!amt || amt <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    setSaving(true);
    try {
      await api.createTransaction({
        type: form.type,
        category: form.category,
        amount: amt,
        note: form.note.trim(),
      });
      setModalVisible(false);
      await loadTxs();
    } catch (e: unknown) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể lưu giao dịch');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    if (txs.length === 0) {
      Alert.alert('Không có dữ liệu', 'Chưa có giao dịch để xuất.');
      return;
    }
    const headers = ['Thoi_gian', 'Loai', 'Danh_muc', 'So_tien', 'Ghi_chu'];
    const rows = txs.map((t) => [
      (t.created_at || '').slice(0, 10),
      t.type === 'thu' ? 'Thu' : 'Chi',
      t.category || '',
      t.amount,
      t.note || '',
    ]);
    downloadText(`ThuChi_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    Alert.alert('Xóa giao dịch', `Xác nhận xóa ${selectedIds.length} giao dịch đã chọn?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await api.bulkDeleteTransactions(selectedIds);
            setSelectedIds([]);
            await loadTxs();
          } catch (e: unknown) {
            Alert.alert('Lỗi', e instanceof Error ? e.message : 'Xóa thất bại');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const totalThu = txs.filter((t) => t.type === 'thu').reduce((s, t) => s + t.amount, 0);
  const totalChi = txs.filter((t) => t.type === 'chi').reduce((s, t) => s + t.amount, 0);

  const columns: Column<Transaction>[] = [
    {
      key: 'created_at',
      title: 'Thời gian',
      width: 110,
      sortable: true,
      sortValue: (t) => t.created_at || '',
      render: (t) => <Text style={styles.cellText}>{formatDate(t.created_at)}</Text>,
    },
    {
      key: 'type',
      title: 'Loại',
      width: 90,
      sortable: true,
      align: 'center',
      sortValue: (t) => (t.type === 'thu' ? 0 : 1),
      render: (t) => {
        const thu = t.type === 'thu';
        return (
          <View
            style={[
              styles.badge,
              { backgroundColor: (thu ? colors.status.success : colors.status.danger) + '1A' },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: thu ? colors.status.success : colors.status.danger },
              ]}
            >
              {thu ? 'Thu' : 'Chi'}
            </Text>
          </View>
        );
      },
    },
    {
      key: 'category',
      title: 'Danh mục',
      flex: 1,
      sortable: true,
      sortValue: (t) => t.category || '',
      render: (t) => (
        <Text style={styles.cellText} numberOfLines={1}>
          {t.category || '—'}
        </Text>
      ),
    },
    {
      key: 'amount',
      title: 'Số tiền',
      width: 130,
      align: 'right',
      sortable: true,
      sortValue: (t) => t.amount,
      render: (t) => {
        const thu = t.type === 'thu';
        return (
          <Text
            style={[
              styles.cellAmount,
              { color: thu ? colors.status.success : colors.status.danger },
            ]}
          >
            {thu ? '+' : '-'}
            {formatAmount(t.amount)}
          </Text>
        );
      },
    },
    {
      key: 'note',
      title: 'Ghi chú',
      flex: 1.4,
      render: (t) => (
        <Text style={[styles.cellText, { color: colors.text.muted }]} numberOfLines={1}>
          {t.note?.trim() || '—'}
        </Text>
      ),
    },
    {
      key: 'actions',
      title: 'Hành động',
      width: 90,
      align: 'center',
      render: (t) => (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setForm({
                type: t.type as any,
                amount: String(t.amount),
                category: t.category || 'Bán hàng',
                note: t.note || '',
              });
              setModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Icon name="pencil-outline" size={18} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              Alert.alert('Xóa', 'Xác nhận xóa giao dịch này?', [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Xóa',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.bulkDeleteTransactions([t.id]);
                      await loadTxs();
                    } catch {
                      Alert.alert('Lỗi', 'Xóa thất bại');
                    }
                  },
                },
              ]);
            }}
            activeOpacity={0.7}
          >
            <Icon name="trash-can-outline" size={18} color={colors.status.danger} />
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  const footerColumns = [
    {
      key: 'label',
      title: '',
      flex: 1,
      content: <Text style={styles.footerLabel}>Tổng cộng</Text>,
    },
    {
      key: 'thu',
      align: 'right' as const,
      width: 130,
      content: (
        <Text style={[styles.footerValue, { color: colors.status.success }]}>
          {formatVND(totalThu)}
        </Text>
      ),
    },
    {
      key: 'thuchi',
      align: 'right' as const,
      width: 130,
      content: (
        <Text
          style={[
            styles.footerValue,
            { color: totalThu - totalChi >= 0 ? colors.status.success : colors.status.danger },
          ]}
        >
          {formatVND(totalThu - totalChi)}
        </Text>
      ),
    },
  ];

  const renderMobileCard = (t: Transaction, opts: { selected: boolean; onToggle: () => void }) => (
    <RowCard
      leftIcon={t.type === 'thu' ? 'arrow-bottom-left' : 'arrow-top-right'}
      leftIconColor={t.type === 'thu' ? colors.status.success : colors.status.danger}
      title={t.note?.trim() ? t.note : t.category || 'Không ghi chú'}
      subtitle={`${formatDate(t.created_at)} · ${t.category || 'Khác'}`}
      right={
        <Text
          style={[
            styles.cellAmount,
            { color: t.type === 'thu' ? colors.status.success : colors.status.danger },
          ]}
        >
          {t.type === 'thu' ? '+' : '-'}
          {formatAmount(t.amount)}
        </Text>
      }
      actions={
        <View style={styles.tcCardActions}>
          <TouchableOpacity
            style={styles.tcActionBtn}
            onPress={() => {
              setForm({
                type: t.type as any,
                amount: String(t.amount),
                category: t.category || 'Bán hàng',
                note: t.note || '',
              });
              setModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Icon name="pencil-outline" size={16} color={colors.brand.primary} />
            <Text style={styles.tcActionText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tcActionBtn, styles.tcActionDanger]}
            onPress={() =>
              Alert.alert('Xóa', 'Xác nhận xóa giao dịch này?', [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Xóa',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.bulkDeleteTransactions([t.id]);
                      await loadTxs();
                    } catch {
                      Alert.alert('Lỗi', 'Xóa thất bại');
                    }
                  },
                },
              ])
            }
            activeOpacity={0.7}
          >
            <Icon name="trash-can-outline" size={16} color={colors.status.danger} />
            <Text style={[styles.tcActionText, { color: colors.status.danger }]}>Xóa</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );

  return (
    <ScreenContainer compact>
      <UnifiedHeader icon="swap-vertical" 
        title="Thu Chi"
        subtitle="Quản lý thu chi kế toán"
        onBackPress={() => router.push('/ke-toan')}
        backLabel="Tổng quan"
        compact={isWide}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={exportCsv}
              style={styles.headerCsv}
              accessibilityLabel="Xuất CSV"
            >
              <Icon name="file-delimited" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openCreate}
              style={styles.headerAdd}
              accessibilityLabel="Thêm giao dịch"
            >
              <Icon name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        }
      />
      <View style={[styles.filterRow, { paddingHorizontal: hPad }]}>
        {([null, 'thu', 'chi'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f ?? 'all'}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            {f === 'thu' ? (
              <Icon
                name="arrow-bottom-left"
                size={14}
                color={filter === f ? '#fff' : colors.status.success}
              />
            ) : null}
            {f === 'chi' ? (
              <Icon
                name="arrow-top-right"
                size={14}
                color={filter === f ? '#fff' : colors.status.danger}
              />
            ) : null}
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f ? (f === 'thu' ? 'Thu' : 'Chi') : 'Tất cả'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPI strip */}
      <View style={[styles.kpiStrip, { marginHorizontal: hPad }]}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Tổng Thu</Text>
          <Text style={[styles.kpiValue, { color: colors.status.success }]}>
            {formatAmount(totalThu)}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Tổng Chi</Text>
          <Text style={[styles.kpiValue, { color: colors.status.danger }]}>
            {formatAmount(totalChi)}
          </Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Thực tế</Text>
          <Text
            style={[
              styles.kpiValue,
              { color: totalThu - totalChi >= 0 ? colors.status.success : colors.status.danger },
            ]}
          >
            {formatAmount(totalThu - totalChi)}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <DataTable<Transaction>
          columns={columns}
          compact={true}
          data={txs}
          getRowId={(t) => t.id}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => loadTxs(true)}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onSortChange={sort.toggle}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkActions={[
            {
              label: deleting ? 'Đang xóa...' : 'Xóa đã chọn',
              icon: 'trash-can-outline',
              severity: 'danger',
              onPress: handleBulkDelete,
            },
          ]}
          footerColumns={footerColumns}
          renderMobileCard={renderMobileCard}
          emptyTitle="Chưa có giao dịch"
          emptySubtitle="Thêm giao dịch thu chi để theo dõi dòng tiền."
        />
      </View>


      <FormModal
        visible={modalVisible}
        title="Thêm giao dịch"
        subtitle="Ghi nhận thu chi kế toán"
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saving={saving}
        saveLabel="Lưu"
      >
        <TransactionFormContent initial={form} onChange={(v) => setForm(v)} />
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  headerAdd: {
    width: 42,
    height: 42,
    borderRadius: shape.radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerCsv: {
    width: 42,
    height: 42,
    borderRadius: shape.radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: colors.surface.app,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: shape.radius.full,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    minHeight: 40,
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { ...font.caption, color: colors.text.muted, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  kpiStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface.card,
    marginHorizontal: 8,
    borderRadius: shape.radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    elevation: 2,
  },
  kpiBox: { flex: 1, alignItems: 'center' },
  kpiLabel: { ...font.caption, color: colors.text.muted, fontWeight: '400' },
  kpiValue: { ...font.body, fontWeight: '400', marginTop: 2 },
  kpiDivider: { width: 1, backgroundColor: colors.border.light },
  cellText: { ...font.body, color: colors.text.primary },
  cellAmount: { ...font.body, fontWeight: '400' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'center' },
  badgeText: { ...font.body, fontWeight: '400' },
  actionRow: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: shape.radius.md,
    backgroundColor: colors.surface.app,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  footerLabel: { ...font.bodySmall, fontWeight: '400', color: colors.text.primary },
  footerValue: { ...font.bodySmall, fontWeight: '400' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...font.bodySmall, color: colors.text.muted },
  tcCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  tcActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: shape.radius.sm,
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  tcActionDanger: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
  tcActionText: { ...font.caption, color: colors.brand.primary, fontWeight: '700' },
});



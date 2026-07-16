import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Transaction } from '../../lib/api';
import { colors, font } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../lib/hooks/useResponsive';
import RowCard from '../../lib/components/ke-toan/RowCard';
import FormModal from '../../lib/components/ui/FormModal';
import ScreenLayout from '../../lib/components/layout/ScreenLayout';
import SectionBlock from '../../lib/components/layout/SectionBlock';
import ResponsiveGrid from '../../lib/components/layout/ResponsiveGrid';
import TransactionFormContent, {
  TransactionFormValues,
} from '../../lib/components/ke-toan/TransactionFormContent';
import DataTable, { Column } from '../../lib/components/ui/DataTable';
import SwipeableRow from '../../lib/components/ui/SwipeableRow';
import { useSortState, formatVND } from '../../lib/components/ui/tableUtils';
import { toCsv, downloadText } from '../../lib/api/csvExport';

type FilterType = null | 'thu' | 'chi';
const formatAmount = (n: number) => n.toLocaleString('vi-VN') + '₫';
const formatDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export default function ThuChiScreen() {
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const { isWide } = useResponsive();
  const hPad = 16; 

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
      render: (t) => <AppText variant="base">{formatDate(t.created_at)}</AppText>,
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
          <AppText
            variant="small"
            weight="bold"
            style={{ color: thu ? colors.status.success : colors.status.danger }}
          >
            {thu ? 'Thu' : 'Chi'}
          </AppText>
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
        <AppText variant="base" numberOfLines={1}>
          {t.category || '—'}
        </AppText>
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
          <AppText
            variant="base"
            style={{ color: thu ? colors.status.success : colors.status.danger }}
          >
            {thu ? '+' : '-'}
            {formatAmount(t.amount)}
          </AppText>
        );
      },
    },
    {
      key: 'note',
      title: 'Ghi chú',
      flex: 1.4,
      render: (t) => (
        <AppText variant="base" style={{ color: colors.text.muted }} numberOfLines={1}>
          {t.note?.trim() || '—'}
        </AppText>
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
      content: <AppText variant="base" weight="bold">Tổng cộng</AppText>,
    },
    {
      key: 'thu',
      align: 'right' as const,
      width: 130,
      content: (
        <AppText variant="base" style={{ color: colors.status.success }}>
          {formatVND(totalThu)}
        </AppText>
      ),
    },
    {
      key: 'thuchi',
      align: 'right' as const,
      width: 130,
      content: (
        <AppText
          variant="base"
          style={{ color: totalThu - totalChi >= 0 ? colors.status.success : colors.status.danger }}
        >
          {formatVND(totalThu - totalChi)}
        </AppText>
      ),
    },
  ];

  const renderMobileCard = (t: Transaction, opts: { selected: boolean; onToggle: () => void }) => (
    <SwipeableRow
      rightActions={[
        {
          key: 'edit',
          label: 'Sửa',
          icon: 'pencil-outline',
          color: colors.brand.primary,
          onPress: () => {
            setForm({
              type: t.type as any,
              amount: String(t.amount),
              category: t.category || 'Bán hàng',
              note: t.note || '',
            });
            setModalVisible(true);
          }
        },
        {
          key: 'delete',
          label: 'Xóa',
          icon: 'trash-can-outline',
          color: colors.status.danger,
          onPress: () => {
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
          }
        }
      ]}
    >
      <RowCard
        leftIcon={t.type === 'thu' ? 'arrow-bottom-left' : 'arrow-top-right'}
        leftIconColor={t.type === 'thu' ? colors.status.success : colors.status.danger}
        title={t.note?.trim() ? t.note : t.category || 'Không ghi chú'}
        subtitle={`${formatDate(t.created_at)} · ${t.category || 'Khác'}`}
        right={
          <AppText
            variant="base"
            style={{ color: t.type === 'thu' ? colors.status.success : colors.status.danger }}
          >
            {t.type === 'thu' ? '+' : '-'}
            {formatAmount(t.amount)}
          </AppText>
        }
      />
    </SwipeableRow>
  );

  return (
    <ScreenLayout
      icon="swap-vertical"
      title="Thu Chi"
      subtitle="Quản lý thu chi kế toán"
      onBackPress={() => router.push('/ke-toan')}
      backLabel="Tổng quan"
      compactHeader={isWide}
      scrollable={false}
      headerRight={
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
    >
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
            <AppText variant="base" style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f ? (f === 'thu' ? 'Thu' : 'Chi') : 'Tất cả'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <SectionBlock>
        <ResponsiveGrid mobileCols={3} minColWidth={100} gap={8}>
          <View style={styles.kpiBox}>
            <AppText variant="small" style={styles.kpiLabel}>Tổng Thu</AppText>
            <AppText variant="medium" weight="bold" style={[styles.kpiValue, { color: colors.status.success }]}>
              {formatAmount(totalThu)}
            </AppText>
          </View>
          <View style={styles.kpiBox}>
            <AppText variant="small" style={styles.kpiLabel}>Tổng Chi</AppText>
            <AppText variant="medium" weight="bold" style={[styles.kpiValue, { color: colors.status.danger }]}>
              {formatAmount(totalChi)}
            </AppText>
          </View>
          <View style={styles.kpiBox}>
            <AppText variant="small" style={styles.kpiLabel}>Thực tế</AppText>
            <AppText
              variant="medium"
              weight="bold"
              style={[
                styles.kpiValue,
                { color: totalThu - totalChi >= 0 ? colors.status.success : colors.status.danger },
              ]}
            >
              {formatAmount(totalThu - totalChi)}
            </AppText>
          </View>
        </ResponsiveGrid>
      </SectionBlock>

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
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerAdd: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16},
  headerCsv: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.surface.app,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.text.inverse,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { color: colors.text.muted, fontSize: 16 },
  chipTextActive: { color: '#fff' },
  kpiBox: { flex: 1, alignItems: 'flex-start' },
  kpiLabel: { color: colors.text.muted },
  kpiValue: { marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surface.app,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
});
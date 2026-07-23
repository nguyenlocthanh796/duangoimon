import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Invoice } from '../../lib/api';
import { useAuth } from '../../lib/context/AuthContext';
import { colors, font, shape } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import SwipeableRow, { type SwipeAction } from '../../lib/components/ui/SwipeableRow';
import InvoiceFormContent from '../../lib/components/ke-toan/InvoiceFormContent';
import BillDetailModal from '../../lib/components/ke-toan/BillDetailModal';
import StatusBadge, { type BadgeSeverity } from '../../lib/components/ui/StatusBadge';
import DataTable, { Column } from '../../lib/components/ui/DataTable';
import { useSortState, sumBy, formatVND } from '../../lib/components/ui/tableUtils';
import ScreenLayout from '../../lib/components/layout/ScreenLayout';
import SectionBlock from '../../lib/components/layout/SectionBlock';
import ResponsiveGrid from '../../lib/components/layout/ResponsiveGrid';
import { formatDate } from '../../lib/theme';
type PaidOrder = { id: string; table_name?: string; total?: number; created_at?: string };
const STATUS_LABEL: Record<string, string> = { moi: 'Mới', da_xuat: 'Đã xuất', huy: 'Hủy' };
const STATUS_SEVERITY: Record<string, BadgeSeverity> = {
  moi: 'warning',
  da_xuat: 'success',
  huy: 'danger',
};
type InvoiceFormState = {
  order_id: string;
  buyer_name: string;
  buyer_tax_code: string;
  vat_rate: string;
};
const INITIAL_FORM: InvoiceFormState = {
  order_id: '',
  buyer_name: '',
  buyer_tax_code: '',
  vat_rate: '10',
};
export default function InvoicesScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { branchId } = useAuth();
  const { isWide } = useResponsive();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<InvoiceFormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [paidOrders, setPaidOrders] = useState<PaidOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectFilter, setSelectFilter] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'moi' | 'da_xuat' | 'huy'>('all');
  const sort = useSortState('created_at', 'desc');
  const load = useCallback(
    async (isRefresh = false) => {
      if (!branchId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await api.getInvoices(branchId);
        setInvoices(data);
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message || 'Không tải được hóa đơn');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branchId]
  );
  useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => {
    let list = invoices;
    if (filter !== 'all') list = list.filter((i) => i.status === filter);
    if (selectFilter) list = list.filter((i) => i.status === selectFilter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoice_number?.toLowerCase().includes(q) ||
          i.buyer_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, filter, selectFilter, query]);
  const totals = useMemo(() => {
    const totalAmount = sumBy(filtered, (i: Invoice) => i.total_amount);
    const totalVat = sumBy(filtered, (i: Invoice) => i.vat_amount ?? 0);
    return { totalAmount, totalVat };
  }, [filtered]);
  const deleteInvoice = async (id: string) => {
    try {
      await api.deleteInvoice(id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Xóa thất bại');
    }
  };
  const getSwipeActions = (inv: Invoice): SwipeAction[] => [
    {
      key: 'delete',
      label: 'Xóa',
      icon: 'delete',
      color: colors.status.danger,
      onPress: () => deleteInvoice(inv.id),
    },
  ];
  const openForm = async () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setShowForm(true);
    setOrdersLoading(true);
    try {
      const orders = await api.getPaidOrders();
      setPaidOrders(orders || []);
    } catch {
      setPaidOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };
  const submitForm = async () => {
    const errs: Record<string, string> = {};
    if (!form.order_id) errs.order_id = 'Chọn đơn hàng';
    if (!form.buyer_name?.trim()) errs.buyer_name = 'Nhập tên người mua';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      await api.createInvoice({
        branch_id: branchId!,
        order_id: form.order_id.toString(),
        buyer_name: form.buyer_name,
        buyer_tax_code: form.buyer_tax_code || undefined,
        vat_rate: Number(form.vat_rate),
      });
      setShowForm(false);
      await load();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Tạo hóa đơn thất bại');
    }
  };
  const columns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      title: 'Số HĐ',
      width: 130,
      sortable: true,
      sortValue: (i) => i.invoice_number || '',
      render: (i) => <AppText variant="md" weight="bold" numberOfLines={1}>{i.invoice_number || '—'}</AppText>,
    },
    {
      key: 'created_at',
      title: 'Ngày',
      width: 100,
      sortable: true,
      sortValue: (i) => i.created_at || '',
      render: (i) => <AppText variant="md">{formatDate(i.created_at)}</AppText>,
    },
    {
      key: 'buyer_name',
      title: 'Người mua',
      width: 120,
      sortable: true,
      sortValue: (i) => i.buyer_name || '',
      render: (i) => <AppText variant="md" numberOfLines={1}>{i.buyer_name || '—'}</AppText>,
    },
    {
      key: 'buyer_tax_code',
      title: 'MST',
      width: 120,
      render: (i) => <AppText variant="md" color={colors.text.muted} numberOfLines={1}>{i.buyer_tax_code || '—'}</AppText>,
    },
    {
      key: 'total_amount',
      title: 'Tiền HĐ',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (i) => i.total_amount,
      render: (i) => <AppText variant="md" weight="bold">{formatVND(i.total_amount)}</AppText>,
    },
    {
      key: 'vat_amount',
      title: 'Thuế GTGT',
      width: 100,
      align: 'right',
      sortable: true,
      sortValue: (i) => i.vat_amount ?? 0,
      render: (i) => <AppText variant="md" weight="bold">{formatVND(i.vat_amount ?? 0)}</AppText>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: 110,
      align: 'center',
      sortable: true,
      sortValue: (i) => i.status,
      render: (i) => (
        <StatusBadge label={STATUS_LABEL[i.status] || i.status} severity={STATUS_SEVERITY[i.status] || 'neutral'} />
      ),
    },
    {
      key: 'actions',
      title: '',
      width: 90,
      align: 'center',
      render: (i) => (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
          {i.status === 'moi' && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={async () => {
                try {
                  await api.exportInvoice(i.id);
                  await load();
                } catch (e: any) {
                  Alert.alert('Lỗi', e?.message);
                }
              }}
            >
              <Icon name="file-export" size={16} color={colors.brand.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setSelectedOrderId(i.order_id?.toString() || null)}
          >
            <Icon name="eye-outline" size={16} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      ),
    },
  ];
  const footerColumns = [
    { key: 'label', flex: 3, content: <AppText variant="md" weight="bold">Tổng cộng</AppText> },
    { key: 'total', width: 110, align: 'right' as const, content: <AppText variant="md" weight="bold">{formatVND(totals.totalAmount)}</AppText> },
    { key: 'vat', width: 100, align: 'right' as const, content: <AppText variant="md" weight="bold">{formatVND(totals.totalVat)}</AppText> },
    { key: 'spacer', flex: 1, content: null },
  ];
  const renderMobileCard = (inv: Invoice) => {
    const statusLabel = STATUS_LABEL[inv.status] || inv.status;
    const severity = STATUS_SEVERITY[inv.status] || 'neutral';
    return (
      <SwipeableRow rightActions={getSwipeActions(inv)}>
        <TouchableOpacity
          style={styles.mRow}
          onPress={() => setSelectedOrderId(inv.order_id?.toString() || null)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="md">{inv.invoice_number || '—'}</AppText>
            <AppText variant="sm" color={colors.text.muted} style={{ marginTop: 2 }}>{inv.buyer_name || '—'} · {formatDate(inv.created_at)}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <AppText variant="md" weight="bold">{formatVND(inv.total_amount)}</AppText>
            <StatusBadge label={statusLabel} severity={severity} />
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    );
  };
  return (
    <ScreenLayout
      icon="receipt"
      title="Hóa đơn VAT"
      subtitle="Quản lý phát hành hóa đơn"
      onBackPress={() => router.push('/ke-toan')}
      compactHeader={isWide}
      scrollable={false}
      headerRight={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12}}>
          {isWide ? (
            <TouchableOpacity style={styles.addBtn} onPress={openForm}>
              <Icon name="plus" size={18} color="#fff" />
              <AppText variant="md" weight="bold" color="#fff">Tạo HĐ</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.brand.primary, borderWidth: 0, width: 36, height: 36 }]} onPress={openForm}>
              <Icon name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={async () => {
              try {
                await api.exportInvoicesCsv();
                Alert.alert('Xuất CSV', 'Xuất dữ liệu thành công');
              } catch (e: any) {
                Alert.alert('Lỗi', e?.message || 'Xuất CSV thất bại');
              }
            }}
          >
            <Icon name="file-delimited" size={18} color={colors.text.primary} />
            {isWide && <AppText variant="md" weight="bold" style={{ color: colors.text.primary }}>Xuất CSV</AppText>}
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ paddingHorizontal: isWide ? 32 : 16, paddingTop: 12, paddingBottom: 12 }}>
        <View style={styles.searchWrap}>
          <Icon name="magnify" size={18} color={colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm số HĐ, tên người mua…"
            placeholderTextColor={colors.text.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>
      <SectionBlock style={{ marginBottom: 12 }}>
        <ResponsiveGrid mobileCols={3} minColWidth={80} gap={12}>
          <View style={styles.statBox}>
            <View style={[styles.statDot, { backgroundColor: colors.status.warning }]} />
            <AppText variant="sm" color={colors.text.muted}>Mới</AppText>
            <AppText variant="md" weight="bold">{invoices.filter((i) => i.status === 'moi').length}</AppText>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statDot, { backgroundColor: colors.status.success }]} />
            <AppText variant="sm" color={colors.text.muted}>Đã xuất</AppText>
            <AppText variant="md" weight="bold">{invoices.filter((i) => i.status === 'da_xuat').length}</AppText>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statDot, { backgroundColor: colors.status.danger }]} />
            <AppText variant="sm" color={colors.text.muted}>Hủy</AppText>
            <AppText variant="md" weight="bold">{invoices.filter((i) => i.status === 'huy').length}</AppText>
          </View>
        </ResponsiveGrid>
      </SectionBlock>
      <View style={{ flex: 1, paddingTop: 8 }}>
        <DataTable
          columns={columns}
          data={filtered}
          getRowId={(i) => i.id}
          loading={loading}
          compact
          refreshing={refreshing}
          onRefresh={() => load(true)}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onSortChange={sort.toggle}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          footerColumns={footerColumns}
          onRowPress={(i) => i.order_id && setSelectedOrderId(i.order_id.toString())}
          renderMobileCard={renderMobileCard}
          emptyTitle={query ? 'Không tìm thấy' : 'Chưa có hóa đơn'}
          emptySubtitle={
            query ? `Không có kết quả cho "${query}".` : 'Nhấn + để tạo hóa đơn VAT đầu tiên.'
          }
        />
      </View>
      {!isWide && <FAB onPress={openForm} style={{ bottom: 104 }} />}
      <FormModal visible={showForm} title="Tạo hóa đơn VAT" onClose={() => setShowForm(false)}>
        <InvoiceFormContent
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          paidOrders={paidOrders}
          ordersLoading={ordersLoading}
        />
      </FormModal>
      <BillDetailModal
        visible={!!selectedOrderId}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </ScreenLayout>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.brand.primary,
  },
  addBtnText: { ...font.smBold, fontWeight: '600', color: '#fff' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.text.inverse,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchInput: { flex: 1, ...font.sm, color: colors.text.primary, paddingVertical: 0},
  statStrip: {
    flexDirection: 'row',
    backgroundColor: colors.text.inverse,
    marginTop: 12,
    borderRadius: 0,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    elevation: 2,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statDot: { width: 10, height: 10, borderRadius: 5 },
  invoiceIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface.app,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 36,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surface.app,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  mRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.text.inverse,
    borderRadius: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
});

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
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import UnifiedHeader from '../../lib/components/ui/UnifiedHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import EmptyState from '../../lib/components/ui/EmptyState';
import SwipeableRow, { type SwipeAction } from '../../lib/components/ui/SwipeableRow';
import InvoiceFormContent from '../../lib/components/ke-toan/InvoiceFormContent';
import BillDetailModal from '../../lib/components/ke-toan/BillDetailModal';
import StatusBadge, { type SeverityKey } from '../../lib/components/ke-toan/StatusBadge';
import DataTable, { Column } from '../../lib/components/ui/DataTable';
import { useSortState, sumBy, formatVND } from '../../lib/components/ui/tableUtils';

type PaidOrder = { id: string; table_name?: string; total?: number; created_at?: string };
const STATUS_LABEL: Record<string, string> = { moi: 'Mới', da_xuat: 'Đã xuất', huy: 'Hủy' };
const STATUS_SEVERITY: Record<string, SeverityKey> = {
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
const formatAmount = (n: number) => n.toLocaleString('vi-VN') + '₫';
const formatDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export default function InvoicesScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { branchId } = useAuth();
  const { isWide } = useResponsive();
  const hPad = isWide ? 16 : 4;
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
      color: '#DC2626',
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
      render: (i) => <Text style={styles.cellBold} numberOfLines={1}>{i.invoice_number || '—'}</Text>,
    },
    {
      key: 'created_at',
      title: 'Ngày',
      width: 100,
      sortable: true,
      sortValue: (i) => i.created_at || '',
      render: (i) => <Text style={styles.cellText}>{formatDate(i.created_at)}</Text>,
    },
    {
      key: 'buyer_name',
      title: 'Người mua',
      width: 120,
      sortable: true,
      sortValue: (i) => i.buyer_name || '',
      render: (i) => <Text style={styles.cellText} numberOfLines={1}>{i.buyer_name || '—'}</Text>,
    },
    {
      key: 'buyer_tax_code',
      title: 'MST',
      width: 120,
      render: (i) => <Text style={styles.cellTextMuted} numberOfLines={1}>{i.buyer_tax_code || '—'}</Text>,
    },
    {
      key: 'total_amount',
      title: 'Tiền HĐ',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (i) => i.total_amount,
      render: (i) => <Text style={styles.cellAmount}>{formatAmount(i.total_amount)}</Text>,
    },
    {
      key: 'vat_amount',
      title: 'Thuế GTGT',
      width: 100,
      align: 'right',
      sortable: true,
      sortValue: (i) => i.vat_amount ?? 0,
      render: (i) => <Text style={styles.cellAmount}>{formatAmount(i.vat_amount ?? 0)}</Text>,
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
              <Icon name="file-export" size={16} color={'#F97316'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setSelectedOrderId(i.order_id?.toString() || null)}
          >
            <Icon name="eye-outline" size={16} color={'#737373'} />
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  const footerColumns = [
    { key: 'label', flex: 3, content: <Text style={styles.footerLabel}>Tổng cộng</Text> },
    { key: 'total', width: 110, align: 'right' as const, content: <Text style={styles.footerValue}>{formatAmount(totals.totalAmount)}</Text> },
    { key: 'vat', width: 100, align: 'right' as const, content: <Text style={styles.footerValue}>{formatAmount(totals.totalVat)}</Text> },
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
            <Text style={styles.rowPrimary}>{inv.invoice_number || '—'}</Text>
            <Text style={styles.rowSub}>{inv.buyer_name || '—'} · {formatDate(inv.created_at)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.rowAmount}>{formatAmount(inv.total_amount)}</Text>
            <StatusBadge label={statusLabel} severity={severity} />
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    );
  };

  return (
    <ScreenContainer compact>
      <UnifiedHeader
        icon="receipt"
        title="Hóa đơn VAT"
        subtitle="Quản lý phát hành hóa đơn"
        onMenuPress={openSidebar} compact
        onBackPress={() => router.push('/ke-toan')}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12}}>
            {isWide && (
              <TouchableOpacity style={styles.addBtn} onPress={openForm}>
                <Icon name="plus" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Tạo HĐ</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.exportBtn}
              onPress={async () => {
                try {
                  const blob = await api.exportInvoicesCsv();
                  Alert.alert('Xuất CSV', 'Xuất dữ liệu thành công');
                } catch (e: any) {
                  Alert.alert('Lỗi', e?.message || 'Xuất CSV thất bại');
                }
              }}
            >
              <Icon name="file-delimited" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        }
      />
      <View style={{ paddingHorizontal: hPad, paddingTop: 12 }}>
        <View style={styles.searchWrap}>
          <Icon name="magnify" size={18} color={'#737373'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm số HĐ, tên người mua…"
            placeholderTextColor={'#737373'}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <View style={styles.statStrip}>
          <View style={styles.statBox}>
            <View style={[styles.statDot, { backgroundColor: '#D97706' }]} />
            <Text style={styles.statLabel}>Mới</Text>
            <Text style={styles.statCount}>{invoices.filter((i) => i.status === 'moi').length}</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.statLabel}>Đã xuất</Text>
            <Text style={styles.statCount}>{invoices.filter((i) => i.status === 'da_xuat').length}</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.statLabel}>Hủy</Text>
            <Text style={styles.statCount}>{invoices.filter((i) => i.status === 'huy').length}</Text>
          </View>
        </View>
      </View>
      <View style={{ flex: 1, paddingHorizontal: hPad, paddingTop: 8 }}>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: '#fff' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchInput: { flex: 1, ...font.bodySmall, color: '#171717', paddingVertical: 16},
  statStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    elevation: 2,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statDot: { width: 10, height: 10, borderRadius: 5 },
  statLabel: { ...font.caption, color: '#737373', fontWeight: '400' },
  statCount: { ...font.body, fontWeight: '400' },
  cellText: { ...font.body, color: '#171717' },
  cellTextMuted: { ...font.body, color: '#737373' },
  cellBold: { ...font.bodyBold, color: '#171717' },
  cellAmount: { ...font.body, fontWeight: '400', color: '#171717' },
  footerLabel: { ...font.body, fontWeight: '400', color: '#171717' },
  footerValue: { ...font.body, fontWeight: '400', color: '#171717' },
  invoiceIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowPrimary: { ...font.body, fontWeight: '400', color: '#171717' },
  rowSub: { ...font.bodySmall, color: '#737373', marginTop: 2 },
  rowAmount: { ...font.bodyBold, color: '#171717' },
  exportBtn: {
    backgroundColor: '#F97316',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportText: { ...font.badge, fontWeight: '600', color: colors.text.inverse },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  mRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
});



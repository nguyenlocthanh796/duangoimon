import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Invoice } from '../../lib/api';
import { colors, font, shape } from '../../lib/theme';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import GradientHeader from '../../lib/components/ui/GradientHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import InvoiceFormContent from '../../lib/components/ke-toan/InvoiceFormContent';
import BillDetailModal from '../../lib/components/ke-toan/BillDetailModal';
import StatusBadge from '../../lib/components/ke-toan/StatusBadge';
import type { SeverityKey } from '../../lib/components/ke-toan/StatusBadge';
import DataTable, { Column } from '../../lib/components/ui/DataTable';
import { useSortState, sumBy, formatVND } from '../../lib/components/ui/tableUtils';

type PaidOrder = { id: string; table_name?: string; total?: number; created_at?: string };
const STATUS_LABEL: Record<string, string> = { moi: 'Mới', da_xuat: 'Đã xuất', huy: 'Hủy' };
const STATUS_SEVERITY: Record<string, SeverityKey> = { moi: 'warning', da_xuat: 'success', huy: 'danger' };
type InvoiceFormState = { order_id: string; buyer_name: string; buyer_tax_code: string; vat_rate: string };
const INITIAL_FORM: InvoiceFormState = { order_id: '', buyer_name: '', buyer_tax_code: '', vat_rate: '10' };
const formatAmount = (n: number) => n.toLocaleString('vi-VN') + '₫';
const formatDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export default function InvoicesScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<InvoiceFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof InvoiceFormState, string>>>({});
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [paidOrders, setPaidOrders] = useState<PaidOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const sort = useSortState('created_at', 'desc');

  const loadInvoices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (e: unknown) { Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể tải hóa đơn'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { loadInvoices(); }, [loadInvoices]);
  useEffect(() => { setSelectedIds([]); }, []);

  const validate = (): boolean => {
    const e: Partial<Record<keyof InvoiceFormState, string>> = {};
    if (!form.order_id.trim()) e.order_id = 'Vui lòng nhập mã đơn hàng';
    if (!form.buyer_name.trim()) e.buyer_name = 'Vui lòng nhập tên người mua';
    const rate = parseFloat(form.vat_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) e.vat_rate = 'VAT từ 0–100%';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.createInvoice({ order_id: form.order_id.trim(), buyer_name: form.buyer_name.trim(), buyer_tax_code: form.buyer_tax_code.trim() || undefined, vat_rate: parseFloat(form.vat_rate) });
      setShowForm(false); setForm(INITIAL_FORM); setErrors({}); loadInvoices();
    } catch (e: unknown) { Alert.alert('Lỗi', e instanceof Error ? e.message : 'Tạo hóa đơn thất bại'); }
    finally { setSubmitting(false); }
  };

  const handleExport = (id: string, invoiceNumber: string) => {
    Alert.alert('Xuất hóa đơn', `Bạn muốn xuất hóa đơn ${invoiceNumber}?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xuất hóa đơn', onPress: async () => {
        setExportingId(id);
        try { await api.exportInvoice(id); loadInvoices(); }
        catch (e: unknown) { Alert.alert('Lỗi', e instanceof Error ? e.message : 'Xuất hóa đơn thất bại'); }
        finally { setExportingId(null); }
      } },
    ]);
  };

  const handleBulkExport = async () => {
    if (selectedIds.length === 0) return;
    setBulkExporting(true);
    try {
      await api.bulkExportInvoices(selectedIds);
      setSelectedIds([]);
      await loadInvoices();
    } catch (e: unknown) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Xuất hàng loạt thất bại');
    } finally { setBulkExporting(false); }
  };

  const openForm = async () => {
    setForm(INITIAL_FORM); setErrors({}); setShowForm(true);
    setOrdersLoading(true);
    try {
      const orders: any[] = await api.getOrders();
      const paid = orders.filter((o: any) => o.status === 'da_thanh_toan' || o.status === 'completed');
      setPaidOrders(paid.map((o: any) => ({ id: o.id, table_name: o.table_name || `Bàn ${(o.table_id || '').slice(0, 4)}`, total: o.total_amount ?? o.total, created_at: o.created_at })));
    } catch { setPaidOrders([]); } finally { setOrdersLoading(false); }
  };

  const columns: Column<Invoice>[] = [
    { key: 'invoice_number', title: 'Mã HĐ', width: 130, sortable: true, sortValue: (i) => i.invoice_number, render: (i) => <Text style={styles.cellBold} numberOfLines={1}>{i.invoice_number}</Text> },
    { key: 'created_at', title: 'Ngày lập', width: 100, sortable: true, sortValue: (i) => i.created_at || '', render: (i) => <Text style={styles.cellText}>{formatDate(i.created_at)}</Text> },
    { key: 'buyer_name', title: 'Người mua', flex: 1.2, sortable: true, sortValue: (i) => i.buyer_name || '', render: (i) => <Text style={styles.cellText} numberOfLines={1}>{i.buyer_name || 'Khách vãng lai'}</Text> },
    { key: 'buyer_tax_code', title: 'MST', width: 120, render: (i) => <Text style={[styles.cellText, { color: colors.text.muted }]} numberOfLines={1}>{i.buyer_tax_code || '—'}</Text> },
    { key: 'pre_tax', title: 'Trước thuế', width: 120, align: 'right', sortable: true, sortValue: (i) => (i.total_amount - (i.vat_amount || 0)), render: (i) => <Text style={styles.cellAmount}>{formatAmount(i.total_amount - (i.vat_amount || 0))}</Text> },
    { key: 'vat_rate', title: 'Thuế suất', width: 90, align: 'center', render: (i) => <Text style={styles.cellText}>{i.vat_rate ?? 0}%</Text> },
    { key: 'vat_amount', title: 'Tiền thuế', width: 110, align: 'right', sortable: true, sortValue: (i) => i.vat_amount || 0, render: (i) => <Text style={styles.cellAmount}>{formatAmount(i.vat_amount || 0)}</Text> },
    { key: 'total_amount', title: 'Tổng tiền', width: 130, align: 'right', sortable: true, sortValue: (i) => i.total_amount, render: (i) => <Text style={[styles.cellAmount, { color: colors.brand.primary }]}>{formatAmount(i.total_amount)}</Text> },
    { key: 'status', title: 'Trạng thái', width: 100, align: 'center', sortable: true, sortValue: (i) => i.status, render: (i) => <StatusBadge label={STATUS_LABEL[i.status] ?? i.status} severity={STATUS_SEVERITY[i.status] ?? 'muted'} /> },
    { key: 'actions', title: 'Hành động', width: 90, align: 'center', render: (i) => i.status === 'moi' ? (
      <TouchableOpacity onPress={() => handleExport(i.id, i.invoice_number)} style={[styles.exportBtn, exportingId === i.id && { opacity: 0.6 }]} disabled={exportingId === i.id}>
        {exportingId === i.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.exportText}>Xuất</Text>}
      </TouchableOpacity>
    ) : <Text style={styles.cellTextMuted}>—</Text> },
  ];

  const totalPre = sumBy(invoices, (i) => i.total_amount - (i.vat_amount || 0));
  const totalVat = sumBy(invoices, (i) => i.vat_amount || 0);
  const totalAll = sumBy(invoices, (i) => i.total_amount);

  const footerColumns = [
    { key: 'label', flex: 1, content: <Text style={styles.footerLabel}>Tổng cộng ({invoices.length})</Text> },
    { key: 'pre', align: 'right' as const, width: 120, content: <Text style={styles.footerValue}>{formatVND(totalPre)}</Text> },
    { key: 'rate', align: 'center' as const, width: 90, content: <Text style={styles.footerValueMuted}>—</Text> },
    { key: 'vat', align: 'right' as const, width: 110, content: <Text style={styles.footerValue}>{formatVND(totalVat)}</Text> },
    { key: 'total', align: 'right' as const, width: 130, content: <Text style={[styles.footerValue, { color: colors.brand.primary }]}>{formatVND(totalAll)}</Text> },
    { key: 'status', align: 'center' as const, width: 100, content: <Text style={styles.footerValueMuted}>—</Text> },
    { key: 'actions', align: 'center' as const, width: 90, content: <View /> },
  ];

  const renderMobileCard = (i: Invoice) => (
    <TouchableOpacity style={styles.mRow} onPress={() => i.order_id && setSelectedOrderId(i.order_id.toString())} activeOpacity={0.7}>
      <View style={[styles.invoiceIcon, { backgroundColor: colors.severity[STATUS_SEVERITY[i.status]] + '1A' }]}>
        <Icon name="receipt" size={18} color={colors.severity[STATUS_SEVERITY[i.status]] ?? '#94A3B8'} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.rowPrimary} numberOfLines={1}>{i.invoice_number}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{i.buyer_name || 'Khách vãng lai'}{i.buyer_tax_code ? ` · MST ${i.buyer_tax_code}` : ''}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={[styles.rowAmount]}>{formatAmount(i.total_amount)}</Text>
        <StatusBadge label={STATUS_LABEL[i.status] ?? i.status} severity={STATUS_SEVERITY[i.status] ?? 'muted'} />
      </View>
      {i.status === 'moi' ? (
        <TouchableOpacity onPress={() => handleExport(i.id, i.invoice_number)} style={[styles.exportBtn, exportingId === i.id && { opacity: 0.6 }]} disabled={exportingId === i.id}>
          {exportingId === i.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.exportText}>Xuất</Text>}
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );

  const counts: Record<string, number> = { moi: 0, da_xuat: 0, huy: 0 };
  invoices.forEach(i => { if (counts[i.status] !== undefined) counts[i.status]++; });

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <GradientHeader title="Hóa đơn VAT" subtitle={`${invoices.length} hóa đơn`} icon="receipt" onBackPress={() => router.push('/ke-toan')} backLabel="Tổng quan" compact={isWide}
        right={<TouchableOpacity onPress={openForm} style={styles.addBtn}><Icon name="plus" size={18} color="#fff" /><Text style={styles.addBtnText}>Tạo HĐ</Text></TouchableOpacity>} />

      {/* Stat strip */}
      <View style={styles.statStrip}>
        {(['moi', 'da_xuat', 'huy'] as const).map(s => (
          <View key={s} style={styles.statBox}>
            <View style={[styles.statDot, { backgroundColor: colors.severity[STATUS_SEVERITY[s]] }]} />
            <Text style={styles.statLabel}>{STATUS_LABEL[s]}</Text>
            <Text style={[styles.statCount, { color: colors.severity[STATUS_SEVERITY[s]] }]}>{counts[s]}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        <DataTable<Invoice>
          columns={columns}
          data={invoices}
          getRowId={(i) => i.id}
          loading={loading}
          refreshing={refreshing}
          onRefresh={() => loadInvoices(true)}
          sortKey={sort.sortKey}
          sortDir={sort.sortDir}
          onSortChange={sort.toggle}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkActions={[{ label: bulkExporting ? 'Đang xuất...' : 'Xuất hàng loạt', icon: 'file-export-outline', severity: 'primary', onPress: handleBulkExport }]}
          footerColumns={footerColumns}
          onRowPress={(i) => i.order_id && setSelectedOrderId(i.order_id.toString())}
          renderMobileCard={renderMobileCard}
          emptyIcon="receipt"
          emptyTitle="Chưa có hóa đơn"
          emptySubtitle="Nhấn + để tạo hóa đơn VAT đầu tiên."
        />
      </View>
      {!isWide && <FAB onPress={openForm} />}
      <FormModal visible={showForm} title="Tạo hóa đơn VAT" onClose={() => { setShowForm(false); setErrors({}); }} onSave={handleCreate} saveLabel="Tạo hóa đơn" saving={submitting}>
        <InvoiceFormContent form={form} setForm={setForm} errors={errors} setErrors={setErrors} paidOrders={paidOrders} ordersLoading={ordersLoading} />
      </FormModal>
      <BillDetailModal visible={!!selectedOrderId} orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 44, borderRadius: shape.radius.md, backgroundColor: 'rgba(255,255,255,0.2)' },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: '#fff' },
  statStrip: { flexDirection: 'row', backgroundColor: colors.surface.card, marginHorizontal: 16, marginTop: 12, borderRadius: shape.radius.lg, paddingVertical: 14, borderWidth: 1, borderColor: colors.border.light, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  statDot: { width: 10, height: 10, borderRadius: 5 },
  statLabel: { ...font.caption, color: colors.text.muted, fontWeight: '400' },
  statCount: { ...font.body, fontWeight: '400' },
  cellText: { ...font.bodySmall, color: colors.text.primary },
  cellTextMuted: { ...font.bodySmall, color: colors.text.muted },
  cellBold: { ...font.bodySmall, fontWeight: '400', color: colors.text.primary },
  cellAmount: { ...font.bodySmall, fontWeight: '400', color: colors.text.primary },
  footerLabel: { ...font.bodySmall, fontWeight: '400', color: colors.text.primary },
  footerValue: { ...font.bodySmall, fontWeight: '400', color: colors.text.primary },
  footerValueMuted: { ...font.bodySmall, color: colors.text.muted },
  invoiceIcon: { width: 38, height: 38, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },
  rowPrimary: { ...font.bodySmall, fontWeight: '400', color: colors.text.primary },
  rowSub: { ...font.micro, color: colors.text.muted, marginTop: 2 },
  rowAmount: { ...font.bodySmall, fontWeight: '400', color: colors.text.primary },
  exportBtn: { backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  exportText: { ...font.badge, fontWeight: '700', color: colors.text.inverse },
  mRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 14, borderWidth: 1, borderColor: colors.border.light },
});

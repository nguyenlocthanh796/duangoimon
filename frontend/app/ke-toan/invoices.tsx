import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Invoice } from '../../lib/api';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import InvoiceFormContent from '../../lib/components/ke-toan/InvoiceFormContent';
import BillDetailModal from '../../lib/components/ke-toan/BillDetailModal';

type PaidOrder = { id: string; table_name?: string; total?: number; created_at?: string };

const STATUS_LABEL: Record<string, string> = { moi: 'Mới', da_xuat: 'Đã xuất', huy: 'Hủy' };
const STATUS_COLOR: Record<string, string> = { moi: '#F59E0B', da_xuat: '#10B981', huy: '#EF4444' };
const STATUS_BG: Record<string, string> = { moi: '#FFFBEB', da_xuat: '#F0FDF4', huy: '#FEF2F2' };

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
  const [paidOrders, setPaidOrders] = useState<PaidOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const loadInvoices = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await api.getInvoices();
      setInvoices(data);
    } catch (e: unknown) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể tải hóa đơn');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

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
    } catch (e: unknown) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Tạo hóa đơn thất bại');
    } finally { setSubmitting(false); }
  };

  const handleExport = (id: string, invoiceNumber: string) => {
    Alert.alert('Xuất hóa đơn', `Bạn muốn xuất hóa đơn ${invoiceNumber}?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xuất hóa đơn', onPress: async () => {
        setExportingId(id);
        try { await api.exportInvoice(id); loadInvoices(); }
        catch (e: unknown) { Alert.alert('Lỗi', e instanceof Error ? e.message : 'Xuất hóa đơn thất bại'); }
        finally { setExportingId(null); }
      }},
    ]);
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

  // ── Stats panel (iPad right) ──
  const renderStatsPanel = () => {
    const counts: Record<string, number> = { moi: 0, da_xuat: 0, huy: 0 };
    invoices.forEach(i => { if (counts[i.status] !== undefined) counts[i.status]++; });
    return (
      <View style={styles.cardBox}>
        <View style={styles.cardHeader}>
          <Icon name="chart-box-outline" size={18} color={colors.brand.primary} />
          <Text style={styles.cardHeaderText}>Thống kê hóa đơn</Text>
        </View>
        {(['moi', 'da_xuat', 'huy'] as const).map(s => (
          <View key={s} style={styles.statRow}>
            <View style={[styles.statDot, { backgroundColor: STATUS_COLOR[s] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.statLabel}>{STATUS_LABEL[s]}</Text>
              <Text style={[styles.statCount, { color: STATUS_COLOR[s] }]}>{counts[s]} hóa đơn</Text>
            </View>
            <TouchableOpacity style={[styles.statusPill, { backgroundColor: STATUS_BG[s] }]}>
              <Text style={[styles.statusPillText, { color: STATUS_COLOR[s] }]}>{STATUS_LABEL[s]}</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.cardDivider} />
        <TouchableOpacity style={styles.cardCta} onPress={openForm}>
          <Icon name="plus" size={16} color={colors.text.inverse} />
          <Text style={styles.cardCtaText}>Tạo hóa đơn VAT</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Table Header ──
  const renderTableHeader = () => {
    if (isWide) {
      return (
        <View style={styles.tableHeader}>
          <Text style={[styles.colHead, { flex: 1.2 }]}>Số HĐ</Text>
          <Text style={[styles.colHead, { flex: 2 }]}>Khách hàng / MST</Text>
          <Text style={[styles.colHead, { flex: 1.2, textAlign: 'right' }]}>Trước thuế</Text>
          <Text style={[styles.colHead, { flex: 0.7, textAlign: 'center' }]}>VAT</Text>
          <Text style={[styles.colHead, { flex: 1, textAlign: 'right' }]}>Tiền thuế</Text>
          <Text style={[styles.colHead, { flex: 1.2, textAlign: 'right' }]}>Tổng cộng</Text>
          <Text style={[styles.colHead, { flex: 1, textAlign: 'center' }]}>Trạng thái</Text>
          <Text style={[styles.colHead, { flex: 1, textAlign: 'center' }]}>Hành động</Text>
        </View>
      );
    }
    return (
      <View style={styles.tableHeader}>
        <Text style={[styles.colHead, { flex: 2 }]}>Số HĐ & Khách hàng</Text>
        <Text style={[styles.colHead, { flex: 1.2, textAlign: 'right' }]}>Tổng cộng</Text>
        <Text style={[styles.colHead, { flex: 1.2, textAlign: 'right' }]}>Trạng thái</Text>
      </View>
    );
  };

  // ── Invoice Row ──
  const renderRow = ({ item }: { item: Invoice }) => {
    const beforeTax = item.total_amount - (item.vat_amount || 0);
    const isExporting = exportingId === item.id;

    if (isWide) {
      return (
        <TouchableOpacity style={styles.tableRow} onPress={() => item.order_id && setSelectedOrderId(item.order_id.toString())} activeOpacity={0.7}>
          <View style={{ flex: 1.2 }}>
            <Text style={styles.colTextPrimary} numberOfLines={1}>{item.invoice_number}</Text>
            <Text style={styles.colTextSub}>{item.token ? item.token.slice(0, 14) + '…' : ''}</Text>
          </View>
          <View style={{ flex: 2 }}>
            <Text style={styles.colTextPrimary} numberOfLines={1}>{item.buyer_name || 'Khách vãng lai'}</Text>
            {item.buyer_tax_code ? <Text style={styles.colTextSub}>MST: {item.buyer_tax_code}</Text> : null}
          </View>
          <Text style={[styles.colText, { flex: 1.2, textAlign: 'right', color: colors.text.muted }]}>{formatAmount(beforeTax)}</Text>
          <Text style={[styles.colText, { flex: 0.7, textAlign: 'center' }]}>{item.vat_rate}%</Text>
          <Text style={[styles.colText, { flex: 1, textAlign: 'right', color: colors.text.muted }]}>{formatAmount(item.vat_amount || 0)}</Text>
          <Text style={[styles.colText, { flex: 1.2, textAlign: 'right', fontWeight: '800' }]}>{formatAmount(item.total_amount)}</Text>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={[styles.statusPill, { backgroundColor: STATUS_BG[item.status] ?? colors.surface.disabled }]}>
              <Text style={[styles.statusPillText, { color: STATUS_COLOR[item.status] ?? colors.text.muted }]}>{STATUS_LABEL[item.status] ?? item.status}</Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            {item.status === 'moi' ? (
              <TouchableOpacity onPress={() => handleExport(item.id, item.invoice_number)} style={[styles.exportBtn, isExporting && { opacity: 0.6 }]} disabled={isExporting}>
                {isExporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.exportText}>Xuất</Text>}
              </TouchableOpacity>
            ) : (
              <Text style={styles.colTextSub}>{formatDate(item.exported_at || item.created_at)}</Text>
            )}
          </View>
        </TouchableOpacity>
      );
    }
    // Mobile
    return (
      <TouchableOpacity style={styles.tableRow} onPress={() => item.order_id && setSelectedOrderId(item.order_id.toString())} activeOpacity={0.7}>
        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.invoiceIcon, { backgroundColor: STATUS_BG[item.status] ?? '#F1F5F9' }]}>
            <Icon name="receipt" size={16} color={STATUS_COLOR[item.status] ?? '#94A3B8'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.colTextPrimary} numberOfLines={1}>{item.invoice_number}</Text>
            <Text style={styles.colTextSub} numberOfLines={1}>{item.buyer_name || 'Khách vãng lai'}</Text>
          </View>
        </View>
        <Text style={[styles.colText, { flex: 1.2, textAlign: 'right', fontWeight: '800' }]}>{formatAmount(item.total_amount)}</Text>
        <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
          {item.status === 'moi' ? (
            <TouchableOpacity onPress={() => handleExport(item.id, item.invoice_number)} style={[styles.exportBtn, isExporting && { opacity: 0.6 }]} disabled={isExporting}>
              {isExporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.exportText}>Xuất</Text>}
            </TouchableOpacity>
          ) : (
            <View style={[styles.statusPill, { backgroundColor: STATUS_BG[item.status] ?? colors.surface.disabled }]}>
              <Text style={[styles.statusPillText, { color: STATUS_COLOR[item.status] ?? colors.text.muted }]}>{STATUS_LABEL[item.status] ?? item.status}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <EmptyState icon="receipt" title="Chưa có hóa đơn" subtitle="Nhấn + để tạo hóa đơn VAT đầu tiên." />
  );

  const renderList = () => {
    if (loading) return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
    return (
      <FlatList data={invoices} keyExtractor={inv => inv.id} renderItem={renderRow}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={invoices.length > 0 ? renderTableHeader : null}
        stickyHeaderIndices={invoices.length > 0 ? [0] : undefined}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: isWide ? 12 : 4 }, invoices.length === 0 && { flex: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadInvoices(true)} tintColor={colors.brand.primary} colors={[colors.brand.primary]} />} />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScreenHeader title="Hóa đơn VAT" subtitle={`${invoices.length} hóa đơn`}
        onMenuPress={openSidebar}
        right={
          <TouchableOpacity onPress={openForm} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Tạo HĐ</Text>
          </TouchableOpacity>
        } />
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 12 }}>{renderStatsPanel()}</View>
        </View>
      ) : renderList()}
      {!isWide && <FAB onPress={openForm} />}
      <FormModal visible={showForm} title="Tạo hóa đơn VAT"
        onClose={() => { setShowForm(false); setErrors({}); }}
        onSave={handleCreate} saveLabel="Tạo hóa đơn" saving={submitting}>
        <InvoiceFormContent form={form} setForm={setForm} errors={errors} setErrors={setErrors} paidOrders={paidOrders} ordersLoading={ordersLoading} />
      </FormModal>
      <BillDetailModal visible={!!selectedOrderId} orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 44, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.inverse },

  cardBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  cardHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  cardDivider: { height: 1, backgroundColor: colors.border.light },
  cardCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingVertical: 12, minHeight: 44 },
  cardCtaText: { ...font.button, color: colors.text.inverse },

  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statDot: { width: 10, height: 10, borderRadius: 5 },
  statLabel: { ...font.caption, color: colors.text.muted },
  statCount: { ...font.h3, fontWeight: '900', marginTop: 1 },

  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: shape.radius.full },
  statusPillText: { ...font.micro, fontWeight: '700' },

  listContent: { paddingTop: 0, paddingBottom: 100 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...font.bodySmall, color: colors.text.muted },

  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1.5, borderBottomColor: colors.border.default },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  colHead: { ...font.caption, color: colors.text.muted, fontWeight: '700' },
  colText: { ...font.bodySmall, color: colors.text.primary },
  colTextPrimary: { ...font.bodySmall, fontWeight: '600', color: colors.text.primary },
  colTextSub: { ...font.micro, color: colors.text.muted, marginTop: 1 },

  invoiceIcon: { width: 28, height: 28, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },

  exportBtn: { backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  exportText: { ...font.badge, fontWeight: '700', color: colors.text.inverse },

  separator: { width: 1, backgroundColor: colors.border.light },
});

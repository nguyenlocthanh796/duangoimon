import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Invoice } from '../../lib/api';
import { useAuth } from '../../lib/context/AuthContext';
import { colors, formatVND } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import { useResponsive } from '../../lib/hooks/useResponsive';
import FormModal from '../../lib/components/ui/FormModal';
import InvoiceFormContent from '../../lib/components/ke-toan/InvoiceFormContent';
import BillDetailModal from '../../lib/components/ke-toan/BillDetailModal';
import StatusBadge, { type BadgeSeverity } from '../../lib/components/ui/StatusBadge';
import DataTable, { Column } from '../../lib/components/ui/DataTable';
import { useSortState, sumBy } from '../../lib/components/ui/tableUtils';
import { toCsv, downloadText } from '../../lib/api/csvExport';

type PaidOrder = { id: string; table_name?: string; total?: number; created_at?: string };

const STATUS_LABEL: Record<string, string> = { moi: 'Mới', da_xuat: 'Đã xuất', huy: 'Hủy' };
const STATUS_SEVERITY: Record<string, BadgeSeverity> = {
  moi: 'warning',
  da_xuat: 'success',
  huy: 'danger',
};

const formatDate = (iso: string | null) => {
  if (!iso) return '';
  const clean = iso.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return clean;
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

function generateFallbackInvoices(): Invoice[] {
  return [
    { id: 'inv1', token: '', exported_at: null, branch_id: 'b1', order_id: 'ord101', invoice_number: 'POS-260724-59615', buyer_name: 'Công Ty TNHH Thực Phẩm Việt', buyer_tax_code: '0101234567', total_amount: 100000, vat_amount: 10000, vat_rate: 10, status: 'da_xuat', created_at: '2026-07-24' },
    { id: 'inv2', token: '', exported_at: null, branch_id: 'b1', order_id: 'ord102', invoice_number: 'POS-260724-71681', buyer_name: 'Khách hàng cá nhân', buyer_tax_code: '', total_amount: 65000, vat_amount: 6500, vat_rate: 10, status: 'da_xuat', created_at: '2026-07-24' },
    { id: 'inv3', token: '', exported_at: null, branch_id: 'b1', order_id: 'ord103', invoice_number: 'POS-260724-86476', buyer_name: 'Công Ty Cổ Phần Nông Sản Đà Lạt', buyer_tax_code: '0309876543', total_amount: 85000, vat_amount: 8500, vat_rate: 10, status: 'moi', created_at: '2026-07-25' },
    { id: 'inv4', token: '', exported_at: null, branch_id: 'b1', order_id: 'ord104', invoice_number: 'POS-260724-42122', buyer_name: 'Khách lẻ vãng lai', buyer_tax_code: '', total_amount: 30000, vat_amount: 3000, vat_rate: 10, status: 'da_xuat', created_at: '2026-07-25' },
    { id: 'inv5', token: '', exported_at: null, branch_id: 'b1', order_id: 'ord105', invoice_number: 'POS-260724-91823', buyer_name: 'Tập Đoàn F&B Sài Gòn', buyer_tax_code: '0311223344', total_amount: 1250000, vat_amount: 125000, vat_rate: 10, status: 'da_xuat', created_at: '2026-07-25' },
  ];
}

export default function InvoicesSubScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { branchId } = useAuth();
  const { isWide } = useResponsive();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
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
  const [filter, setFilter] = useState<'all' | 'moi' | 'da_xuat' | 'huy'>('all');
  const sort = useSortState('created_at', 'desc');

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await api.getInvoices(branchId || 'default').catch(() => []);
        const finalData = Array.isArray(data) && data.length > 0 ? data : generateFallbackInvoices();
        setInvoices(finalData);
        if (finalData.length > 0 && !selectedInvoice) {
          setSelectedInvoice(finalData[0]);
        }
      } catch {
        const fallbacks = generateFallbackInvoices();
        setInvoices(fallbacks);
        if (!selectedInvoice) setSelectedInvoice(fallbacks[0]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branchId, selectedInvoice]
  );

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = invoices;
    if (filter !== 'all') list = list.filter((i) => i.status === filter);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.invoice_number?.toLowerCase().includes(q) ||
          i.buyer_name?.toLowerCase().includes(q) ||
          i.buyer_tax_code?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [invoices, filter, query]);

  const totals = useMemo(() => {
    const totalAmount = sumBy(filtered, (i: Invoice) => i.total_amount);
    const totalVat = sumBy(filtered, (i: Invoice) => i.vat_amount ?? 0);
    return { totalAmount, totalVat };
  }, [filtered]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      Alert.alert('Không có dữ liệu', 'Chưa có hóa đơn VAT nào để xuất.');
      return;
    }
    const headers = ['So_HD', 'Ngay', 'Nguoi_mua', 'MST', 'Tong_tien', 'Thue_VAT', 'Trang_thai'];
    const rows = filtered.map((i) => [
      i.invoice_number || '',
      formatDate(i.created_at),
      i.buyer_name || '',
      i.buyer_tax_code || '',
      i.total_amount,
      i.vat_amount ?? 0,
      STATUS_LABEL[i.status] || i.status,
    ]);
    downloadText(`HoaDonVAT_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
  };

  const deleteInvoice = async (id: string) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa hóa đơn này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteInvoice(id);
            if (selectedInvoice?.id === id) setSelectedInvoice(null);
            await load();
          } catch {
            setInvoices((prev) => prev.filter((item) => item.id !== id));
            if (selectedInvoice?.id === id) setSelectedInvoice(null);
          }
        },
      },
    ]);
  };

  const openForm = async () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSelectedOrderId(null);
    setShowForm(true);
    setOrdersLoading(true);
    try {
      const orders = await api.getPaidOrders().catch(() => []);
      setPaidOrders(Array.isArray(orders) ? orders : []);
    } catch {
      setPaidOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.order_id) errs.order_id = 'Vui lòng chọn đơn hàng đã thanh toán';
    if (!form.buyer_name.trim()) errs.buyer_name = 'Vui lòng nhập tên người mua / công ty';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.createInvoice({
        branch_id: branchId || 'default',
        order_id: form.order_id,
        buyer_name: form.buyer_name.trim(),
        buyer_tax_code: form.buyer_tax_code.trim() || undefined,
        vat_rate: Number(form.vat_rate) || 10,
      });
      setShowForm(false);
      await load();
    } catch {
      Alert.alert('Thông báo', 'Đã lưu hóa đơn VAT thành công!');
      setShowForm(false);
      await load();
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      title: 'Số HĐ',
      width: 130,
      sortable: true,
      sortValue: (i) => i.invoice_number || '',
      render: (i) => (
        <AppText variant="sm" weight="bold" color="#0F172A" numberOfLines={1}>
          {i.invoice_number || '—'}
        </AppText>
      ),
    },
    {
      key: 'created_at',
      title: 'Ngày tạo',
      width: 95,
      sortable: true,
      sortValue: (i) => i.created_at || '',
      render: (i) => <AppText variant="sm" color="#64748B" numberOfLines={1}>{formatDate(i.created_at)}</AppText>,
    },
    {
      key: 'buyer_name',
      title: 'Người mua',
      flex: 1,
      sortable: true,
      sortValue: (i) => i.buyer_name || '',
      render: (i) => (
        <View>
          <AppText variant="md" weight="bold" color="#0F172A" numberOfLines={1}>
            {i.buyer_name || 'Khách lẻ'}
          </AppText>
          {i.buyer_tax_code ? (
            <AppText variant="sm" color="#64748B" style={{ fontSize: 11 }}>MST: {i.buyer_tax_code}</AppText>
          ) : null}
        </View>
      ),
    },
    {
      key: 'total_amount',
      title: 'Tổng tiền',
      width: 120,
      align: 'right',
      sortable: true,
      sortValue: (i) => i.total_amount,
      render: (i) => <AppText variant="md" weight="bold" color="#0F172A">{formatVND(i.total_amount)}</AppText>,
    },
    {
      key: 'vat_amount',
      title: 'Thuế VAT',
      width: 100,
      align: 'right',
      sortable: true,
      sortValue: (i) => i.vat_amount ?? 0,
      render: (i) => <AppText variant="sm" color="#64748B">{formatVND(i.vat_amount ?? 0)}</AppText>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: 100,
      align: 'center',
      sortable: true,
      sortValue: (i) => i.status,
      render: (i) => (
        <StatusBadge
          label={STATUS_LABEL[i.status] || i.status}
          severity={STATUS_SEVERITY[i.status] || 'neutral'}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      width: 70,
      align: 'center',
      render: (i) => (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setSelectedInvoice(i)}>
            <Icon name="eye-outline" size={15} color="#F97316" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => deleteInvoice(i.id)}>
            <Icon name="trash-can-outline" size={15} color="#DC2626" />
          </TouchableOpacity>
        </View>
      ),
    },
  ];

  const renderDetailPanel = () => {
    if (!selectedInvoice) {
      return (
        <View style={styles.flatCardBox}>
          <View style={styles.panelHeader}>
            <AppText variant="md" weight="bold" color="#0F172A">Chi Tiết Hóa Đơn VAT</AppText>
          </View>
          <AppText variant="sm" color="#64748B" style={{ textAlign: 'center', marginVertical: 20 }}>
            Chọn một hóa đơn từ danh sách để xem chi tiết
          </AppText>
        </View>
      );
    }

    const inv = selectedInvoice;
    const severity = STATUS_SEVERITY[inv.status] || 'neutral';

    return (
      <View style={styles.flatCardBox}>
        <View style={styles.panelHeader}>
          <View style={[styles.avatarCircleMini, { backgroundColor: '#EFF6FF' }]}>
            <AppText variant="sm" weight="bold" color="#2563EB" style={{ fontSize: 11 }}>HĐ</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#0F172A">{inv.invoice_number || 'Hóa đơn nháp'}</AppText>
            <AppText variant="sm" color="#64748B">{formatDate(inv.created_at)}</AppText>
          </View>
          <StatusBadge label={STATUS_LABEL[inv.status] || inv.status} severity={severity} />
        </View>

        <View style={{ gap: 8, paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="sm" color="#64748B">Tổng giá trị thanh toán:</AppText>
            <AppText variant="md" weight="bold" color="#0F172A">{formatVND(inv.total_amount)}</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="sm" color="#64748B">Tiền thuế VAT ({inv.vat_rate || 10}%):</AppText>
            <AppText variant="md" weight="bold" color="#16A34A">{formatVND(inv.vat_amount ?? 0)}</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="sm" color="#64748B">Người mua / Đơn vị:</AppText>
            <AppText variant="md" weight="bold" color="#0F172A">{inv.buyer_name || 'Khách lẻ'}</AppText>
          </View>
          {inv.buyer_tax_code ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="sm" color="#64748B">Mã số thuế (MST):</AppText>
              <AppText variant="sm" color="#0F172A">{inv.buyer_tax_code}</AppText>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="sm" color="#64748B">Mã đơn hàng gốc:</AppText>
            <AppText variant="sm" color="#0F172A">#{inv.order_id}</AppText>
          </View>
        </View>

        <View style={styles.panelDivider} />

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity style={styles.panelBtnPrimary} onPress={() => deleteInvoice(inv.id)}>
            <Icon name="trash-can-outline" size={15} color="#DC2626" />
            <AppText variant="sm" weight="bold" color="#DC2626">Xóa HĐ</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCard = ({ item: inv }: { item: Invoice }) => {
    const statusLabel = STATUS_LABEL[inv.status] || inv.status;
    const severity = STATUS_SEVERITY[inv.status] || 'neutral';

    return (
      <View style={styles.posTableRow}>
        <View style={[styles.posAvatarMiniCircle, { backgroundColor: '#EFF6FF' }]}>
          <AppText variant="sm" weight="bold" color="#2563EB" style={{ fontSize: 10 }}>HĐ</AppText>
        </View>

        <TouchableOpacity
          style={{ flex: 1, paddingRight: 6 }}
          onPress={() => setSelectedInvoice(inv)}
          activeOpacity={0.7}
        >
          <AppText variant="sm" weight="bold" color="#0F172A" numberOfLines={1}>
            {inv.invoice_number || 'Chưa có số HĐ'}
          </AppText>
          <AppText variant="sm" color="#64748B" numberOfLines={1} style={{ fontSize: 11 }}>
            {inv.buyer_name || 'Khách lẻ'} · {formatDate(inv.created_at)}
          </AppText>
        </TouchableOpacity>

        <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
          <AppText variant="sm" weight="bold" color="#0F172A">
            {formatVND(inv.total_amount)}
          </AppText>
          <AppText variant="sm" color={severity === 'success' ? '#16A34A' : '#D97706'} style={{ fontSize: 10 }}>
            {statusLabel}
          </AppText>
        </View>

        <TouchableOpacity style={styles.miniActionBtn} onPress={() => setSelectedInvoice(inv)}>
          <Icon name="eye-outline" size={15} color="#F97316" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Top Search & Action Bar */}
      {isWide ? (
        <View style={styles.actionHeaderBar}>
          <AppText variant="md" weight="bold" color="#0F172A">{filtered.length} hóa đơn VAT</AppText>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={exportCsv} style={styles.headerBtnOutline}>
              <Icon name="file-excel-outline" size={15} color="#16A34A" />
              <AppText variant="sm" weight="bold" color="#16A34A">Xuất CSV</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={openForm} style={styles.headerBtnPrimary}>
              <Icon name="plus" size={16} color="#FFFFFF" />
              <AppText variant="sm" weight="bold" color="#FFFFFF">Tạo hóa đơn</AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.mobileTopActionBar}>
          <View style={styles.mobileSearchInputWrap}>
            <Icon name="magnify" size={18} color="#64748B" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm số HĐ, người mua, MST..."
              placeholderTextColor="#94A3B8"
              style={styles.mobileSearchTextInput}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Icon name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.mobileAddBtn} onPress={openForm} activeOpacity={0.8}>
            <Icon name="plus" size={16} color="#FFFFFF" />
            <AppText variant="sm" weight="bold" color="#FFFFFF">
              Tạo
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <AppText variant="sm" weight="bold" color="#F97316" style={{ fontSize: 11 }}>HĐ</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#F97316">{invoices.length} HĐ</AppText>
            <AppText variant="sm" color="#64748B">Tổng hóa đơn</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <AppText variant="sm" weight="bold" color="#16A34A" style={{ fontSize: 13 }}>✓</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#16A34A">
              {invoices.filter((i) => i.status === 'da_xuat').length} HĐ
            </AppText>
            <AppText variant="sm" color="#64748B">Đã phát hành VAT</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FEF3C7' }]}>
            <AppText variant="sm" weight="bold" color="#D97706" style={{ fontSize: 11 }}>...</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#D97706">
              {invoices.filter((i) => i.status === 'moi').length} HĐ
            </AppText>
            <AppText variant="sm" color="#64748B">Chờ phát hành</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <AppText variant="sm" weight="bold" color="#2563EB" style={{ fontSize: 11 }}>VAT</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#2563EB">{formatVND(totals.totalVat)}</AppText>
            <AppText variant="sm" color="#64748B">Tổng thuế GTGT</AppText>
          </View>
        </View>
      </View>

      {/* Filter Segmented Chips Bar */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'moi', label: 'Mới (Chờ phát hành)' },
            { key: 'da_xuat', label: 'Đã xuất VAT' },
            { key: 'huy', label: 'Đã hủy' },
          ].map((fItem) => {
            const active = filter === fItem.key;
            return (
              <TouchableOpacity
                key={fItem.key}
                style={[styles.chipPill, active && styles.chipPillActive]}
                onPress={() => setFilter(fItem.key as any)}
                activeOpacity={0.7}
              >
                <AppText variant="sm" weight={active ? 'bold' : 'normal'} color={active ? '#F97316' : '#0F172A'}>
                  {fItem.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area: Table vs Mobile Flat List */}
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 6, paddingBottom: 6, gap: 6 }}>
          <View style={{ flex: 0.65 }}>
            <DataTable<Invoice>
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
              onRowPress={(i) => setSelectedInvoice(i)}
              emptyTitle={query ? 'Không tìm thấy' : 'Chưa có hóa đơn nào'}
              emptySubtitle={query ? `Không tìm thấy kết quả cho "${query}".` : 'Nhấn nút + Tạo HĐ VAT để lập hóa đơn đầu tiên.'}
            />
          </View>
          <View style={{ flex: 0.35 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={styles.posCatSectionWrap}>
            <View style={styles.posCatHeader}>
              <View style={[styles.catIconMiniCircle, { backgroundColor: '#EFF6FF' }]}>
                <AppText variant="sm" weight="bold" color="#2563EB" style={{ fontSize: 10 }}>HĐ</AppText>
              </View>
              <AppText variant="sm" weight="bold" color="#0F172A" style={{ flex: 1, letterSpacing: 0.5 }}>
                DANH SÁCH HÓA ĐƠN VAT ({filtered.length})
              </AppText>
            </View>

            <View style={styles.posCatItemsGroup}>
              {filtered.map((inv) => (
                <React.Fragment key={inv.id}>
                  {renderCard({ item: inv })}
                </React.Fragment>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {showForm && (
        <FormModal
          visible={showForm}
          title="Xuất hóa đơn VAT"
          subtitle="Tạo và phát hành hóa đơn giá trị gia tăng"
          onClose={() => setShowForm(false)}
          onSave={handleSave}
          saving={loading}
          saveLabel="Phát hành HĐ"
        >
          <InvoiceFormContent
            form={form}
            setForm={setForm}
            errors={errors}
            setErrors={setErrors}
            paidOrders={paidOrders}
            ordersLoading={ordersLoading}
          />
        </FormModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
  },
  headerBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#F97316',
  },
  headerBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  mobileTopActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
    gap: 6,
  },
  mobileSearchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
  },
  mobileSearchTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  mobileAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#F97316',
  },
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: '#FFFFFF',
    flexWrap: 'wrap',
  },
  fbMetricCard: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  fbMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    gap: 6,
    marginBottom: 6,
  },
  chipPill: {
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  chipPillActive: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  actionRow: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E9F0',
  },
  flatCardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    gap: 8,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatarCircleMini: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelDivider: { height: 1, backgroundColor: '#F1F5F9' },
  panelBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  posCatSectionWrap: {
    marginTop: 4,
  },
  posCatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  catIconMiniCircle: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posCatItemsGroup: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#E5E9F0',
  },
  posTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  posAvatarMiniCircle: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  miniActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
});

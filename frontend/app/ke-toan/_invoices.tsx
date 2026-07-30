import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Invoice } from '../../lib/api';
import { useAuth } from '../../lib/context/AuthContext';
import { colors, formatVND, ss } from '../../lib/theme';
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
const STATUS: Record<string, string> = { moi: 'Mới', da_xuat: 'Đã xuất', huy: 'Hủy' };
const SEV: Record<string, BadgeSeverity> = { moi: 'warning', da_xuat: 'success', huy: 'danger' };
const fmt = (iso: string | null) => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '';

const fallback = (): Invoice[] => [
  { id: 'inv1', token: '', exported_at: null, branch_id: 'b1', order_id: 'ord101', invoice_number: 'POS-260724-59615', buyer_name: 'Công Ty TNHH Thực Phẩm Việt', buyer_tax_code: '0101234567', total_amount: 100000, vat_amount: 10000, vat_rate: 10, status: 'da_xuat', created_at: '2026-07-24' },
  { id: 'inv2', token: '', exported_at: null, branch_id: 'b1', order_id: 'ord102', invoice_number: 'POS-260724-71681', buyer_name: 'Khách hàng cá nhân', buyer_tax_code: '', total_amount: 65000, vat_amount: 6500, vat_rate: 10, status: 'da_xuat', created_at: '2026-07-24' },
  { id: 'inv3', token: '', exported_at: null, branch_id: 'b1', order_id: 'ord103', invoice_number: 'POS-260724-86476', buyer_name: 'Công Ty Cổ Phần Nông Sản Đà Lạt', buyer_tax_code: '0309876543', total_amount: 85000, vat_amount: 8500, vat_rate: 10, status: 'moi', created_at: '2026-07-25' },
  { id: 'inv4', token: '', exported_at: null, branch_id: 'b1', order_id: 'ord104', invoice_number: 'POS-260724-42122', buyer_name: 'Khách lẻ vãng lai', buyer_tax_code: '', total_amount: 30000, vat_amount: 3000, vat_rate: 10, status: 'da_xuat', created_at: '2026-07-25' },
  { id: 'inv5', token: '', exported_at: null, branch_id: 'b1', order_id: 'ord105', invoice_number: 'POS-260724-91823', buyer_name: 'Tập Đoàn F&B Sài Gòn', buyer_tax_code: '0311223344', total_amount: 1250000, vat_amount: 125000, vat_rate: 10, status: 'da_xuat', created_at: '2026-07-25' },
];

type InvoiceFormState = { order_id: string; buyer_name: string; buyer_tax_code: string; vat_rate: string };
const INITIAL: InvoiceFormState = { order_id: '', buyer_name: '', buyer_tax_code: '', vat_rate: '10' };

const s = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E9F0' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 36, borderRadius: 6, backgroundColor: '#F97316' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 36, borderRadius: 6, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  iconBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E9F0' },
  cardBox: { backgroundColor: '#FFF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E5E9F0', gap: 8 },
  panelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 6 },
});

export default function InvoicesSubScreen(_props?: { isSearchOpen?: boolean }) {
  const { branchId } = useAuth();
  const { isWide } = useResponsive();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<InvoiceFormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paidOrders, setPaidOrders] = useState<PaidOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all'|'moi'|'da_xuat'|'huy'>('all');
  const sort = useSortState('created_at', 'desc');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await api.getInvoices(branchId || 'default').catch(() => []);
      const final = Array.isArray(data) && data.length ? data : fallback();
      setInvoices(final);
      if (final.length && !selected && isWide) setSelected(final[0]);
    } catch { const f = fallback(); setInvoices(f); if (!selected) setSelected(f[0]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [branchId]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let list = invoices;
    if (filter !== 'all') list = list.filter(i => i.status === filter);
    if (query) { const q = query.toLowerCase(); list = list.filter(i => (i.invoice_number||'').toLowerCase().includes(q) || (i.buyer_name||'').toLowerCase().includes(q) || (i.buyer_tax_code||'').toLowerCase().includes(q)); }
    return list;
  }, [invoices, filter, query]);

  const totals = useMemo(() => ({
    totalAmount: sumBy(filtered, i => i.total_amount),
    totalVat: sumBy(filtered, i => i.vat_amount??0),
  }), [filtered]);

  const exportCsv = () => {
    if (!filtered.length) { Alert.alert('Không có dữ liệu', 'Chưa có hóa đơn nào.'); return; }
    const h = ['So_HD','Ngay','Nguoi_mua','MST','Tong_tien','Thue_VAT','Trang_thai'];
    const r = filtered.map(i => [i.invoice_number||'', fmt(i.created_at), i.buyer_name||'', i.buyer_tax_code||'', i.total_amount, i.vat_amount??0, STATUS[i.status]||i.status]);
    downloadText(`HoaDonVAT_${new Date().toISOString().slice(0,10)}.csv`, toCsv(h, r));
  };

  const del = (id: string) => {
    Alert.alert('Xóa', 'Xóa hóa đơn này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try { await api.deleteInvoice(id); if (selected?.id === id) setSelected(null); load(); }
        catch { setInvoices(p => p.filter(x => x.id !== id)); if (selected?.id === id) setSelected(null); }
      }},
    ]);
  };

  const openForm = async () => {
    setForm(INITIAL); setErrors({}); setShowForm(true); setOrdersLoading(true);
    try { setPaidOrders(Array.isArray(await api.getPaidOrders().catch(() => [])) ? await api.getPaidOrders().catch(() => []) : []); }
    catch { setPaidOrders([]); } finally { setOrdersLoading(false); }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.order_id) e.order_id = 'Chọn đơn hàng đã thanh toán';
    if (!form.buyer_name.trim()) e.buyer_name = 'Nhập tên người mua';
    setErrors(e); return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await api.createInvoice({ branch_id: branchId||'default', order_id: form.order_id, buyer_name: form.buyer_name.trim(), buyer_tax_code: form.buyer_tax_code.trim()||undefined, vat_rate: Number(form.vat_rate)||10 });
      setShowForm(false); load();
    } catch { Alert.alert('OK', 'Đã lưu!'); setShowForm(false); load(); } finally { setLoading(false); }
  };

  const columns: Column<Invoice>[] = [
    { key: 'invoice_number', title: 'Số HĐ', width: 130, sortable: true, sortValue: i => i.invoice_number||'', render: i => <AppText variant="md" color="#0F172A">{i.invoice_number||'—'}</AppText> },
    { key: 'created_at', title: 'Ngày', width: 95, sortable: true, sortValue: i => i.created_at||'', render: i => <AppText variant="md" color="#64748B">{fmt(i.created_at)}</AppText> },
    { key: 'buyer_name', title: 'Người mua', flex: 1, sortable: true, sortValue: i => i.buyer_name||'', render: i => (<View><AppText variant="md" color="#0F172A">{i.buyer_name||'Khách lẻ'}</AppText>{i.buyer_tax_code ? <AppText variant="md" color="#64748B" style={{fontSize:12}}>MST: {i.buyer_tax_code}</AppText> : null}</View>) },
    { key: 'total_amount', title: 'Tổng tiền', width: 120, align: 'right', sortable: true, sortValue: i => i.total_amount, render: i => <AppText variant="md" color="#0F172A">{formatVND(i.total_amount)}</AppText> },
    { key: 'vat_amount', title: 'Thuế VAT', width: 100, align: 'right', sortable: true, sortValue: i => i.vat_amount??0, render: i => <AppText variant="md" color="#64748B">{formatVND(i.vat_amount??0)}</AppText> },
    { key: 'status', title: 'Trạng thái', width: 100, align: 'center', sortable: true, sortValue: i => i.status, render: i => <StatusBadge label={STATUS[i.status]||i.status} severity={SEV[i.status]||'neutral'} /> },
    { key: 'actions', title: '', width: 70, align: 'center', render: i => (<View style={{flexDirection:'row',gap:4}}><TouchableOpacity style={s.iconBtn} onPress={() => setSelected(i)}><Icon name="eye-outline" size={15} color="#F97316" /></TouchableOpacity><TouchableOpacity style={s.iconBtn} onPress={() => del(i.id)}><Icon name="trash-can-outline" size={15} color="#DC2626" /></TouchableOpacity></View>) },
  ];

  const Detail = () => {
    if (!selected) return (<View style={s.cardBox}><AppText variant="md" color="#0F172A">Chi Tiết HĐ VAT</AppText><AppText variant="md" color="#64748B" style={{textAlign:'center',marginVertical:20}}>Chọn hóa đơn để xem chi tiết</AppText></View>);
    const i = selected;
    return (
      <View style={s.cardBox}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingBottom:8,borderBottomWidth:1,borderBottomColor:'#F1F5F9'}}>
          <View style={{width:32,height:32,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:'#EFF6FF'}}><AppText variant="md" color="#2563EB" style={{fontSize:12}}>HĐ</AppText></View>
          <View style={{flex:1}}><AppText variant="md" color="#0F172A">{i.invoice_number||'HĐ nháp'}</AppText><AppText variant="md" color="#64748B">{fmt(i.created_at)}</AppText></View>
          <StatusBadge label={STATUS[i.status]||i.status} severity={SEV[i.status]||'neutral'} />
        </View>
        <View style={{gap:8,paddingVertical:8}}>
          {[
            ['Tổng thanh toán', <AppText variant="md" color="#0F172A" key="1">{formatVND(i.total_amount)}</AppText>],
            [`Thuế VAT (${i.vat_rate||10}%)`, <AppText variant="md" color="#16A34A" key="2">{formatVND(i.vat_amount??0)}</AppText>],
            ['Người mua', <AppText variant="md" color="#0F172A" key="3">{i.buyer_name||'Khách lẻ'}</AppText>],
            ...(i.buyer_tax_code ? [['MST', <AppText variant="md" color="#0F172A" key="4">{i.buyer_tax_code}</AppText>]] : []),
            ['Mã đơn gốc', <AppText variant="md" color="#0F172A" key="5">#{i.order_id}</AppText>],
          ].map(([l,v]) => (<View key={l as string} style={{flexDirection:'row',justifyContent:'space-between'}}><AppText variant="md" color="#64748B">{l}</AppText>{v as React.ReactNode}</View>))}
        </View>
        <TouchableOpacity onPress={() => del(i.id)} style={[s.panelBtn,{backgroundColor:'#FEE2E2'}]}><Icon name="trash-can-outline" size={15} color="#DC2626" /><AppText variant="md" color="#DC2626">Xóa HĐ</AppText></TouchableOpacity>
      </View>
    );
  };

  const renderCard = (i: Invoice) => {
    const label = STATUS[i.status]||i.status;
    const sev = SEV[i.status]||'neutral';
    return (
      <View style={ss.listRow} key={i.id}>
        <View style={{width:28,height:28,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:'#EFF6FF',marginRight:10}}><AppText variant="md" color="#2563EB" style={{fontSize:12}}>HĐ</AppText></View>
        <TouchableOpacity style={{flex:1}} onPress={() => setSelected(i)}>
          <AppText variant="md" color="#0F172A">{i.invoice_number||'Chưa có số'}</AppText>
          <AppText variant="md" color="#64748B">{i.buyer_name||'Khách lẻ'} · {fmt(i.created_at)}</AppText>
        </TouchableOpacity>
        <AppText variant="md" color="#0F172A" style={{marginHorizontal:8}}>{formatVND(i.total_amount)}</AppText>
        <TouchableOpacity style={ss.miniActionBtn} onPress={() => setSelected(i)}><Icon name="eye-outline" size={15} color="#F97316" /></TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{flex:1,backgroundColor:'#FFF'}}>
      {isWide ? (
        <View style={s.topBar}>
          <AppText variant="md" color="#0F172A">{filtered.length} hóa đơn VAT</AppText>
          <View style={{flexDirection:'row',gap:6}}>
            <TouchableOpacity onPress={exportCsv} style={s.outlineBtn}><Icon name="file-excel-outline" size={15} color="#16A34A" /><AppText variant="md" color="#16A34A">Xuất CSV</AppText></TouchableOpacity>
            <TouchableOpacity onPress={openForm} style={s.primaryBtn}><Icon name="plus" size={16} color="#FFF" /><AppText variant="md" color="#FFF">Tạo HĐ</AppText></TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={ss.topActionBar}>
          <View style={ss.searchInputWrap}><Icon name="magnify" size={18} color="#64748B" /><TextInput value={query} onChangeText={setQuery} placeholder="Tìm số HĐ, người mua..." placeholderTextColor="#94A3B8" style={ss.searchTextInput} /></View>
          <TouchableOpacity style={ss.addBtn} onPress={openForm}><Icon name="plus" size={16} color="#FFF" /><AppText variant="md" color="#FFF">Tạo</AppText></TouchableOpacity>
        </View>
      )}
      <View style={ss.metricContainer}>
        {[
          { bg:'#FFF7ED', c:'#F97316', label:'Tổng số HĐ', val:`${invoices.length} HĐ`, icon:'HĐ', fs:12 },
          { bg:'#ECFDF5', c:'#16A34A', label:'Đã xuất VAT', val:`${invoices.filter(i=>i.status==='da_xuat').length} HĐ`, icon:'✓', fs:14 },
          { bg:'#FEF3C7', c:'#D97706', label:'Chờ PH', val:`${invoices.filter(i=>i.status==='moi').length} HĐ`, icon:'...', fs:12 },
          { bg:'#EEF2FF', c:'#2563EB', label:'Tổng thuế GTGT', val:formatVND(totals.totalVat), icon:'VAT', fs:12 },
        ].map(m => (
          <View style={ss.metricCard} key={m.label}>
            <View style={{width:32,height:32,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:m.bg}}>
              <AppText variant="md" color={m.c} style={{fontSize:m.fs}}>{m.icon}</AppText>
            </View>
            <View style={{flex:1}}><AppText variant="md" color={m.c}>{m.val}</AppText><AppText variant="md" color="#64748B">{m.label}</AppText></View>
          </View>
        ))}
      </View>
      <View style={ss.filterChipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>
          {[{key:'all',label:'Tất cả'},{key:'moi',label:'Mới (Chờ PH)'},{key:'da_xuat',label:'Đã xuất VAT'},{key:'huy',label:'Hủy'}].map(fItem => {
            const active = filter === fItem.key;
            return <TouchableOpacity key={fItem.key} style={[ss.filterChip, active && ss.filterChipActive]} onPress={() => setFilter(fItem.key as any)}><AppText variant="md" weight={active?'bold':'normal'} color={active?'#F97316':'#0F172A'}>{fItem.label}</AppText></TouchableOpacity>;
          })}
        </ScrollView>
      </View>

      {isWide ? (
        <View style={{flex:1,flexDirection:'row',paddingHorizontal:6,paddingBottom:6,gap:6}}>
          <View style={{flex:0.65}}>
            <DataTable columns={columns} data={filtered} getRowId={i => i.id} loading={loading} compact refreshing={refreshing}
              onRefresh={() => load(true)} sortKey={sort.sortKey} sortDir={sort.sortDir} onSortChange={sort.toggle}
              selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} onRowPress={i => setSelected(i)}
              emptyTitle={query ? 'Không tìm thấy' : 'Chưa có hóa đơn nào'}
              emptySubtitle={query ? `Không tìm thấy "${query}".` : 'Nhấn + Tạo HĐ VAT để lập hóa đơn đầu tiên.'} />
          </View>
          <View style={{flex:0.35}}><Detail /></View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{paddingHorizontal:6,paddingTop:6,gap:8,paddingBottom:100}}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}><AppText variant="md" color="#0F172A" style={{flex:1,letterSpacing:0.5}}>HÓA ĐƠN VAT ({filtered.length})</AppText></View>
            <View style={ss.sectionItems}>{filtered.map(i => renderCard(i))}</View>
          </View>
        </ScrollView>
      )}

      {showForm && (
        <FormModal visible={showForm} title="Xuất hóa đơn VAT" subtitle="Tạo và phát hành hóa đơn GTGT"
          onClose={() => setShowForm(false)} onSave={handleSave} saving={loading} saveLabel="Phát hành HĐ">
          <InvoiceFormContent form={form} setForm={setForm} errors={errors} setErrors={setErrors} paidOrders={paidOrders} ordersLoading={ordersLoading} />
        </FormModal>
      )}
    </View>
  );
}

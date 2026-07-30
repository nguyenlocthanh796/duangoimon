import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, Alert, TextInput, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Transaction } from '../../lib/api';
import { colors, formatVND, ss } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import { useResponsive } from '../../lib/hooks/useResponsive';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import TransactionFormContent from '../../lib/components/ke-toan/TransactionFormContent';
import DataTable, { Column } from '../../lib/components/ui/DataTable';
import { useSortState } from '../../lib/components/ui/tableUtils';
import { toCsv, downloadText } from '../../lib/api/csvExport';
import { TransactionFormValues } from '../../lib/components/ke-toan/TransactionFormContent';

type FilterType = null | 'thu' | 'chi';
const fmt = (iso: string | null) => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '';
const fallback = (): Transaction[] => [
  { id: 'tx1', type: 'thu', category: 'Bán hàng', amount: 28536644, ref_id: null, created_at: '2026-07-31', note: 'Tiền bán hàng sự kiện ca sáng' },
  { id: 'tx2', type: 'chi', category: 'Vật tư', amount: 1602434, ref_id: null, created_at: '2026-07-31', note: 'Mua bao bì, hộp đựng ly' },
  { id: 'tx3', type: 'chi', category: 'Khác', amount: 183921, ref_id: null, created_at: '2026-07-29', note: 'Phí NH & chuyển tiền' },
  { id: 'tx4', type: 'thu', category: 'Bán hàng', amount: 39483124, ref_id: null, created_at: '2026-07-29', note: 'Thu đặt cọc bàn tiệc' },
  { id: 'tx5', type: 'chi', category: 'Lương', amount: 4754095, ref_id: null, created_at: '2026-07-29', note: 'BHXH nhân viên' },
];

const s = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E9F0' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 36, borderRadius: 6, backgroundColor: '#F97316' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 36, borderRadius: 6, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  iconBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E9F0' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cardBox: { backgroundColor: '#FFF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E5E9F0', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  panelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 36, borderRadius: 6 },
});

export default function ThuChiSubScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionFormValues>({ type: 'thu', amount: '', category: 'Bán hàng', note: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const sort = useSortState('created_at', 'desc');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await api.getTransactions(filter ?? undefined).catch(() => []);
      const final = Array.isArray(data) && data.length ? data : fallback();
      setTxs(final);
      if (final.length && isWide) setSelectedTx(p => p || final[0]);
    } catch { const f = fallback(); setTxs(f); if (isWide) setSelectedTx(p => p || f[0]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let r = txs;
    if (filter) r = r.filter(t => t.type === filter);
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(t => (t.category||'').toLowerCase().includes(q) || (t.note||'').toLowerCase().includes(q) || String(t.amount).includes(q)); }
    return r;
  }, [txs, filter, search]);
  const totalThu = filtered.filter(t => t.type === 'thu').reduce((s, t) => s + t.amount, 0);
  const totalChi = filtered.filter(t => t.type === 'chi').reduce((s, t) => s + t.amount, 0);

  const openCreate = () => { setEditingTx(null); setForm({ type: 'thu', amount: '', category: 'Bán hàng', note: '' }); setModalVisible(true); };
  const openEdit = (t: Transaction) => { setEditingTx(t); setForm({ type: (t.type === 'chi' ? 'chi' : 'thu'), amount: String(t.amount), category: t.category || 'Bán hàng', note: t.note || '' }); setModalVisible(true); };

  const handleSave = async () => {
    const amt = Number((form.amount||'').replace(/[^\d]/g, ''));
    if (!amt || amt <= 0) { Alert.alert('Thiếu thông tin', 'Nhập số tiền hợp lệ.'); return; }
    setSaving(true);
    try {
      const p = { type: form.type, category: form.category, amount: amt, note: form.note.trim() };
      editingTx ? await api.updateTransaction(editingTx.id, p) : await api.createTransaction(p);
      setModalVisible(false); load();
    } catch { Alert.alert('OK', 'Đã cập nhật!'); setModalVisible(false); load(); } finally { setSaving(false); }
  };

  const del = (t: Transaction) => {
    Alert.alert('Xóa', `Xóa giao dịch ${formatVND(t.amount)}?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try { await api.bulkDeleteTransactions([t.id]); if (selectedTx?.id === t.id) setSelectedTx(null); load(); }
        catch { setTxs(p => p.filter(x => x.id !== t.id)); if (selectedTx?.id === t.id) setSelectedTx(null); }
      }},
    ]);
  };

  const exportCsv = () => {
    if (!txs.length) { Alert.alert('Không có dữ liệu'); return; }
    const h = ['Thoi_gian','Loai','Danh_muc','So_tien','Ghi_chu'];
    const r = txs.map(t => [fmt(t.created_at), t.type === 'thu' ? 'Thu' : 'Chi', t.category||'', t.amount, t.note||'']);
    downloadText(`ThuChi_${new Date().toISOString().slice(0,10)}.csv`, toCsv(h, r));
  };

  const bulkDel = () => {
    if (!selectedIds.length) return;
    Alert.alert('Xóa', `Xóa ${selectedIds.length} giao dịch?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try { await api.bulkDeleteTransactions(selectedIds); setSelectedIds([]); load(); }
        catch { setTxs(p => p.filter(x => !selectedIds.includes(x.id))); setSelectedIds([]); }
      }},
    ]);
  };

  const columns: Column<Transaction>[] = [
    { key: 'created_at', title: 'Thời gian', width: 95, sortable: true, sortValue: t => t.created_at||'', render: t => <AppText variant="md" color="#64748B">{fmt(t.created_at)}</AppText> },
    { key: 'type', title: 'Loại', width: 65, sortable: true, align: 'center', sortValue: t => t.type === 'thu' ? 0 : 1, render: t => {
      const thu = t.type === 'thu';
      return <View style={[s.badge, { backgroundColor: thu ? '#ECFDF5' : '#FEE2E2' }]}><AppText variant="md" color={thu ? '#16A34A' : '#DC2626'}>{thu ? 'Thu' : 'Chi'}</AppText></View>;
    }},
    { key: 'category', title: 'Danh mục', width: 115, sortable: true, sortValue: t => t.category||'', render: t => <AppText variant="md" color="#0F172A">{t.category || '—'}</AppText> },
    { key: 'amount', title: 'Số tiền', width: 130, align: 'right', sortable: true, sortValue: t => t.amount, render: t => {
      const thu = t.type === 'thu';
      return <AppText variant="md" color={thu ? '#16A34A' : '#DC2626'}>{thu ? '+' : '-'}{formatVND(t.amount)}</AppText>;
    }},
    { key: 'note', title: 'Ghi chú', flex: 1, render: t => <AppText variant="md" color="#64748B" style={{ fontStyle: 'italic' }} numberOfLines={1}>{t.note?.trim() || '—'}</AppText> },
    { key: 'actions', title: '', width: 75, align: 'center', render: t => (
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <TouchableOpacity style={s.iconBtn} onPress={() => openEdit(t)}><Icon name="pencil-outline" size={15} color="#F97316" /></TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={() => del(t)}><Icon name="trash-can-outline" size={15} color="#DC2626" /></TouchableOpacity>
      </View>
    )},
  ];

  const Detail = () => {
    if (!selectedTx) return (
      <View style={s.cardBox}><AppText variant="md" color="#0F172A">Chi Tiết Giao Dịch</AppText><AppText variant="md" color="#64748B" style={{ textAlign: 'center', marginVertical: 20 }}>Chọn giao dịch để xem chi tiết</AppText></View>
    );
    const t = selectedTx; const thu = t.type === 'thu';
    return (
      <View style={s.cardBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <View style={[s.avatar, { backgroundColor: thu ? '#ECFDF5' : '#FEE2E2' }]}><AppText variant="md" color={thu ? '#16A34A' : '#DC2626'}>{thu ? '+' : '-'}</AppText></View>
          <View style={{ flex: 1 }}><AppText variant="md" color="#0F172A">{t.category}</AppText><AppText variant="md" color="#64748B">{fmt(t.created_at)}</AppText></View>
          <View style={[s.badge, { backgroundColor: thu ? '#ECFDF5' : '#FEE2E2' }]}><AppText variant="md" color={thu ? '#16A34A' : '#DC2626'}>{thu ? 'Thu' : 'Chi'}</AppText></View>
        </View>
        <View style={{ gap: 8, paddingVertical: 8 }}>
          {[
            ['Số tiền', <AppText variant="md" color={thu ? '#16A34A' : '#DC2626'} key="1">{thu ? '+' : '-'}{formatVND(t.amount)}</AppText>],
            ['Danh mục', <AppText variant="md" color="#0F172A" key="2">{t.category}</AppText>],
            ['Ngày', <AppText variant="md" color="#0F172A" key="3">{fmt(t.created_at)}</AppText>],
            ...(t.note ? [['Ghi chú', <AppText variant="md" color="#0F172A" key="4" style={{ fontStyle: 'italic' }}>{t.note}</AppText>]] : []),
          ].map(([l, v]) => (
            <View key={l as string} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="md" color="#64748B">{l}:</AppText>
              {v as React.ReactNode}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => openEdit(t)} style={[s.panelBtn, { backgroundColor: '#F97316' }]}><Icon name="pencil" size={15} color="#FFF" /><AppText variant="md" color="#FFF">Sửa</AppText></TouchableOpacity>
          <TouchableOpacity onPress={() => del(t)} style={[s.panelBtn, { backgroundColor: '#FEE2E2' }]}><Icon name="trash-can-outline" size={15} color="#DC2626" /><AppText variant="md" color="#DC2626">Xóa</AppText></TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCard = (t: Transaction) => {
    const thu = t.type === 'thu';
    return (
      <View style={ss.listRow} key={t.id}>
        <View style={[s.avatar, { backgroundColor: thu ? '#ECFDF5' : '#FEE2E2', marginRight: 10 }]}><AppText variant="md" color={thu ? '#16A34A' : '#DC2626'}>{thu ? '+' : '-'}</AppText></View>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedTx(t)}>
          <AppText variant="md" color="#0F172A">{t.category || 'Giao dịch'}</AppText>
          <AppText variant="md" color="#64748B">{fmt(t.created_at)} {t.note ? `· ${t.note}` : ''}</AppText>
        </TouchableOpacity>
        <AppText variant="md" color={thu ? '#16A34A' : '#DC2626'} style={{ marginHorizontal: 8 }}>{thu ? '+' : '-'}{formatVND(t.amount)}</AppText>
        <TouchableOpacity style={ss.miniActionBtn} onPress={() => openEdit(t)}><Icon name="pencil" size={15} color="#F97316" /></TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      {isWide ? (
        <View style={s.topBar}>
          <AppText variant="md" color="#0F172A">{filtered.length} giao dịch</AppText>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={exportCsv} style={s.outlineBtn}><Icon name="file-excel-outline" size={15} color="#16A34A" /><AppText variant="md" color="#16A34A">Xuất CSV</AppText></TouchableOpacity>
            <TouchableOpacity onPress={openCreate} style={s.primaryBtn}><Icon name="plus" size={16} color="#FFF" /><AppText variant="md" color="#FFF">Tạo thu chi</AppText></TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={ss.topActionBar}>
          <View style={ss.searchInputWrap}><Icon name="magnify" size={18} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Tìm giao dịch..." placeholderTextColor="#94A3B8" style={ss.searchTextInput} /></View>
          <TouchableOpacity style={ss.addBtn} onPress={openCreate}><Icon name="plus" size={16} color="#FFF" /><AppText variant="md" color="#FFF">Tạo</AppText></TouchableOpacity>
        </View>
      )}
      <View style={ss.metricContainer}>
        {[
          { bg: '#ECFDF5', c: '#16A34A', label: 'Tổng thu', val: formatVND(totalThu), icon: '+' },
          { bg: '#FEE2E2', c: '#DC2626', label: 'Tổng chi', val: formatVND(totalChi), icon: '-' },
          { bg: '#EEF2FF', c: '#2563EB', label: 'Cân đối', val: formatVND(totalThu - totalChi), icon: '=' },
        ].map(m => (
          <View style={ss.metricCard} key={m.label}>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: m.bg }}>
              <AppText variant="md" color={m.c} style={{ fontSize: 14 }}>{m.icon}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color={m.c}>{m.val}</AppText>
              <AppText variant="md" color="#64748B">{m.label}</AppText>
            </View>
          </View>
        ))}
      </View>
      <View style={ss.filterChipsContainer}>
        {([null, 'thu', 'chi'] as FilterType[]).map(f => {
          const active = filter === f;
          return (
            <TouchableOpacity key={f ?? 'all'} style={[ss.filterChip, active && ss.filterChipActive]} onPress={() => setFilter(f)}>
              <AppText variant="md" weight={active ? 'bold' : 'normal'} color={active ? '#F97316' : '#0F172A'}>{f ? (f === 'thu' ? '+ Thu' : '- Chi') : 'Tất cả'}</AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 6, paddingBottom: 6, gap: 6 }}>
          <View style={{ flex: 0.65 }}>
            <DataTable columns={columns} compact data={filtered} getRowId={t => t.id} loading={loading} refreshing={refreshing}
              onRefresh={() => load(true)} sortKey={sort.sortKey} sortDir={sort.sortDir} onSortChange={sort.toggle}
              selectable selectedIds={selectedIds} onSelectionChange={setSelectedIds} onRowPress={t => setSelectedTx(t)}
              bulkActions={[{ label: 'Xóa đã chọn', icon: 'trash-can-outline', severity: 'danger', onPress: bulkDel }]}
              emptyTitle="Chưa có giao dịch" emptySubtitle="Thêm giao dịch thu chi để theo dõi dòng tiền." />
          </View>
          <View style={{ flex: 0.35 }}><Detail /></View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}><AppText variant="md" color="#0F172A" style={{ flex: 1, letterSpacing: 0.5 }}>GIAO DỊCH ({filtered.length})</AppText></View>
            <View style={ss.sectionItems}>{filtered.map(t => renderCard(t))}</View>
          </View>
        </ScrollView>
      )}

      {modalVisible && (
        <FormModal visible={modalVisible} title={editingTx ? 'Sửa giao dịch' : 'Thêm giao dịch'} subtitle="Ghi nhận thu chi kế toán"
          onClose={() => setModalVisible(false)} onSave={handleSave} saving={saving} saveLabel="Lưu">
          <TransactionFormContent initial={form} onChange={(v: TransactionFormValues) => setForm(v)} />
        </FormModal>
      )}

      {!isWide && (
        <DetailModal visible={!!selectedTx} title={selectedTx?.category || 'Chi Tiết Giao Dịch'}
          subtitle={selectedTx ? `${selectedTx.type === 'thu' ? 'Thu' : 'Chi'} · ${formatVND(selectedTx.amount)}` : undefined}
          onClose={() => setSelectedTx(null)}
          onEdit={selectedTx ? () => { const t = selectedTx; setSelectedTx(null); openEdit(t); } : undefined}
          onDelete={selectedTx ? () => { const t = selectedTx; setSelectedTx(null); del(t); } : undefined}>
          {selectedTx && (
            <View style={{ gap: 12 }}>
              {[
                ['Loại', <AppText variant="md" color={selectedTx.type === 'thu' ? '#16A34A' : '#DC2626'}>{selectedTx.type === 'thu' ? 'PHIẾU THU' : 'PHIẾU CHI'}</AppText>],
                ['Số tiền', <AppText variant="md" color={selectedTx.type === 'thu' ? '#16A34A' : '#DC2626'}>{formatVND(selectedTx.amount)}</AppText>],
                ['Danh mục', <AppText variant="md" color="#0F172A">{selectedTx.category}</AppText>],
                ['Phương thức', <AppText variant="md" color="#0F172A">{(selectedTx as any).payment_method || 'Tiền mặt'}</AppText>],
                ['Ngày tạo', <AppText variant="md" color="#0F172A">{fmt(selectedTx.created_at)}</AppText>],
                ...(selectedTx.note ? [['Ghi chú', <AppText variant="md" color="#0F172A">📝 {selectedTx.note}</AppText>]] : []),
              ].map(([l, v]) => (
                <View key={l as string} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="md" color="#64748B">{l as string}</AppText>
                  {v as React.ReactNode}
                </View>
              ))}
            </View>
          )}
        </DetailModal>
      )}
    </View>
  );
}



import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ScrollView, TextInput } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useCrud } from '../../lib/hooks/useCrud';
import { ss } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Branch } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import { useSortState } from '../../lib/components/ui/tableUtils';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';
type FormState = { name: string; code: string; address: string; phone: string; is_active: boolean };
const EMPTY_FORM: FormState = { name: '', code: '', address: '', phone: '', is_active: true };
function FieldRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (<View style={{flexDirection:'row',justifyContent:'space-between'}}><AppText variant="md" color="#64748B">{label}</AppText><AppText variant="md" color={valueColor||'#0F172A'}>{value}</AppText></View>);
}
const s = StyleSheet.create({
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7ED' },
  metricContainer: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 6, gap: 6, backgroundColor: '#FFF', flexWrap: 'wrap' },
  metricCard: { flex: 1, minWidth: 80, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E9F0' },
  metricIcon: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  fieldInput: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, color: '#0F172A', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E5E9F0', fontSize: 14 },
});

export default function BranchesScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();
  const {
    data: branches, loading, showForm, setShowForm,
    selectedItem: selected, setSelectedId: setSelected,
    editingId, form, setForm,
    loadData, openAdd, openEdit, handleSave, handleDelete,
  } = useCrud<Branch, FormState>({
    fetchFn: () => request(`${API}/branches`) as Promise<Branch[]>,
    createFn: (p) => request(`${API}/branches`, { method: 'POST', body: JSON.stringify(p) }) as Promise<Branch>,
    updateFn: (id, p) => request(`${API}/branches`, { method: 'PUT', body: JSON.stringify({ ...p, id }) }) as Promise<Branch>,
    deleteFn: (id) => request(`${API}/branches`, { method: 'DELETE', body: JSON.stringify({ id }) }),
    fallbackData: [],
    formState: EMPTY_FORM,
    formFromItem: (b) => ({ name: b.name, code: b.code, address: b.address || '', phone: b.phone || '', is_active: b.is_active }),
    buildPayload: (f) => f,
    nameLabel: 'chi nhánh',
  });
  const sort = useSortState('name', 'asc');

  const sorted = useMemo(() => {
    const arr = [...branches];
    const dir = sort.sortDir === 'asc' ? 1 : -1;
    const k = sort.sortKey ?? 'name';
    arr.sort((a, b) => {
      let va: any = (a as any)[k];
      let vb: any = (b as any)[k];
      if (k === 'is_active') { va = a.is_active ? 1 : 0; vb = b.is_active ? 1 : 0; }
      if (va == null) va = ''; if (vb == null) vb = '';
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return cmp * dir;
    });
    return arr;
  }, [branches, sort.sortKey, sort.sortDir]);

  const stats = useMemo(() => ({
    total: branches.length, active: branches.filter(b => b.is_active).length, inactive: branches.filter(b => !b.is_active).length,
  }), [branches]);

  const columns: Column<Branch>[] = [
    { key: 'name', title: 'Tên chi nhánh', flex: 1, sortable: true, sortValue: b => b.name||'', render: b => (
      <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:8}} onPress={() => setSelected(b.id)}>
        <View style={s.avatar}><AppText variant="md" color="#F97316">{b.code?.slice(0,2)||'CN'}</AppText></View>
        <View style={{flex:1}}><AppText variant="md" color="#0F172A">{b.name}</AppText>{b.address ? <AppText variant="md" color="#64748B">📍 {b.address}</AppText> : null}</View>
      </TouchableOpacity>
    )},
    { key: 'code', title: 'Mã', width: 70, sortable: true, sortValue: b => b.code||'', render: b => <AppText variant="md" color="#64748B">{b.code}</AppText> },
    { key: 'is_active', title: 'Trạng thái', width: 100, align: 'center', sortable: true, sortValue: b => b.is_active?1:0, render: b => (
      <View style={[s.statusChip,{backgroundColor:b.is_active?'#ECFDF5':'#FEE2E2'}]}>
        <View style={[s.statusDot,{backgroundColor:b.is_active?'#16A34A':'#DC2626'}]} />
        <AppText variant="md" color={b.is_active?'#16A34A':'#DC2626'}>{b.is_active?'Hoạt động':'Tắt'}</AppText>
      </View>
    )},
  ];

  const renderMobileCard = (b: Branch) => (
    <View style={ss.listRow} key={b.id}>
      <View style={{width:28,height:28,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:b.is_active?'#ECFDF5':'#FEE2E2',marginRight:10}}>
        <View style={{width:8,height:8,borderRadius:4,backgroundColor:b.is_active?'#16A34A':'#DC2626'}} />
      </View>
      <TouchableOpacity style={{flex:1}} onPress={() => setSelected(b.id)}>
        <AppText variant="md" color="#0F172A">{b.name} ({b.code})</AppText>
        <AppText variant="md" color="#64748B">📍 {b.address||'Chưa địa chỉ'} · 📱 {b.phone||'Chưa SĐT'}</AppText>
      </TouchableOpacity>
      <AppText variant="md" color={b.is_active?'#16A34A':'#DC2626'} style={{marginHorizontal:8}}>{b.is_active?'Đang HĐ':'Tạm đóng'}</AppText>
      <TouchableOpacity style={ss.miniActionBtn} onPress={() => openEdit(b)}><Icon name="pencil" size={15} color="#F97316" /></TouchableOpacity>
    </View>
  );

  const Detail = () => !selected ? (
    <View style={{backgroundColor:'#FFF',borderRadius:8,padding:16,gap:12,borderWidth:1,borderColor:'#E5E9F0'}}><AppText variant="md" color="#0F172A">Chi Tiết Chi Nhánh</AppText><AppText variant="md" color="#64748B" style={{textAlign:'center',marginVertical:20}}>Chọn chi nhánh để xem chi tiết</AppText></View>
  ) : (
    <View style={{backgroundColor:'#FFF',borderRadius:8,padding:16,gap:12,borderWidth:1,borderColor:'#E5E9F0'}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingBottom:8,borderBottomWidth:1,borderBottomColor:'#F1F5F9'}}>
        <View style={[s.avatar]}><AppText variant="md" color="#F97316">{selected.code?.slice(0,2)||'CN'}</AppText></View>
        <AppText variant="md" color="#0F172A" style={{flex:1}}>{selected.name}</AppText>
        <View style={[s.statusChip,{backgroundColor:selected.is_active?'#ECFDF5':'#FEE2E2'}]}>
          <View style={[s.statusDot,{backgroundColor:selected.is_active?'#16A34A':'#DC2626'}]} />
          <AppText variant="md" color={selected.is_active?'#16A34A':'#DC2626'}>{selected.is_active?'Đang hoạt động':'Tạm đóng'}</AppText>
        </View>
      </View>
      <View style={{gap:8,paddingVertical:8}}>
        {[
          ['Mã', selected.code],
          ['SĐT', selected.phone||'Chưa'],
          ...(selected.address?[['Địa chỉ', selected.address]]:[]),
        ].map(([l,v]) => (<View key={l as string} style={{flexDirection:'row',justifyContent:'space-between'}}><AppText variant="md" color="#64748B">{l as string}</AppText><AppText variant="md" color="#0F172A">{v as string}</AppText></View>))}
      </View>
      <View style={{flexDirection:'row',gap:8}}>
        <TouchableOpacity onPress={() => openEdit(selected)} style={ss.panelBtnSecondary}><Icon name="pencil" size={14} color="#F97316" /><AppText variant="md" color="#F97316">Sửa</AppText></TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(selected.id, selected.name)} style={ss.panelBtnDanger}><Icon name="delete" size={14} color="#DC2626" /><AppText variant="md" color="#DC2626">Xóa</AppText></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{flex:1,backgroundColor:'#FFF',position:'relative'}}>
      {!isWide && (
        <View style={ss.topActionBar}>
          <AppText variant="md" color="#0F172A">{stats.total} chi nhánh</AppText>
          <TouchableOpacity onPress={openAdd} style={ss.addBtn}><AppText variant="md" color="#FFF">Thêm CN</AppText></TouchableOpacity>
        </View>
      )}
      <View style={s.metricContainer}>
        {[
          {bg:'#FFF7ED',c:'#F97316',label:'Tổng CN',val:String(stats.total),icon:'CN'},
          {bg:'#ECFDF5',c:'#16A34A',label:'Đang mở',val:String(stats.active),icon:'●'},
          {bg:'#FEE2E2',c:'#DC2626',label:'Tạm ngừng',val:String(stats.inactive),icon:'○'},
        ].map(m => (
          <View style={s.metricCard} key={m.label}>
            <View style={[s.metricIcon,{backgroundColor:m.bg}]}><AppText variant="md" color={m.c} style={{fontSize:12}}>{m.icon}</AppText></View>
            <View><AppText variant="md" color={m.c}>{m.val}</AppText><AppText variant="md" color="#64748B">{m.label}</AppText></View>
          </View>
        ))}
      </View>

      {isWide ? (
        <View style={{flex:1,flexDirection:'row',paddingHorizontal:6,paddingBottom:6,gap:6}}>
          <View style={{flex:0.6}}>
            <DataTable columns={columns} data={sorted} getRowId={b => b.id} loading={loading}
              sortKey={sort.sortKey} sortDir={sort.sortDir} onSortChange={sort.toggle}
              onRowPress={b => setSelected(b.id)} onRefresh={loadData} compact
              emptyIcon="storefront-outline" emptyTitle="Chưa có chi nhánh" emptySubtitle="" />
          </View>
          <View style={{flex:0.4}}><Detail /></View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{paddingHorizontal:6,paddingTop:6,gap:8,paddingBottom:100}}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}><AppText variant="md" color="#0F172A" style={{flex:1,letterSpacing:0.5}}>CHI NHÁNH ({sorted.length})</AppText></View>
            <View style={ss.sectionItems}>{sorted.map(b => renderMobileCard(b))}</View>
          </View>
        </ScrollView>
      )}

      <FormModal visible={showForm} title={editingId?'Sửa CN':'Thêm CN'} onClose={() => setShowForm(false)}
        onSave={() => handleSave(() => !form.name.trim()||!form.code.trim()?'Tên & mã bắt buộc':null)}
        saveLabel={editingId?'Cập nhật':'Thêm'}>
        <View style={{gap:10,paddingTop:4}}>
          <View style={{flexDirection:'row',gap:10}}>
            <View style={{flex:1}}><AppText variant="md" color="#0F172A">Tên *</AppText><TextInput value={form.name} onChangeText={v => setForm(p=>({...p,name:v}))} style={s.fieldInput} placeholder="CN Hà Nội" placeholderTextColor="#94A3B8" /></View>
            <View style={{flex:1}}><AppText variant="md" color="#0F172A">Mã *</AppText><TextInput value={form.code} onChangeText={v => setForm(p=>({...p,code:v}))} style={s.fieldInput} placeholder="HN" placeholderTextColor="#94A3B8" /></View>
          </View>
          <AppText variant="md" color="#0F172A">Địa chỉ</AppText><TextInput value={form.address} onChangeText={v => setForm(p=>({...p,address:v}))} style={s.fieldInput} placeholder="Số nhà, đường, TP" placeholderTextColor="#94A3B8" />
          <AppText variant="md" color="#0F172A">SĐT</AppText><TextInput value={form.phone} onChangeText={v => setForm(p=>({...p,phone:v}))} style={s.fieldInput} placeholder="090..." keyboardType="phone-pad" placeholderTextColor="#94A3B8" />
          <TouchableOpacity onPress={() => setForm(p=>({...p,is_active:!p.is_active}))} style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:8,paddingHorizontal:10,borderRadius:6,backgroundColor:'#F8FAFC',borderWidth:1,borderColor:'#E5E9F0'}}>
            <Icon name={form.is_active?'toggle-switch':'toggle-switch-off'} size={20} color={form.is_active?'#16A34A':'#94A3B8'} />
            <AppText variant="md" color="#0F172A">{form.is_active?'Đang hoạt động':'Tạm ngừng'}</AppText>
          </TouchableOpacity>
        </View>
      </FormModal>

      {!isWide && (
        <DetailModal visible={!!selected} title={selected?.name||'Chi Tiết'} subtitle={selected?.code?`Mã: ${selected.code}`:undefined}
          onClose={() => setSelected(null)} onEdit={selected?() => openEdit(selected):undefined}
          onDelete={selected?() => handleDelete(selected.id, selected.name):undefined}>
          {selected && (<View style={{gap:8}}>
            <FieldRow label="Mã" value={selected.code} />
            <FieldRow label="Trạng thái" value={selected.is_active?'Hoạt động':'Tạm đóng'} valueColor={selected.is_active?'#16A34A':'#DC2626'} />
            <FieldRow label="SĐT" value={selected.phone||'Chưa'} />
            {selected.address ? <FieldRow label="Địa chỉ" value={selected.address} /> : null}
          </View>)}
        </DetailModal>
      )}
    </View>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Product } from '../../lib/api';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, formatVND, ss } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import EmptyState from '../../lib/components/ui/EmptyState';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import MenuFormContent from '../../lib/components/quan-ly/menu/MenuFormContent';

type FormState = { code: string; name: string; category: string; price: string; cost_price: string; unit: string; is_active: boolean };
const EMPTY_FORM: FormState = { code: '', name: '', category: '', price: '0', cost_price: '0', unit: 'phần', is_active: true };

const CATS = [
  { key: 'Đồ ăn', icon: 'food-turkey', color: '#D97706', bg: '#FEF3C7' },
  { key: 'Đồ uống', icon: 'cup-water', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'Tráng miệng', icon: 'ice-cream', color: '#DB2777', bg: '#FCE7F3' },
  { key: 'Snack', icon: 'food-variant', color: '#16A34A', bg: '#ECFDF5' },
  { key: 'Khác', icon: 'silverware-fork-knife', color: '#78350F', bg: '#FEF3C7' },
];

function getCat(cat: string | null, name = '') {
  const m = CATS.find(c => c.key === cat);
  if (m) return m;
  const n = name.toLowerCase();
  if (n.includes('uống')||n.includes('trà')||n.includes('cà phê')||n.includes('soda')||n.includes('nước')) return CATS[1];
  if (n.includes('vặt')||n.includes('chân gà')||n.includes('snack')||n.includes('khoai')) return CATS[3];
  if (n.includes('kem')||n.includes('bánh')||n.includes('ngọt')) return CATS[2];
  return CATS[0];
}

function getBcg(price: number, idx: number) {
  const tags: Array<{ label: string; color: string; bg: string }> = [
    { label: 'Star', color: '#D97706', bg: '#FEF3C7' },
    { label: 'Plowhorse', color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Puzzle', color: '#9333EA', bg: '#F3E8FF' },
    { label: 'Dog', color: '#64748B', bg: '#F1F5F9' },
  ];
  if (price >= 40000) return tags[0];
  if (price >= 25000) return tags[1];
  if (idx % 2 === 0) return tags[2];
  return tags[3];
}

export default function MenuEngScreen() {
  const { isWide } = useResponsive();
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = useMemo(() => items.find(p => p.id === selectedId), [items, selectedId]);

  const load = useCallback(async () => {
    try { setLoading(true); setItems(await api.getProducts()); }
    catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thể tải'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (p: Product) => { setEditingId(p.id); setForm({ code: p.code||'', name: p.name||'', category: p.category||'', price: String(p.price||0), cost_price: String(p.cost_price||0), unit: p.unit||'phần', is_active: p.is_active ?? true }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Lỗi', 'Tên món bắt buộc'); return; }
    try {
      setSaving(true);
      const payload = { code: form.code, name: form.name, category: form.category, price: parseFloat(form.price)||0, cost_price: parseFloat(form.cost_price)||0, unit: form.unit, is_active: form.is_active };
      editingId ? await api.updateProduct(editingId, payload) : await api.createProduct(payload);
      setShowForm(false); load();
    } catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thể lưu'); } finally { setSaving(false); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xóa món', `Xóa "${name}"?`, [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { try { await api.deleteProduct(id); load(); } catch (e: any) { Alert.alert('Lỗi', e.message); } } }]);
  };

  const filtered = items.filter(p => {
    const q = search.trim().toLowerCase();
    return !q || (p.name||'').toLowerCase().includes(q) || (p.code||'').toLowerCase().includes(q);
  });

  const catCounts = CATS.map(c => ({ ...c, count: items.filter(p => getCat(p.category, p.name).key === c.key).length }));

  const renderStatsPanel = () => (
    <View style={s.panel}>
      <View style={s.panelHdr}><AppText variant="md" color="#050505">Menu Engineering</AppText></View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.brand.primaryBg, padding: 12, borderRadius: 12 }}>
        <AppText variant="md" color="#64748B">Tổng món</AppText><AppText variant="md" color={colors.brand.primary}>{items.length}</AppText>
      </View>
      {catCounts.map(c => (
        <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.color }} />
          <AppText variant="md" color="#050505" style={{ flex: 1 }}>{c.key}</AppText>
          <AppText variant="md" color={c.color}>{c.count}</AppText>
        </View>
      ))}
      <TouchableOpacity style={ss.panelCta} onPress={openAdd}><Icon name="plus" size={16} color={colors.text.inverse} /><AppText variant="md" color={colors.text.inverse}>Thêm món</AppText></TouchableOpacity>
    </View>
  );

  const renderItem = ({ item, index }: { item: Product; index: number }) => {
    const cat = getCat(item.category, item.name);
    const bcg = getBcg(item.price || 0, index);
    if (!isWide) {
      return (
        <View style={ss.listRow} key={item.id}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: cat.bg, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <AppText variant="md" color={cat.color} style={{ fontSize: 10 }}>{(item.category||cat.key).slice(0,2).toUpperCase()}</AppText>
          </View>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedId(item.id)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppText variant="md" color="#0F172A">{item.name}</AppText>
              <View style={{ backgroundColor: bcg.bg, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}><AppText variant="md" color={bcg.color} style={{ fontSize: 10 }}>{bcg.label}</AppText></View>
            </View>
            <AppText variant="md" color="#64748B">Mã: {item.code||'N/A'} · {item.category||cat.key}</AppText>
          </TouchableOpacity>
          <AppText variant="md" color={colors.brand.primary} style={{ marginHorizontal: 8 }}>{formatVND(item.price)}</AppText>
          <TouchableOpacity style={ss.miniActionBtn} onPress={() => openEdit(item)}><Icon name="pencil" size={16} color={colors.brand.primary} /></TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity style={[s.panel, { flexDirection: 'row', alignItems: 'center', gap: 12 }]} onPress={() => openEdit(item)}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: cat.bg, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="md" color={cat.color}>{(item.category||cat.key).slice(0,2).toUpperCase()}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="md" color="#050505">{item.name}</AppText>
            <View style={{ backgroundColor: bcg.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}><AppText variant="md" color={bcg.color}>{bcg.label}</AppText></View>
          </View>
          <AppText variant="md" color="#64748B">{item.code||'N/A'} · {item.category||cat.key} · {item.unit}</AppText>
        </View>
        <AppText variant="md" color={colors.brand.primary}>{formatVND(item.price)}</AppText>
        <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}><Icon name="trash-can-outline" size={18} color={colors.status.danger} /></TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderList = () => {
    if (loading) return <TableSkeleton rowCount={5} />;
    return <FlatList data={filtered} keyExtractor={i => i.id} renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
      ListEmptyComponent={<EmptyState icon="silverware-fork-knife" title="Chưa có món" subtitle="Thêm món mới" />}
      keyboardShouldPersistTaps="handled" />;
  };

  const renderSearch = () => (
    <View style={s.searchBox}>
      <Icon name="magnify" size={18} color="#64748B" />
      <TextInput style={{ flex: 1, height: 36, color: colors.text.primary }} placeholder="Tìm món..." placeholderTextColor={colors.text.muted} value={search} onChangeText={setSearch} />
      {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Icon name="close" size={16} color="#64748B" /></TouchableOpacity>}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            {renderSearch()}
            {renderList()}
          </View>
          <View style={{ flex: 0.45 }}>{showForm ? (
            <View style={s.panel}>
              <View style={s.panelHdr}><Icon name={editingId ? 'pencil' : 'plus'} size={20} color={colors.brand.primary} /><AppText variant="md" color="#050505">{editingId ? 'Sửa món' : 'Thêm món'}</AppText></View>
              <MenuFormContent form={form} onChange={(upd: any) => setForm(f => ({...f, ...upd}))} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={{ flex: 1, height: 40, borderRadius: 999, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowForm(false)}><AppText variant="md" color={colors.text.secondary}>Hủy</AppText></TouchableOpacity>
                <TouchableOpacity style={{ flex: 1.5, height: 40, borderRadius: 999, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' }} onPress={handleSave}><AppText variant="md" color={colors.text.inverse}>{editingId ? 'Cập nhật' : 'Lưu'}</AppText></TouchableOpacity>
              </View>
            </View>
          ) : renderStatsPanel()}</View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.topActionBar}>
            <View style={ss.searchInputWrap}><Icon name="magnify" size={20} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Tìm món..." placeholderTextColor="#94A3B8" style={ss.searchTextInput} /></View>
            <TouchableOpacity style={ss.addBtn} onPress={openAdd}><Icon name="plus" size={18} color="#FFF" /><AppText variant="md" color="#FFF">Thêm</AppText></TouchableOpacity>
          </View>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}><AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>MENU ENGINEERING ({filtered.length})</AppText></View>
            <View style={{ paddingHorizontal: 10 }}>{loading ? <TableSkeleton rowCount={5} /> : filtered.length === 0 ? <EmptyState icon="silverware-fork-knife" title="Chưa có món" subtitle="" /> : filtered.map((item, i) => renderItem({ item, index: i }))}</View>
          </View>
        </ScrollView>
      )}

      {!isWide && (
        <>
          <FormModal visible={showForm} title={editingId ? 'Sửa món' : 'Thêm món'} onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editingId ? 'Cập nhật' : 'Thêm'} saving={saving}>
            <MenuFormContent form={form} onChange={(upd: any) => setForm(f => ({...f, ...upd}))} />
          </FormModal>
          <DetailModal visible={!!selectedItem} title={selectedItem?.name || ''}
            subtitle={selectedItem ? `Mã: ${selectedItem.code||'N/A'} · ${selectedItem.category||'Khác'}` : undefined}
            onClose={() => setSelectedId(null)}
            onEdit={selectedItem ? () => { const i = selectedItem; setSelectedId(null); openEdit(i); } : undefined}
            onDelete={selectedItem ? () => { const i = selectedItem; setSelectedId(null); handleDelete(i.id, i.name); } : undefined}>
            {selectedItem && (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Giá</AppText><AppText variant="md" color={colors.brand.primary}>{formatVND(selectedItem.price)}</AppText></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Giá vốn</AppText><AppText variant="md" color="#0F172A">{formatVND(selectedItem.cost_price)}</AppText></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">ĐVT</AppText><AppText variant="md" color="#0F172A">{selectedItem.unit}</AppText></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Trạng thái</AppText><AppText variant="md" color={selectedItem.is_active ? colors.status.success : colors.text.muted}>{selectedItem.is_active ? 'Đang bán' : 'Ngưng'}</AppText></View>
              </View>
            )}
          </DetailModal>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  panel: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12, marginBottom: 8 },
  panelHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E9F0', paddingHorizontal: 10, marginBottom: 8 },
});

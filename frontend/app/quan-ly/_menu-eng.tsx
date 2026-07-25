import React, { useCallback, useEffect, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import { ASSETS } from '../../lib/assets';
import MenuFormContent from '../../lib/components/quan-ly/menu/MenuFormContent';
import type { Product } from '../../lib/api';
import AppText from '../../lib/components/ui/AppText';

type FormState = {
  code: string; name: string; category: string; price: string;
  cost_price: string; unit: string; is_active: boolean;
};

const EMPTY_FORM: FormState = {
  code: '', name: '', category: '', price: '0',
  cost_price: '0', unit: 'serving', is_active: true,
};

const CATEGORIES = [
  { key: 'Food', icon: 'food', color: '#D97706', bg: '#FEF3C7' },
  { key: 'Drinks', icon: 'cup-water', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'Desserts', icon: 'ice-cream', color: '#DB2777', bg: '#FCE7F3' },
  { key: 'Snack', icon: 'candy', color: '#16A34A', bg: '#ECFDF5' },
  { key: 'Other', icon: 'dots-horizontal', color: '#737373', bg: colors.surface.app },
];

function getCatStyle(cat: string | null) {
  return CATEGORIES.find(c => c.key === cat) ?? CATEGORIES[4];
}

export default function MenuEngScreen() {
  const { isWide } = useResponsive();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    try { setLoading(true); const d = await api.getQuanLyProducts(); setProducts(d); }
    catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thể tải danh sách thực đơn'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ code: p.code, name: p.name, category: p.category ?? '', price: String(p.price), cost_price: String(p.cost_price), unit: p.unit, is_active: p.is_active });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) { Alert.alert('Lỗi', 'Mã và tên món là bắt buộc'); return; }
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0, cost_price: parseFloat(form.cost_price) || 0 };
      if (editingId) await api.updateProduct(editingId, payload); else await api.createProduct(payload);
      setShowForm(false); setForm(EMPTY_FORM); load();
    } catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thể lưu món'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xác nhận xoá', `Xoá món "${name}" khỏi thực đơn?`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => { try { await api.deleteProduct(id); load(); } catch (e: any) { Alert.alert('Lỗi', e.message); } } },
    ]);
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const renderStatsPanel = () => {
    const catCounts = CATEGORIES.map(c => ({ ...c, count: products.filter(p => (p.category || 'Other') === c.key).length }));
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="silverware" size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Thống kê nhóm món Menu BCG</AppText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="sm" color={colors.text.muted}>Tổng số món ăn</AppText>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>{products.length} món</AppText>
        </View>
        <View style={styles.panelDivider} />
        {catCounts.map(c => (
          <TouchableOpacity key={c.key} style={[styles.catRow, catFilter === c.key && { backgroundColor: colors.brand.primaryBg }]} onPress={() => setCatFilter(catFilter === c.key ? null : c.key)}>
            <View style={[styles.catDot, { backgroundColor: c.color }]} />
            <AppText variant="sm" color={colors.text.primary} style={{ flex: 1 }}>{c.key}</AppText>
            <AppText variant="sm" weight="bold" color={c.color}>{c.count}</AppText>
            {catFilter === c.key && <Icon name="check" size={14} color={colors.brand.primary} />}
          </TouchableOpacity>
        ))}
        <View style={styles.panelDivider} />
        <TouchableOpacity style={styles.panelCta} onPress={openAdd}>
          <Icon name="plus" size={16} color={colors.text.inverse} />
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm món mới</AppText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderInlineForm = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>{editingId ? 'Chỉnh sửa món' : 'Thêm món mới'}</AppText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
        <MenuFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} />
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <TouchableOpacity
          style={[styles.panelBtn, { backgroundColor: colors.surface.app, flex: 1, justifyContent: 'center' }]}
          onPress={() => setShowForm(false)}
        >
          <AppText variant="sm" color={colors.text.primary}>Huỷ</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.panelBtn, { backgroundColor: colors.brand.primary, flex: 1.5, justifyContent: 'center' }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>{editingId ? 'Cập nhật' : 'Lưu món'}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Product }) => {
    const cat = getCatStyle(item.category);
    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
          <View style={[styles.codeTag, { backgroundColor: cat.bg }]}>
            <AppText variant="sm" weight="bold" color={cat.color}>{item.code}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{item.name}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                <Icon name={cat.icon as any} size={10} color={cat.color} />
                <AppText variant="sm" color={cat.color}>{item.category || 'Khác'}</AppText>
              </View>
              <AppText variant="sm" color={colors.text.muted}>{item.unit}</AppText>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(item.price)}</AppText>
          <View style={[styles.activeDot, { backgroundColor: item.is_active ? colors.status.success : colors.icon.muted }]} />
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn} hitSlop={8}>
            <Icon name="trash-can-outline" size={16} color={colors.status.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearch = () => (
    <View style={styles.searchBox}>
      <Icon name="magnify" size={18} color={colors.icon.muted} />
      <TextInput style={styles.searchInput} placeholder="Tìm món theo tên hoặc mã..." placeholderTextColor={colors.text.muted} value={search} onChangeText={setSearch} />
      {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Icon name="close" size={16} color={colors.icon.muted} /></TouchableOpacity>}
    </View>
  );

  const renderList = () => {
    if (loading) return <TableSkeleton rowCount={5} />;
    return (
      <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80, paddingTop: 4, gap: 8 }}
        ListHeaderComponent={renderSearch}
        ListEmptyComponent={<EmptyState image={ASSETS.images.emptyStateMenu} title="Chưa có món nào" subtitle="Nhấn + để thêm món đầu tiên" />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>{renderList()}</View>
          <View style={{ flex: 0.45 }}>
            {showForm ? renderInlineForm() : renderStatsPanel()}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          {renderList()}
        </View>
      )}
      {!isWide && <FAB onPress={openAdd} />}
      {!isWide && (
        <FormModal visible={showForm} title={editingId ? 'Sửa món' : 'Thêm món mới'}
          onClose={() => setShowForm(false)}
          onSave={handleSave} saveLabel={editingId ? 'Cập nhật' : 'Thêm mới'} saving={saving}>
          <MenuFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} />
        </FormModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, paddingHorizontal: 10, height: 44, marginBottom: 8 },
  searchInput: { flex: 1, ...font.md, color: colors.text.primary, paddingVertical: 0 },
  card: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: shape.radius.sm },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 1, borderRadius: shape.radius.sm },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  deleteBtn: { padding: 4 },
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: shape.radius.md },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, height: 44 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: shape.radius.md },
});

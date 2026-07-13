import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import { ASSETS } from '../../lib/assets';
import MenuFormContent from '../../lib/components/quan-ly/menu/MenuFormContent';
import type { Product } from '../../lib/api';

type FormState = {
  code: string; name: string; category: string; price: string;
  cost_price: string; unit: string; is_active: boolean;
};

const EMPTY_FORM: FormState = {
  code: '', name: '', category: '', price: '0',
  cost_price: '0', unit: 'phần', is_active: true,
};

const CATEGORIES = [
  { key: 'Đồ ăn', icon: 'food', color: '#D97706', bg: '#FEF3C7' },
  { key: 'Đồ uống', icon: 'cup-water', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'Tráng miệng', icon: 'ice-cream', color: '#DB2777', bg: '#FCE7F3' },
  { key: 'Snack', icon: 'candy', color: '#16A34A', bg: '#F0FDF4' },
  { key: 'Khác', icon: 'dots-horizontal', color: '#64748B', bg: '#F1F5F9' },
];

function getCatStyle(cat: string | null) {
  return CATEGORIES.find(c => c.key === cat) ?? CATEGORIES[4];
}

function formatVND(v: number) { return v.toLocaleString('vi-VN') + 'đ'; }

export default function MenuScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
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
    catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thể tải món'); }
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
    if (!form.code.trim() || !form.name.trim()) { Alert.alert('Lỗi', 'Mã và tên món không được để trống'); return; }
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0, cost_price: parseFloat(form.cost_price) || 0 };
      if (editingId) await api.updateProduct(editingId, payload); else await api.createProduct(payload);
      setShowForm(false); setForm(EMPTY_FORM); load();
    } catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thể lưu'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xác nhận xóa', `Xóa món "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { try { await api.deleteProduct(id); load(); } catch (e: any) { Alert.alert('Lỗi', e.message); } } },
    ]);
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  });

  // ── Stats Panel (iPad right) ──
  const renderStatsPanel = () => {
    const catCounts = CATEGORIES.map(c => ({ ...c, count: products.filter(p => (p.category || 'Khác') === c.key).length }));
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="silverware" size={18} color={colors.brand.primary} />
          <Text style={styles.panelHeaderText}>Thực đơn</Text>
        </View>
        <View style={styles.panelStatRow}>
          <Text style={styles.panelStatLabel}>Tổng món</Text>
          <Text style={styles.panelStatValue}>{products.length}</Text>
        </View>
        <View style={styles.panelDivider} />
        {catCounts.map(c => (
          <TouchableOpacity key={c.key} style={[styles.catRow, catFilter === c.key && { opacity: 1 }]} onPress={() => setCatFilter(catFilter === c.key ? null : c.key)}>
            <View style={[styles.catDot, { backgroundColor: c.color }]} />
            <Text style={styles.catLabel}>{c.key}</Text>
            <Text style={[styles.catCount, { color: c.color }]}>{c.count}</Text>
            {catFilter === c.key && <Icon name="check" size={14} color={colors.brand.primary} />}
          </TouchableOpacity>
        ))}
        <View style={styles.panelDivider} />
        <TouchableOpacity style={styles.panelCta} onPress={openAdd}>
          <Icon name="plus" size={14} color="#fff" />
          <Text style={styles.panelCtaText}>Thêm món</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderInlineForm = () => {
    return (
      <View style={[styles.panelBox, { flex: 1, marginHorizontal: 12 }]}>
        <View style={styles.panelHeader}>
          <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={colors.brand.primary} />
          <Text style={styles.panelHeaderText}>{editingId ? 'Chỉnh sửa món' : 'Thêm món mới'}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 10 }}>
          <MenuFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} />
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, minHeight: 44, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowForm(false)}
          >
            <Text style={{ ...font.button, color: colors.text.secondary }}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1.5, minHeight: 44, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
            onPress={handleSave}
            disabled={saving}
          >
            {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
            <Text style={{ ...font.button, color: colors.text.inverse }}>{editingId ? 'Cập nhật' : 'Lưu'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Product Item ──
  const renderItem = ({ item }: { item: Product }) => {
    const cat = getCatStyle(item.category);
    return (
      <TouchableOpacity style={styles.item} onPress={() => openEdit(item)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
          <View style={[styles.codeTag, { backgroundColor: cat.bg }]}>
            <Text style={[styles.codeText, { color: cat.color }]}>{item.code}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                <Icon name={cat.icon as any} size={10} color={cat.color} />
                <Text style={[styles.catText, { color: cat.color }]}>{item.category || 'Khác'}</Text>
              </View>
              <Text style={styles.metaText}>{item.unit}</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.priceText}>{formatVND(item.price)}</Text>
          <View style={[styles.activeDot, { backgroundColor: item.is_active ? colors.status.success : '#CBD5E1' }]} />
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn} hitSlop={8}>
            <Icon name="trash-can-outline" size={18} color={colors.status.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearch = () => (
    <View style={styles.searchWrap}>
      <Icon name="magnify" size={18} color="#94A3B8" />
      <TextInput style={styles.searchInput} placeholder="Tìm theo tên, mã món..." placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
      {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Icon name="close" size={16} color="#94A3B8" /></TouchableOpacity>}
    </View>
  );

  const renderList = () => {
    if (loading) return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
    return (
      <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        ListHeaderComponent={renderSearch}
        ListEmptyComponent={<EmptyState image={ASSETS.images.emptyStateMenu} title="Chưa có món nào" subtitle="Nhấn + để thêm món đầu tiên" />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Quản lý món"
        subtitle={`${products.length} món`}
        showBack
        onMenuPress={openSidebar}
        onBackPress={() => router.back()}
        right={isWide ? (
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Thêm</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Thêm</Text>
          </TouchableOpacity>
        )}
      />
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingVertical: 12 }}>
          <View style={{ flex: 0.55 }}>{renderList()}</View>
          <View style={styles.separator} />
          <View style={{ flex: 0.45 }}>
            {showForm ? renderInlineForm() : renderStatsPanel()}
          </View>
        </View>
      ) : renderList()}
      {!isWide && <FAB onPress={openAdd} />}
      {!isWide && (
        <FormModal visible={showForm} title={editingId ? 'Chỉnh sửa món' : 'Thêm món mới'}
          onClose={() => setShowForm(false)}
          onSave={handleSave} saveLabel={editingId ? 'Cập nhật' : 'Thêm món'} saving={saving}>
          <MenuFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} />
        </FormModal>
      )}
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 44, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.inverse },

  /* Right panel */
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 10, boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 3 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  panelStatLabel: { ...font.caption, color: colors.text.muted },
  panelStatValue: { ...font.h2, fontWeight: '900', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light, marginVertical: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 4, borderRadius: shape.radius.md },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { flex: 1, ...font.bodySmall, color: colors.text.primary },
  catCount: { ...font.bodySmall, fontWeight: '700' },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingVertical: 12, minHeight: 44, marginTop: 4 },
  panelCtaText: { ...font.button, color: colors.text.inverse },

  /* Search */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface.card, marginHorizontal: 12, marginBottom: 8,
    borderRadius: shape.radius.lg, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border.light,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 3,
  },
  searchInput: { flex: 1, ...font.body, color: colors.text.primary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  loadingText: { ...font.bodySmall, color: colors.text.secondary },

  /* Item card */
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface.card, marginHorizontal: 12, marginBottom: 8,
    borderRadius: shape.radius.lg, padding: 14,
    borderWidth: 1, borderColor: colors.border.light,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 3,
  },
  codeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: shape.radius.sm },
  codeText: { ...font.caption, fontWeight: '700' },
  itemName: { ...font.bodySmall, fontWeight: '600', color: colors.text.primary },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: shape.radius.full },
  catText: { ...font.micro, fontWeight: '700' },
  metaText: { ...font.caption, color: colors.text.secondary },
  priceText: { ...font.price, color: colors.brand.primary },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  deleteBtn: { padding: 4 },

  separator: { width: 1, backgroundColor: colors.border.light },
});

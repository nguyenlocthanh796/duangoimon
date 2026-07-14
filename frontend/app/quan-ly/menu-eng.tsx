import { useCallback, useEffect, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api } from '../../lib/api';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
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
  cost_price: '0', unit: 'serving', is_active: true,
};

const CATEGORIES = [
  { key: 'Food', icon: 'food', color: '#D97706', bg: '#FEF3C7' },
  { key: 'Drinks', icon: 'cup-water', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'Desserts', icon: 'ice-cream', color: '#DB2777', bg: '#FCE7F3' },
  { key: 'Snack', icon: 'candy', color: '#16A34A', bg: '#16A34A' },
  { key: 'Other', icon: 'dots-horizontal', color: '#737373', bg: '#F1F5F9' },
];

function getCatStyle(cat: string | null) {
  return CATEGORIES.find(c => c.key === cat) ?? CATEGORIES[4];
}

function formatVND(v: number) { return v.toLocaleString('en-US', { style: 'currency', currency: 'VND' }); }

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
    catch (e: any) { Alert.alert('Error', e.message || 'Failed to load menu'); }
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
    if (!form.code.trim() || !form.name.trim()) { Alert.alert('Error', 'Code and name cannot be empty'); return; }
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0, cost_price: parseFloat(form.cost_price) || 0 };
      if (editingId) await api.updateProduct(editingId, payload); else await api.createProduct(payload);
      setShowForm(false); setForm(EMPTY_FORM); load();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Confirm Delete', `Delete item "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.deleteProduct(id); load(); } catch (e: any) { Alert.alert('Error', e.message); } } },
    ]);
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || p.category === catFilter;
    return matchSearch && matchCat;
  });

  // ── Stats Panel (iPad right) ──
  const renderStatsPanel = () => {
    const catCounts = CATEGORIES.map(c => ({ ...c, count: products.filter(p => (p.category || 'Other') === c.key).length }));
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="silverware" size={18} color={'#F97316'} />
          <Text style={styles.panelHeaderText}>Menu</Text>
        </View>
        <View style={styles.panelStatRow}>
          <Text style={styles.panelStatLabel}>Total Items</Text>
          <Text style={styles.panelStatValue}>{products.length}</Text>
        </View>
        <View style={styles.panelDivider} />
        {catCounts.map(c => (
          <TouchableOpacity key={c.key} style={[styles.catRow, catFilter === c.key && { opacity: 1 }]} onPress={() => setCatFilter(catFilter === c.key ? null : c.key)}>
            <View style={[styles.catDot, { backgroundColor: c.color }]} />
            <Text style={styles.catLabel}>{c.key}</Text>
            <Text style={[styles.catCount, { color: c.color }]}>{c.count}</Text>
            {catFilter === c.key && <Icon name="check" size={14} color={'#F97316'} />}
          </TouchableOpacity>
        ))}
        <View style={styles.panelDivider} />
        <TouchableOpacity style={styles.panelCta} onPress={openAdd}>
          <Icon name="plus" size={14} color="#fff" />
          <Text style={styles.panelCtaText}>Add Item</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderInlineForm = () => {
    return (
      <View style={[styles.panelBox, { flex: 1, marginHorizontal: 12 }]}>
        <View style={styles.panelHeader}>
          <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={'#F97316'} />
          <Text style={styles.panelHeaderText}>{editingId ? 'Edit Item' : 'New Item'}</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 10 }}>
          <MenuFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} />
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 32, marginTop: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, minHeight: 44, borderRadius: 8, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowForm(false)}
          >
            <Text style={{ ...font.button, color: '#404040' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1.5, minHeight: 44, borderRadius: 8, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12}}
            onPress={handleSave}
            disabled={saving}
          >
            {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
            <Text style={{ ...font.button, color: colors.text.inverse }}>{editingId ? 'Update' : 'Save'}</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 32}}>
          <View style={[styles.codeTag, { backgroundColor: cat.bg }]}>
            <Text style={[styles.codeText, { color: cat.color }]}>{item.code}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
              <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                <Icon name={cat.icon as any} size={10} color={cat.color} />
                <Text style={[styles.catText, { color: cat.color }]}>{item.category || 'Other'}</Text>
              </View>
              <Text style={styles.metaText}>{item.unit}</Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16}}>
          <Text style={styles.priceText}>{formatVND(item.price)}</Text>
          <View style={[styles.activeDot, { backgroundColor: item.is_active ? '#16A34A' : '#CBD5E1' }]} />
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn} hitSlop={8}>
            <Icon name="trash-can-outline" size={18} color={'#DC2626'} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearch = () => (
    <View style={styles.searchWrap}>
      <Icon name="magnify" size={18} color={'#737373'} />
      <TextInput style={styles.searchInput} placeholder="Search by name, code..." placeholderTextColor={'#737373'} value={search} onChangeText={setSearch} />
      {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Icon name="close" size={16} color={'#737373'} /></TouchableOpacity>}
    </View>
  );

  const renderList = () => {
    if (loading) return (
      <View style={styles.center}>
        <TableSkeleton rowCount={5} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
    return (
      <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        ListHeaderComponent={renderSearch}
        ListEmptyComponent={<EmptyState image={ASSETS.images.emptyStateMenu} title="No items yet" subtitle="Tap + to add your first item" />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader
        title="Menu Management"
        subtitle={`${products.length} items`}
        showBack
        onMenuPress={openSidebar}
        onBackPress={() => router.back()}
        compact
        right={
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.55 }}>{renderList()}</View>
          <View style={styles.separator} />
          <View style={{ flex: 0.45 }}>
            {showForm ? renderInlineForm() : renderStatsPanel()}
          </View>
        </View>
      ) : renderList()}
      {!isWide && <FAB onPress={openAdd} />}
      {!isWide && (
        <FormModal visible={showForm} title={editingId ? 'Edit Item' : 'New Item'}
          onClose={() => setShowForm(false)}
          onSave={handleSave} saveLabel={editingId ? 'Update' : 'Add Item'} saving={saving}>
          <MenuFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} />
        </FormModal>
      )}
    </ScreenContainer>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 44, borderRadius: 8, backgroundColor: '#F97316' },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.inverse },

  /* Right panel */
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 32, boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 3 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.body, fontWeight: '600', color: '#171717' },
  panelStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8},
  panelStatLabel: { ...font.caption, color: '#737373' },
  panelStatValue: { ...font.sectionTitle, fontWeight: '600', color: '#171717' },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 32, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8},
  catDot: { width: 8, height: 8, borderRadius: 12},
  catLabel: { flex: 1, ...font.bodySmall, color: '#171717' },
  catCount: { ...font.bodySmall, fontWeight: '600' },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#F97316', borderRadius: 8, paddingVertical: 12, minHeight: 44, marginTop: 4 },
  panelCtaText: { ...font.button, color: colors.text.inverse },

  /* Search */
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#FFFFFF', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 32,
    borderWidth: 1, borderColor: '#F0F0F0',
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 3,
  },
  searchInput: { flex: 1, ...font.body, color: '#171717' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16},
  loadingText: { ...font.bodySmall, color: '#404040' },

  /* Item card */
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#F0F0F0',
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 3,
  },
  codeTag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4},
  codeText: { ...font.caption, fontWeight: '600' },
  itemName: { ...font.bodySmall, fontWeight: '600', color: '#171717' },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999},
  catText: { ...font.micro, fontWeight: '600' },
  metaText: { ...font.caption, color: '#404040' },
  priceText: { ...font.price, color: '#F97316' },
  activeDot: { width: 8, height: 8, borderRadius: 12},
  deleteBtn: { padding: 4 },

  separator: { width: 1, backgroundColor: '#F0F0F0' },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Product } from '../../lib/api';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import AppText from '../../lib/components/ui/AppText';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import MenuFormContent from '../../lib/components/quan-ly/menu/MenuFormContent';

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
  { key: 'Snack', icon: 'candy', color: '#16A34A', bg: '#ECFDF5' },
  { key: 'Khác', icon: 'dots-horizontal', color: '#737373', bg: '#F1F5F9' },
];

function getCatStyle(cat: string | null) {
  return CATEGORIES.find(c => c.key === cat) ?? CATEGORIES[4];
}

function generateFallbackProducts(): Product[] {
  return [
    { id: 'p1', code: 'SP01', name: 'Phở Bò Đặc Biệt', category: 'Đồ ăn', price: 65000, cost_price: 25000, unit: 'Tô', is_active: true },
    { id: 'p2', code: 'SP02', name: 'Cà Phê Sữa Đá Sài Gòn', category: 'Đồ uống', price: 35000, cost_price: 12000, unit: 'Ly', is_active: true },
    { id: 'p3', code: 'SP03', name: 'Trà Đào Cam Sả', category: 'Đồ uống', price: 45000, cost_price: 15000, unit: 'Ly', is_active: true },
    { id: 'p4', code: 'SP04', name: 'Bánh Mì Thịt Nướng', category: 'Đồ ăn', price: 30000, cost_price: 10000, unit: 'Ổ', is_active: true },
    { id: 'p5', code: 'SP05', name: 'Kem Matcha Dừa', category: 'Tráng miệng', price: 40000, cost_price: 14000, unit: 'Ly', is_active: true },
    { id: 'p6', code: 'SP06', name: 'Snack Khoai Tây Phô Mai', category: 'Snack', price: 25000, cost_price: 8000, unit: 'Gói', is_active: true },
  ] as Product[];
}

export default function MenuScreen() {
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
    try {
      setLoading(true);
      const d = await api.getProducts();
      if (Array.isArray(d) && d.length > 0) {
        setProducts(d);
      } else {
        setProducts(generateFallbackProducts());
      }
    } catch {
      setProducts(generateFallbackProducts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      code: p.code || '',
      name: p.name || '',
      category: p.category || '',
      price: String(p.price || 0),
      cost_price: String(p.cost_price || 0),
      unit: p.unit || 'phần',
      is_active: p.is_active ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Tên món ăn không được để trống');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        code: form.code,
        name: form.name,
        category: form.category,
        price: parseFloat(form.price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        unit: form.unit,
        is_active: form.is_active,
      };
      if (editingId) {
        await api.updateProduct(editingId, payload);
      } else {
        await api.createProduct(payload);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu thông tin món');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa món "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteProduct(id);
            load();
          } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Không thể xóa món');
          }
        },
      },
    ]);
  };

  const filtered = products.filter(p => {
    const matchCat = catFilter ? p.category === catFilter : true;
    const q = search.trim().toLowerCase();
    const matchQ = !q || (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const catCounts = CATEGORIES.map(c => ({
    ...c,
    count: products.filter(p => p.category === c.key).length,
  }));

  const avgPrice = useMemo(() => {
    if (products.length === 0) return 0;
    return Math.round(products.reduce((s, p) => s + (p.price || 0), 0) / products.length);
  }, [products]);

  // ── Right Panel on Wide Screen ──
  const renderStatsPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="silverware-fork-knife" size={20} color={colors.brand.primary} />
        <AppText variant="md" weight="bold" color="#050505">Thống Kê Thực Đơn Món Ăn</AppText>
      </View>
      <View style={styles.panelStatRow}>
        <AppText variant="sm" color="#65676B">Tổng số món ăn trong menu</AppText>
        <AppText variant="md" weight="bold" color={colors.brand.primary}>{products.length} món</AppText>
      </View>
      <View style={styles.panelStatRow}>
        <AppText variant="sm" color="#65676B">Giá bán trung bình</AppText>
        <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(avgPrice)}</AppText>
      </View>
      <View style={styles.panelDivider} />
      <AppText variant="sm" weight="bold" color="#050505" style={{ marginTop: 4 }}>Phân loại theo nhóm món</AppText>
      {catCounts.map(c => (
        <TouchableOpacity key={c.key} style={styles.catRow} onPress={() => setCatFilter(catFilter === c.key ? null : c.key)}>
          <View style={[styles.catDot, { backgroundColor: c.color }]} />
          <AppText variant="sm" color="#050505" style={{ flex: 1 }}>{c.key}</AppText>
          <AppText variant="sm" weight="bold" color={c.color}>{c.count} món</AppText>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.panelCta} onPress={openNew}>
        <Icon name="plus" size={16} color={colors.text.inverse} />
        <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm món ăn mới</AppText>
      </TouchableOpacity>
    </View>
  );

  const renderInlineForm = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name={editingId ? "pencil" : "plus-circle"} size={20} color={colors.brand.primary} />
        <AppText variant="md" weight="bold" color="#050505">
          {editingId ? 'Chỉnh Sửa Thông Tin Món' : 'Thêm Món Ăn Mới'}
        </AppText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 10 }}>
        <MenuFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} />
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <TouchableOpacity
          style={{ flex: 1, height: 44, borderRadius: 999, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setShowForm(false)}
        >
          <AppText variant="sm" color={colors.text.secondary}>Hủy</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1.5, height: 44, borderRadius: 999, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
          onPress={handleSave}
          disabled={saving}
        >
          {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>
            {editingId ? 'Cập nhật' : 'Lưu món'}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Product Item Card ──
  const renderItem = ({ item }: { item: Product }) => {
    const cat = getCatStyle(item.category);

    if (!isWide) {
      // 📱 Facebook Mobile Feed Card (Full Width)
      return (
        <View style={styles.itemMobile}>
          <TouchableOpacity style={styles.cardHeaderRow} onPress={() => openEdit(item)} activeOpacity={0.8}>
            <View style={[styles.avatarCircle, { backgroundColor: cat.bg }]}>
              <Icon name={cat.icon as any} size={20} color={cat.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{item.name}</AppText>
                <View style={[styles.activeDotSmall, { backgroundColor: item.is_active ? colors.status.success : colors.text.muted }]} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <AppText variant="sm" color="#65676B">Mã: {item.code || 'N/A'}</AppText>
                <AppText variant="sm" color="#65676B">·</AppText>
                <AppText variant="sm" color={cat.color}>{item.category || 'Khác'}</AppText>
                <AppText variant="sm" color="#65676B">· {item.unit}</AppText>
              </View>
            </View>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(item.price)}</AppText>
          </TouchableOpacity>

          <View style={styles.cardActionDivider} />

          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
            <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => openEdit(item)}>
              <Icon name="pencil" size={14} color={colors.brand.primary} />
              <AppText variant="sm" weight="bold" color={colors.brand.primary}>Chỉnh sửa</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.panelBtnDanger} onPress={() => handleDelete(item.id, item.name)}>
              <Icon name="trash-can-outline" size={14} color={colors.status.danger} />
              <AppText variant="sm" weight="bold" color={colors.status.danger}>Xóa</AppText>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // 💻 Wide Screen Item Card
    return (
      <TouchableOpacity style={styles.itemWide} onPress={() => openEdit(item)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
          <View style={[styles.codeTag, { backgroundColor: cat.bg }]}>
            <AppText variant="sm" weight="bold" color={cat.color}>{item.code}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{item.name}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                <Icon name={cat.icon as any} size={10} color={cat.color} />
                <AppText variant="sm" color={cat.color}>{item.category || 'Khác'}</AppText>
              </View>
              <AppText variant="sm" color={colors.text.muted}>{item.unit}</AppText>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(item.price)}</AppText>
          <View style={[styles.activeDotSmall, { backgroundColor: item.is_active ? colors.status.success : colors.text.muted }]} />
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn} hitSlop={8}>
            <Icon name="trash-can-outline" size={18} color={colors.status.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearch = () => (
    <View style={styles.searchWrap}>
      <Icon name="magnify" size={18} color={colors.icon.muted} />
      <TextInput
        style={styles.searchInput}
        placeholder="Tìm món theo tên hoặc mã món..."
        placeholderTextColor={colors.text.muted}
        value={search}
        onChangeText={setSearch}
      />
      {search.length > 0 && (
        <TouchableOpacity onPress={() => setSearch('')}>
          <Icon name="close" size={16} color={colors.icon.muted} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCategoryPills = () => (
    <View style={{ marginVertical: 4, marginBottom: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        <TouchableOpacity
          onPress={() => setCatFilter(null)}
          style={[styles.chip, !catFilter && styles.chipActive]}
        >
          <Icon name="grid" size={14} color={!catFilter ? colors.brand.primary : '#65676B'} />
          <AppText variant="sm" weight={!catFilter ? "bold" : "normal"} color={!catFilter ? colors.brand.primary : "#050505"}>
            Tất cả {products.length}
          </AppText>
        </TouchableOpacity>
        {catCounts.map(c => {
          const active = catFilter === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setCatFilter(active ? null : c.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Icon name={c.icon as any} size={14} color={active ? colors.brand.primary : c.color} />
              <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                {c.key} {c.count}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderList = () => {
    if (loading) return (
      <View style={styles.center}>
        <TableSkeleton rowCount={5} />
        <AppText variant="sm" color={colors.text.muted}>Đang tải thực đơn...</AppText>
      </View>
    );
    return (
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 4 }}
        ListHeaderComponent={
          <>
            {renderSearch()}
            {renderCategoryPills()}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="food-off"
            title="Chưa có món ăn nào"
            subtitle="Nhấn nút + bên dưới để thêm món đầu tiên"
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{products.length} món ăn</AppText>
          <TouchableOpacity onPress={openNew} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm món</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* 📊 Native App Style KPI Widget Cards Strip */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="food" size={20} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{products.length} món</AppText>
            <AppText variant="sm" color="#65676B">Tổng thực đơn</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="tag-text" size={20} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(avgPrice)}</AppText>
            <AppText variant="sm" color="#65676B">Giá trung bình</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="shape" size={20} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#2563EB">{CATEGORIES.length} nhóm</AppText>
            <AppText variant="sm" color="#65676B">Danh mục món</AppText>
          </View>
        </View>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>{renderList()}</View>
          <View style={{ flex: 0.45 }}>
            {showForm ? renderInlineForm() : renderStatsPanel()}
          </View>
        </View>
      ) : renderList()}

      {!isWide && <FAB onPress={openNew} />}
      {!isWide && (
        <FormModal
          visible={showForm}
          title={editingId ? 'Chỉnh sửa món' : 'Thêm món mới'}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
          saveLabel={editingId ? 'Cập nhật' : 'Thêm món'}
          saving={saving}
        >
          <MenuFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} />
        </FormModal>
      )}
    </View>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  /* Facebook Story Highlight Metric Cards Container */
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  fbMetricCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface.card,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fbMetricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface.card,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    ...font.md,
    color: colors.text.primary,
  },

  /* Filter pills */
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: colors.brand.primaryBg,
    borderColor: '#FFEDD5',
  },

  /* Item Cards */
  itemMobile: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginTop: 10,
  },
  panelBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },
  panelBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },

  itemWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deleteBtn: {
    padding: 6,
  },

  /* Right Panel */
  panelBox: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  panelStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  panelCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    borderRadius: 999,
    height: 44,
    marginTop: 4,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
});

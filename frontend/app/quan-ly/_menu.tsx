import React, { useCallback, useEffect, useState } from 'react';
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
      setProducts(d);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải danh sách thực đơn');
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

  // ── Right Panel on Wide Screen ──
  const renderStatsPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="silverware-fork-knife" size={20} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>Thống kê thực đơn</AppText>
      </View>
      <View style={styles.panelStatRow}>
        <AppText variant="sm" color={colors.text.secondary}>Tổng số món ăn</AppText>
        <AppText variant="md" weight="bold" color={colors.text.primary}>{products.length}</AppText>
      </View>
      <View style={styles.panelDivider} />
      <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginTop: 4 }}>Phân loại theo nhóm</AppText>
      {catCounts.map(c => (
        <TouchableOpacity key={c.key} style={styles.catRow} onPress={() => setCatFilter(catFilter === c.key ? null : c.key)}>
          <View style={[styles.catDot, { backgroundColor: c.color }]} />
          <AppText variant="sm" color={colors.text.primary} style={{ flex: 1 }}>{c.key}</AppText>
          <AppText variant="sm" weight="bold" color={c.color}>{c.count}</AppText>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.panelCta} onPress={openNew}>
        <Icon name="plus" size={16} color={colors.text.inverse} />
        <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm món mới</AppText>
      </TouchableOpacity>
    </View>
  );

  const renderInlineForm = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name={editingId ? "pencil" : "plus-circle"} size={20} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>
          {editingId ? 'Chỉnh sửa món' : 'Thêm món mới'}
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
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
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
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
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
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
  },
  chipActive: {
    backgroundColor: colors.brand.primaryBg,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    gap: 12,
  },

  /* 📱 Mobile Full-Width Facebook Feed Card Block */
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
    width: 6,
    height: 6,
    borderRadius: 3,
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

  /* 💻 Wide Screen Inset Item Card */
  itemWide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    padding: 12,
  },
  codeTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deleteBtn: { padding: 4 },

  /* Right panel */
  panelBox: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    gap: 16,
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
    paddingVertical: 4,
  },
  panelDivider: { height: 1, backgroundColor: colors.border.light, marginVertical: 4 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
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
});

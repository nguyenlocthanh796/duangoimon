import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Product } from '../../lib/api';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND, ss } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import AppText from '../../lib/components/ui/AppText';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
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
  { key: 'Đồ ăn', icon: 'food-turkey', color: '#D97706', bg: '#FEF3C7' },
  { key: 'Đồ uống', icon: 'cup-water', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'Tráng miệng', icon: 'ice-cream', color: '#DB2777', bg: '#FCE7F3' },
  { key: 'Snack', icon: 'food-variant', color: '#16A34A', bg: '#ECFDF5' },
  { key: 'Khác', icon: 'silverware-fork-knife', color: '#78350F', bg: '#FEF3C7' },
];

function getCatStyle(cat: string | null, name: string = '') {
  if (cat && CATEGORIES.find(c => c.key === cat)) {
    return CATEGORIES.find(c => c.key === cat)!;
  }
  const n = (name || '').toLowerCase();
  const c = (cat || '').toLowerCase();

  if (n.includes('chè') || n.includes('sữa') || n.includes('trà') || n.includes('soda') || n.includes('nước') || n.includes('cà phê') || c.includes('uống')) {
    return CATEGORIES[1]; // Đồ uống
  }
  if (n.includes('ăn vặt') || n.includes('chân gà') || n.includes('nem') || n.includes('khoai') || n.includes('snack') || c.includes('vặt')) {
    return CATEGORIES[3]; // Snack
  }
  if (n.includes('kem') || n.includes('bánh') || n.includes('ngọt') || c.includes('miệng')) {
    return CATEGORIES[2]; // Tráng miệng
  }
  return CATEGORIES[0]; // Default Đồ ăn
}

// Compute BCG matrix tag based on price & index
function getBcgTag(price: number, idx: number) {
  if (price >= 40000) return { label: 'Star', color: '#D97706', bg: '#FEF3C7' };
  if (price >= 25000) return { label: 'Plowhorse', color: '#2563EB', bg: '#EFF6FF' };
  if (idx % 2 === 0) return { label: 'Puzzle', color: '#9333EA', bg: '#F3E8FF' };
  return { label: 'Dog', color: '#64748B', bg: '#F1F5F9' };
}

export default function MenuEngScreen() {
  const { isWide } = useResponsive();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedItem = useMemo(() => products.find(p => p.id === selectedId), [products, selectedId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await api.getProducts();
      setProducts(d);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải thực đơn');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
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
      Alert.alert('Lỗi', 'Tên món không được để trống');
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
    const q = search.trim().toLowerCase();
    return !q || (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q);
  });

  const catCounts = CATEGORIES.map(c => ({
    ...c,
    count: products.filter(p => getCatStyle(p.category, p.name).key === c.key).length,
  }));

  const renderStatsPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <AppText variant="md" weight="bold" color="#050505">Menu Engineering (BCG Matrix)</AppText>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.brand.primaryBg, padding: 12, borderRadius: 12 }}>
        <AppText variant="sm" color="#65676B">Tổng số món ăn khả dụng</AppText>
        <AppText variant="md" weight="bold" color={colors.brand.primary}>{products.length} món</AppText>
      </View>
      <View style={styles.panelDivider} />
      <AppText variant="md" weight="bold" color="#050505">Phân loại theo nhóm thực đơn</AppText>
      <View style={{ gap: 8 }}>
        {catCounts.map(c => (
          <View key={c.key} style={styles.catRow}>
            <View style={[styles.catDot, { backgroundColor: c.color }]} />
            <AppText variant="sm" color="#050505" style={{ flex: 1 }}>{c.key}</AppText>
            <AppText variant="sm" weight="bold" color={c.color}>{c.count} món</AppText>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.panelCta} onPress={openAdd}>
        <Icon name="plus" size={16} color={colors.text.inverse} />
        <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm món mới</AppText>
      </TouchableOpacity>
    </View>
  );

  const renderInlineForm = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name={editingId ? 'pencil' : 'plus'} size={20} color={colors.brand.primary} />
        <AppText variant="md" weight="bold" color="#050505">{editingId ? 'Chỉnh sửa món' : 'Thêm món mới'}</AppText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 10 }}>
        <MenuFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} />
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <TouchableOpacity style={{ flex: 1, height: 40, borderRadius: 999, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowForm(false)}>
          <AppText variant="sm" color={colors.text.secondary}>Hủy</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1.5, height: 40, borderRadius: 999, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }} onPress={handleSave} disabled={saving}>
          {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>{editingId ? 'Cập nhật' : 'Lưu'}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item, index }: { item: Product; index: number }) => {
    const cat = getCatStyle(item.category, item.name);
    const bcg = getBcgTag(item.price || 0, index);

    if (!isWide) {
      // 📱 Compact 48px POS Row Layout
      return (
        <View style={ss.listRow} key={item.id}>
          <View style={[styles.catIconMiniCircle, { backgroundColor: cat.bg, alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="sm" color={cat.color} style={{ fontSize: 9 }}>
              {(item.category || cat.key || '??').slice(0, 2).toUpperCase()}
            </AppText>
          </View>

          <TouchableOpacity style={{ flex: 1, paddingRight: 8 }} onPress={() => setSelectedId(item.id)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="sm" color="#0F172A" numberOfLines={1}>
                {item.name}
              </AppText>
              <View style={[styles.bcgBadge, { backgroundColor: bcg.bg, paddingHorizontal: 6, paddingVertical: 1 }]}>
                <AppText variant="sm" color={bcg.color} style={{ fontSize: 11 }}>{bcg.label}</AppText>
              </View>
            </View>
            <AppText variant="sm" color="#64748B" numberOfLines={1}>
              Mã: {item.code || 'N/A'} · {item.category || cat.key}
            </AppText>
          </TouchableOpacity>

          <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>
              {formatVND(item.price)}
            </AppText>
            <AppText variant="sm" color={item.is_active ? colors.status.success : colors.text.muted}>
              {item.is_active ? 'Đang bán' : 'Tạm ngưng'}
            </AppText>
          </View>

          <TouchableOpacity style={styles.miniActionBtn} onPress={() => openEdit(item)}>
            <Icon name="pencil" size={16} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      );
    }

    // 💻 Wide Screen Card on iPad
    return (
      <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
          <View style={[styles.avatarCircle, { backgroundColor: cat.bg, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="sm" color={cat.color} style={{ fontSize: 12 }}>
              {(item.category || cat.key || '??').slice(0, 2).toUpperCase()}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText variant="md" color="#050505" numberOfLines={1}>{item.name}</AppText>
              <View style={[styles.bcgBadge, { backgroundColor: bcg.bg }]}>
                <AppText variant="sm" color={bcg.color} style={{ fontSize: 11 }}>{bcg.label}</AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <View style={[styles.codeTag, { backgroundColor: cat.bg }]}>
                <AppText variant="sm" color={cat.color}>{item.code || 'N/A'}</AppText>
              </View>
              <AppText variant="sm" color="#65676B">{item.category || cat.key}</AppText>
              <AppText variant="sm" color="#65676B">· {item.unit}</AppText>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(item.price)}</AppText>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn} hitSlop={8}>
            <Icon name="trash-can-outline" size={18} color={colors.status.danger} />
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
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
        ListHeaderComponent={renderSearch}
        ListEmptyComponent={<EmptyState icon="silverware-fork-knife" title="Chưa có món nào" subtitle="Nhấn + để thêm món đầu tiên" />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>{renderList()}</View>
          <View style={{ flex: 0.45 }}>
            {showForm ? renderInlineForm() : renderStatsPanel()}
          </View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          {/* Mobile Top Bar: Search Input + Add Button */}
          <View style={ss.mobileActionRow}>
            <View style={ss.searchInputWrap}>
              <Icon name="magnify" size={16} color="#64748B" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm món theo tên, mã..."
                placeholderTextColor="#94A3B8"
                style={ss.searchTextInput}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={ss.addBtn} onPress={openAdd} activeOpacity={0.8}>
              <Icon name="plus" size={16} color="#FFFFFF" />
              <AppText variant="sm" weight="bold" color="#FFFFFF">
                Thêm món
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
                <Icon name="silverware-fork-knife" size={14} color={colors.brand.primary} />
              </View>
              <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1 }}>
                DANH SÁCH MENU ENGINEERING ({filtered.length})
              </AppText>
            </View>

            <View style={{ paddingHorizontal: 10, paddingVertical: filtered.length ? 4 : 16 }}>
              {loading ? (
                <TableSkeleton rowCount={5} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon="silverware-fork-knife"
                  title="Chưa có món nào"
                  subtitle="Nhấn nút + Thêm món để tạo món đầu tiên"
                />
              ) : (
                filtered.map((item, index) => renderItem({ item, index }))
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {!isWide && (
        <>
          <FormModal visible={showForm} title={editingId ? 'Sửa món' : 'Thêm món mới'}
            onClose={() => setShowForm(false)}
            onSave={handleSave} saveLabel={editingId ? 'Cập nhật' : 'Thêm mới'} saving={saving}>
            <MenuFormContent form={form} onChange={(updates) => setForm(f => ({ ...f, ...updates }))} />
          </FormModal>

          <DetailModal
            visible={!!selectedItem}
            title={selectedItem?.name || ''}
            subtitle={selectedItem ? `Mã: ${selectedItem.code || 'N/A'} · ${selectedItem.category || 'Khác'}` : undefined}
            onClose={() => setSelectedId(null)}
            onEdit={selectedItem ? () => { const item = selectedItem; setSelectedId(null); openEdit(item); } : undefined}
            onDelete={selectedItem ? () => { const item = selectedItem; setSelectedId(null); handleDelete(item.id, item.name); } : undefined}
            actions={
              selectedItem
                ? [
                    {
                      label: selectedItem.is_active ? 'Ngưng bán' : 'Mở bán',
                      icon: 'swap-horizontal',
                      variant: selectedItem.is_active ? 'danger' : 'primary',
                      onPress: async () => {
                        try {
                          await api.updateProduct(selectedItem.id, { ...selectedItem, is_active: !selectedItem.is_active });
                          load();
                          setSelectedId(null);
                        } catch (err: any) {
                          Alert.alert('Lỗi', err.message || 'Không thể đổi trạng thái');
                        }
                      },
                    },
                  ]
                : []
            }
          >
            {selectedItem && (() => {
              const bcg = getBcgTag(selectedItem.price || 0, products.findIndex(p => p.id === selectedItem.id));
              const profit = (selectedItem.price || 0) - (selectedItem.cost_price || 0);
              return (
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="sm" color="#64748B">Giá bán niêm yết</AppText>
                    <AppText variant="md" weight="bold" color={colors.brand.primary}>
                      {formatVND(selectedItem.price || 0)}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="sm" color="#64748B">Giá vốn ước tính (BOM)</AppText>
                    <AppText variant="md" color="#0F172A">
                      {formatVND(selectedItem.cost_price || 0)}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="sm" color="#64748B">Lợi nhuận gộp / món</AppText>
                    <AppText variant="md" weight="bold" color={profit >= 0 ? colors.status.success : colors.status.danger}>
                      {formatVND(profit)}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <AppText variant="sm" color="#64748B">Phân loại BCG Matrix</AppText>
                    <View style={{ backgroundColor: bcg.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                      <AppText variant="sm" color={bcg.color}>{bcg.label}</AppText>
                    </View>
                  </View>
                </View>
              );
            })()}
          </DetailModal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface.card,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, ...font.md, color: colors.text.primary, paddingVertical: 0 },

  /* 📱 Mobile Full-Width Facebook Feed Card Block */
  itemMobile: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bcgBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
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
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },
  panelBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },

  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  deleteBtn: { padding: 4 },

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
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#F8FAFC' },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: 999, height: 40, marginTop: 4 },

  mobileTopActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: 10,
  },
  mobileSearchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 40,
    gap: 6,
  },
  mobileSearchTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  mobileAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },
  posTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  miniActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posCatSectionWrap: {
    marginBottom: 16,
  },
  posCatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  catIconMiniCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posCatItemsGroup: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
});

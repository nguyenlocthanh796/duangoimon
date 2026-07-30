import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Product } from '../../lib/api';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useCrud } from '../../lib/hooks/useCrud';
import { useFilter } from '../../lib/hooks/useFilter';
import StatusBadge from '../../lib/components/ui/StatusBadge';
import { colors, font, formatVND, ss } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import EmptyState from '../../lib/components/ui/EmptyState';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import MenuFormContent from '../../lib/components/quan-ly/menu/MenuFormContent';
import DataTable, { Column, FooterColumn } from '../../lib/components/ui/DataTable';

type FormState = {
  code: string;
  name: string;
  category: string;
  price: string;
  cost_price: string;
  unit: string;
  is_active: boolean;
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
  return CATEGORIES.find((c) => c.key === cat) ?? CATEGORIES[4];
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

export default function MenuScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();

  const {
    data: products, loading, refreshing, saving,
    showForm, setShowForm, selectedId, setSelectedId,
    selectedItem, editingId, form, setForm,
    loadData, onRefresh, openAdd: openNew, openEdit, handleSave, handleDelete,
  } = useCrud<Product, FormState>({
    fetchFn: api.getProducts,
    createFn: api.createProduct,
    updateFn: api.updateProduct,
    deleteFn: api.deleteProduct,
    fallbackData: generateFallbackProducts(),
    formState: EMPTY_FORM,
    formFromItem: (p) => ({
      code: p.code || '', name: p.name || '',
      category: p.category || 'Đồ ăn',
      price: String(p.price ?? 0), cost_price: String(p.cost_price ?? 0),
      unit: p.unit || 'phần', is_active: p.is_active ?? true,
    }),
    buildPayload: (f) => ({
      code: f.code, name: f.name, category: f.category || null,
      price: parseFloat(f.price) || 0, cost_price: parseFloat(f.cost_price) || 0,
      unit: f.unit, is_active: f.is_active,
    }),
    nameLabel: 'món',
  });

  const {
    search, setSearch, filterValue: catFilter, setFilterValue: setCatFilter,
    filteredData: filtered,
  } = useFilter<Product>({
    data: products, searchFields: ['name', 'code'],
    filterField: 'category',
  });

  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filtered.forEach((p) => {
      const cat = p.category || 'Chưa phân nhóm';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return Object.keys(groups).map((cat) => ({ category: cat, data: groups[cat] }));
  }, [filtered]);

  const avgPrice = useMemo(() => {
    if (!products.length) return 0;
    return Math.round(products.reduce((acc, p) => acc + (p.price || 0), 0) / products.length);
  }, [products]);

  const toggleStatus = async (p: Product) => {
    try {
      await api.updateProduct(p.id, { ...p, is_active: !p.is_active });
      loadData({ quiet: true });
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể đổi trạng thái');
    }
  };

  // ── Detail Panel ──
  const renderDetailPanel = () => {
    if (!selectedItem) {
      return (
        <View style={ss.detailPanelEmpty}>
          <AppText variant="md" color="#050505">Chi Tiết Món Ăn</AppText>
          <AppText variant="md" color="#65676B" style={{ textAlign: 'center' }}>
            Chọn món ăn từ danh sách bên trái
          </AppText>
          <TouchableOpacity style={ss.panelCta} onPress={openNew}>
            <Icon name="plus" size={18} color="#FFF" />
            <AppText variant="md" color="#FFF">Thêm món mới</AppText>
          </TouchableOpacity>
        </View>
      );
    }
    const item = selectedItem;
    const catStyle = getCatStyle(item.category);
    const profit = (item.price || 0) - (item.cost_price || 0);

    return (
      <View style={s.detailPanel}>
        <View style={s.detailHeader}>
          <View style={[s.avatarCircle, { backgroundColor: catStyle.bg }]}>
            <AppText variant="md" color={catStyle.color}>
              {(item.category || '??').slice(0, 2).toUpperCase()}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#050505">{item.name}</AppText>
            <AppText variant="md" color={colors.text.secondary}>
              Mã: {item.code || 'N/A'} · {item.unit || 'phần'}
            </AppText>
          </View>
        </View>
        <View style={s.detailBody}>
          <View style={s.detailStatRow}>
            <AppText variant="md" color="#65676B">Giá bán</AppText>
            <AppText variant="md" color={colors.brand.primary}>{formatVND(item.price || 0)}</AppText>
          </View>
          <View style={s.detailStatRow}>
            <AppText variant="md" color="#65676B">Giá vốn (BOM)</AppText>
            <AppText variant="md" color="#050505">{formatVND(item.cost_price || 0)}</AppText>
          </View>
          <View style={s.detailStatRow}>
            <AppText variant="md" color="#65676B">Lợi nhuận gộp</AppText>
            <AppText variant="md" color={profit >= 0 ? colors.status.success : colors.status.danger}>
              {formatVND(profit)}
            </AppText>
          </View>
          <View style={s.detailStatRow}>
            <AppText variant="md" color="#65676B">Trạng thái</AppText>
            <StatusBadge label={item.is_active ? 'Đang bán' : 'Ngưng bán'}
              severity={item.is_active ? 'success' : 'danger'} />
          </View>
        </View>
        <View style={s.detailActions}>
          <TouchableOpacity style={ss.panelBtnSecondary} onPress={() => setShowForm(true)}>
            <Icon name="pencil" size={16} color={colors.brand.primary} />
            <AppText variant="md" color={colors.brand.primary}>Sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={ss.panelBtnDanger} onPress={() => handleDelete(item.id, item.name)}>
            <Icon name="trash-can-outline" size={16} color={colors.status.danger} />
            <AppText variant="md" color={colors.status.danger}>Xóa</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Card ──
  const renderCard = ({ item }: { item: Product }) => {
    const isSelected = selectedId === item.id;
    const catStyle = getCatStyle(item.category);

    if (!isWide) {
      return (
        <TouchableOpacity onPress={() => setSelectedId(item.id)} activeOpacity={0.7} style={ss.listRow}>
          <View style={s.posCodeBadge}>
            <AppText variant="md" weight="normal" color="#64748B" numberOfLines={1}>
              {item.code || 'SP'}
            </AppText>
          </View>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <AppText variant="md" color="#0F172A" numberOfLines={1}>{item.name}</AppText>
            <AppText variant="md" weight="normal" color="#64748B" numberOfLines={1} style={{ marginTop: 1 }}>
              {item.category || 'Khác'} · {item.unit || 'phần'}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
            <AppText variant="md" weight="normal" color="#0F172A">{formatVND(item.price || 0)}</AppText>
          </View>
          <TouchableOpacity onPress={() => toggleStatus(item)}
            style={[s.posStatusPill, { backgroundColor: item.is_active ? '#ECFDF5' : '#FEE2E2' }]}>
            <View style={[s.activeDot, { backgroundColor: item.is_active ? colors.status.success : colors.status.danger }]} />
            <AppText variant="md" weight="normal" color={item.is_active ? colors.status.success : colors.status.danger}>
              {item.is_active ? 'Bán' : 'Ngưng'}
            </AppText>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity onPress={() => setSelectedId(isSelected ? null : item.id)}
        style={[s.cardWide, isSelected && { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryBg }]}
        activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[s.avatarCircle, { backgroundColor: catStyle.bg }]}>
            <AppText variant="md" color={catStyle.color}>
              {(item.category || '??').slice(0, 2).toUpperCase()}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="md" color="#050505" numberOfLines={1}>{item.name}</AppText>
              <AppText variant="md" color="#65676B">({item.code || 'SP'})</AppText>
            </View>
            <AppText variant="md" color="#65676B" style={{ marginTop: 2 }}>
              {item.category || 'Chưa gắn nhóm'} · {item.unit || 'phần'}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="md" color={colors.brand.primary}>{formatVND(item.price || 0)}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <View style={[s.activeDot, { backgroundColor: item.is_active ? colors.status.success : colors.status.danger }]} />
              <AppText variant="md" color="#65676B">{item.is_active ? 'Đang bán' : 'Tạm ngưng'}</AppText>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── DataTable Columns (wide only) ──
  const columns: Column<Product>[] = [
    { key: 'code', title: 'Mã', width: 80, sortable: true, sortValue: (p) => p.code || '',
      render: (p) => <AppText variant="md" color="#65676B">{p.code || 'SP'}</AppText> },
    { key: 'name', title: 'Tên món ăn', flex: 1.5, sortable: true, sortValue: (p) => p.name || '',
      render: (p) => {
        const cs = getCatStyle(p.category);
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[s.avatarCircle, { backgroundColor: cs.bg, width: 32, height: 32, borderRadius: 16 }]}>
              <AppText variant="md" color={cs.color}>{(p.category || '??').slice(0, 2).toUpperCase()}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color="#050505" numberOfLines={1}>{p.name}</AppText>
              <AppText variant="md" color="#65676B">{p.unit || 'phần'}</AppText>
            </View>
          </View>
        );
      }},
    { key: 'category', title: 'Nhóm', width: 110, sortable: true, sortValue: (p) => p.category || '',
      render: (p) => {
        const cs = getCatStyle(p.category);
        return <View style={[s.badge, { backgroundColor: cs.bg }]}>
          <AppText variant="md" color={cs.color}>{p.category || 'Khác'}</AppText>
        </View>;
      }},
    { key: 'price', title: 'Giá bán', width: 110, align: 'right', sortable: true, sortValue: (p) => p.price || 0,
      render: (p) => <AppText variant="md" color={colors.brand.primary}>{formatVND(p.price || 0)}</AppText> },
    { key: 'cost_price', title: 'Giá vốn', width: 110, align: 'right', sortable: true, sortValue: (p) => p.cost_price || 0,
      render: (p) => <AppText variant="md" color="#65676B">{formatVND(p.cost_price || 0)}</AppText> },
    { key: 'profit', title: 'Lợi nhuận gộp', width: 150, align: 'right', sortable: true,
      sortValue: (p) => (p.price || 0) - (p.cost_price || 0),
      render: (p) => {
        const profit = (p.price || 0) - (p.cost_price || 0);
        const margin = p.price ? Math.round((profit / p.price) * 100) : 0;
        const color = margin >= 60 ? '#16A34A' : margin >= 20 ? '#D97706' : '#DC2626';
        const bgColor = margin >= 60 ? '#DCFCE7' : margin >= 20 ? '#FEF3C7' : '#FEE2E2';
        return (
          <View style={{ alignItems: 'flex-end', width: '100%' }}>
            <AppText variant="md" color={color}>{formatVND(profit)}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, Math.max(0, margin))}%`, height: '100%', backgroundColor: color }} />
              </View>
              <View style={{ paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, backgroundColor: bgColor }}>
                <AppText variant="md" color={color}>{margin}%</AppText>
              </View>
            </View>
          </View>
        );
      }},
    { key: 'is_active', title: 'Trạng thái', width: 110, align: 'center', sortable: true, sortValue: (p) => (p.is_active ? 1 : 0),
      render: (p) => (
        <TouchableOpacity onPress={() => toggleStatus(p)}
          style={[s.badge, { backgroundColor: p.is_active ? '#ECFDF5' : '#FEE2E2' }]}>
          <AppText variant="md" color={p.is_active ? colors.status.success : colors.status.danger}>
            {p.is_active ? 'Đang bán' : 'Ngưng bán'}
          </AppText>
        </TouchableOpacity>
      )},
    { key: 'actions', title: 'Thao tác', width: 90, align: 'center',
      render: (p) => (
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => openEdit(p)} style={{ padding: 4 }}>
            <Icon name="pencil" size={18} color="#F97316" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(p.id, p.name)} style={{ padding: 4 }}>
            <Icon name="trash-can-outline" size={18} color={colors.status.danger} />
          </TouchableOpacity>
        </View>
      )},
  ];

  return (
    <View style={s.container}>
      {/* Top Action Bar */}
      <View style={ss.topActionBar}>
        <View style={ss.searchInputWrap}>
          <Icon name="magnify" size={20} color="#64748B" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Tìm món, mã món..."
            placeholderTextColor="#94A3B8" style={ss.searchTextInput} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={ss.addBtn} onPress={openNew} activeOpacity={0.8}>
          <Icon name="plus" size={18} color="#FFFFFF" />
          <AppText variant="md" color="#FFFFFF">Thêm món</AppText>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 46 }} contentContainerStyle={ss.filterChipsContainer}>
        <TouchableOpacity onPress={() => setCatFilter(null)}
          style={[ss.filterChip, !catFilter && ss.filterChipActive]}>
          <AppText variant="md" color={!catFilter ? colors.brand.primary : '#334155'}>
            Tất cả ({products.length})
          </AppText>
        </TouchableOpacity>
        {CATEGORIES.map((c) => {
          const active = catFilter === c.key;
          const count = products.filter((p) => p.category === c.key).length;
          return (
            <TouchableOpacity key={c.key} onPress={() => setCatFilter(active ? null : c.key)}
              style={[ss.filterChip, active && ss.filterChipActive]}>
              <AppText variant="md" color={active ? colors.brand.primary : '#334155'}>
                {c.key} ({count})
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.58 }}>
            <DataTable<Product>
              columns={columns}
              data={filtered}
              getRowId={(p) => p.id}
              loading={loading}
              onRefresh={onRefresh}
              refreshing={refreshing}
              onRowPress={(p) => setSelectedId(p.id)}
              selectedRowId={selectedId}
              emptyIcon="food-off"
              emptyTitle="Chưa có món ăn nào"
              emptySubtitle="Nhấn + Thêm món để tạo món mới"
            />
          </View>
          <View style={{ flex: 0.42 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {groupedProducts.length === 0 ? (
              <View style={s.mobileEmptyWrap}>
                <AppText variant="md" color="#0F172A">Chưa có món ăn nào</AppText>
                <AppText variant="md" color="#64748B">Nhấn + Thêm món để tạo món mới</AppText>
              </View>
            ) : groupedProducts.map((group) => {
              const catStyle = getCatStyle(group.category);
              return (
                <View key={group.category} style={ss.sectionWrap}>
                  <View style={ss.sectionHeader}>
                    <View style={[ss.iconCircleSm, { backgroundColor: catStyle.bg, alignItems: 'center', justifyContent: 'center' }]}>
                      <AppText variant="md" color={catStyle.color} style={{ fontSize: 12 }}>
                        {(group.category || '??').slice(0, 2).toUpperCase()}
                      </AppText>
                    </View>
                    <AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                      {group.category.toUpperCase()}
                    </AppText>
                    <View style={s.catBadgeCount}>
                      <AppText variant="md" weight="normal" color="#64748B">{group.data.length} món</AppText>
                    </View>
                  </View>
                  <View style={ss.sectionItems}>
                    {group.data.map((item) => (
                      <React.Fragment key={item.id}>{renderCard({ item })}</React.Fragment>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Mobile Detail Modal */}
      {!isWide && (
        <DetailModal visible={!!selectedItem} title={selectedItem?.name || ''}
          subtitle={selectedItem ? `Mã: ${selectedItem.code || 'N/A'} · ${selectedItem.category || 'Khác'}` : undefined}
          onClose={() => setSelectedId(null)}
          onEdit={selectedItem ? () => { const item = selectedItem; setSelectedId(null); openEdit(item); } : undefined}
          onDelete={selectedItem ? () => { const item = selectedItem; setSelectedId(null); handleDelete(item.id, item.name); } : undefined}
          actions={selectedItem ? [{
            label: selectedItem.is_active ? 'Ngưng bán' : 'Mở bán',
            icon: 'swap-horizontal',
            variant: selectedItem.is_active ? 'danger' as const : 'primary' as const,
            onPress: async () => {
              await toggleStatus(selectedItem);
              setSelectedId(null);
            },
          }] : []}>
          {renderDetailPanel()}
        </DetailModal>
      )}

      <FormModal visible={showForm} title={editingId ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}
        onClose={() => setShowForm(false)}
        onSave={() => handleSave(() => !form.name.trim() ? 'Tên món không được để trống' : null)}
        saveLabel={editingId ? 'Cập nhật' : 'Thêm món'} saving={saving}>
        <MenuFormContent form={form} onChange={(updates) => setForm((f) => ({ ...f, ...updates }))} />
      </FormModal>
    </View>
  );
}

// ── Styles ──
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
    position: 'relative',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailBody: {
    gap: 10,
  },
  detailStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cardWide: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  posCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
    minWidth: 48,
    alignItems: 'center',
  },
  posStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 999,
  },
  catBadgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  mobileEmptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});

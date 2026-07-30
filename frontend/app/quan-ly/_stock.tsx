import React, { useMemo } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, RawMaterial } from '../../lib/api';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useCrud } from '../../lib/hooks/useCrud';
import { useFilter } from '../../lib/hooks/useFilter';
import { colors, font, formatVND, ss } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import FormModal from '../../lib/components/ui/FormModal';
import EmptyState from '../../lib/components/ui/EmptyState';
import DetailModal from '../../lib/components/ui/DetailModal';

type FormState = {
  code: string;
  name: string;
  category: string;
  current_stock: string;
  min_stock: string;
  unit: string;
  cost_price: string;
};

const EMPTY_FORM: FormState = {
  code: '', name: '', category: 'Thịt & Hải sản',
  current_stock: '0', min_stock: '10', unit: 'kg', cost_price: '0',
};

const CATEGORIES = [
  'Thịt & Hải sản', 'Rau củ quả', 'Gia vị & Khác',
  'Đồ uống & Trái cây', 'Bao bì & Dụng cụ', 'Cà phê & Trà', 'Sữa & Bơ phô mai',
];

function generateFallbackStockItems(): RawMaterial[] {
  return [
    { id: 'm1', code: 'NL01', name: 'Thịt Bò Mỹ Nhập Khẩu', category: 'Thịt & Hải sản', current_stock: 45, min_stock: 10, unit: 'kg', cost_price: 220000 },
    { id: 'm2', code: 'NL02', name: 'Hạt Cà Phê Arabica Cầu Đất', category: 'Cà phê & Trà', current_stock: 12, min_stock: 15, unit: 'kg', cost_price: 180000 },
    { id: 'm3', code: 'NL03', name: 'Sữa Tươi Vinamilk 1L', category: 'Sữa & Bơ phô mai', current_stock: 8, min_stock: 10, unit: 'hộp', cost_price: 32000 },
    { id: 'm4', code: 'NL04', name: 'Đường Cát Trắng Biên Hòa', category: 'Gia vị & Khác', current_stock: 50, min_stock: 10, unit: 'kg', cost_price: 24000 },
    { id: 'm5', code: 'NL05', name: 'Trà Oolong Lâm Đồng', category: 'Cà phê & Trà', current_stock: 5, min_stock: 8, unit: 'kg', cost_price: 150000 },
  ] as RawMaterial[];
}

export default function StockScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();

  const {
    data: materials, loading, refreshing, saving,
    showForm, setShowForm, selectedId, setSelectedId,
    selectedItem, editingId, form, setForm,
    loadData, onRefresh, openAdd, openEdit, handleSave, handleDelete,
  } = useCrud<RawMaterial, FormState>({
    fetchFn: api.getRawMaterials,
    createFn: api.createRawMaterial,
    updateFn: api.updateRawMaterial,
    deleteFn: api.deleteRawMaterial,
    fallbackData: generateFallbackStockItems(),
    formState: EMPTY_FORM,
    formFromItem: (m) => ({
      code: m.code || '', name: m.name || '',
      category: m.category || 'Thịt & Hải sản',
      current_stock: String(m.current_stock ?? 0),
      min_stock: String(m.min_stock ?? 10),
      unit: m.unit || 'kg',
      cost_price: String(m.cost_price ?? 0),
    }),
    buildPayload: (f) => ({
      code: f.code, name: f.name, category: f.category,
      current_stock: parseFloat(f.current_stock) || 0,
      min_stock: parseFloat(f.min_stock) || 0,
      unit: f.unit, cost_price: parseFloat(f.cost_price) || 0,
    }),
    nameLabel: 'nguyên liệu',
  });

  const {
    search, setSearch, filterValue: catFilter, setFilterValue: setCatFilter,
    filteredData: filtered,
  } = useFilter<RawMaterial>({
    data: materials, searchFields: ['name', 'code'],
  });

  const [lowOnly, setLowOnly] = React.useState(false);

  const displayList = useMemo(() => {
    return filtered.filter((m) => !lowOnly || m.current_stock <= m.min_stock);
  }, [filtered, lowOnly]);

  const groupedMaterials = useMemo(() => {
    const groups: Record<string, RawMaterial[]> = {};
    displayList.forEach((m) => {
      const cat = m.category || 'Chưa phân nhóm';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return Object.keys(groups).map((cat) => ({ category: cat, data: groups[cat] }));
  }, [displayList]);

  const metrics = useMemo(() => ({
    lowCount: materials.filter((m) => m.current_stock <= m.min_stock).length,
    totalValue: materials.reduce((acc, m) => acc + m.current_stock * m.cost_price, 0),
  }), [materials]);

  const renderDetailPanel = () => {
    if (!selectedItem) {
      return (
        <View style={ss.detailPanelEmpty}>
          <AppText variant="md" color="#050505">Chi Tiết Nguyên Liệu Kho</AppText>
          <AppText variant="md" color="#65676B" style={{ textAlign: 'center' }}>
            Chọn nguyên liệu từ danh sách bên trái
          </AppText>
          <TouchableOpacity style={ss.panelCta} onPress={openAdd}>
            <Icon name="plus" size={18} color="#FFF" />
            <AppText variant="md" color="#FFF">Thêm nguyên liệu mới</AppText>
          </TouchableOpacity>
        </View>
      );
    }
    const item = selectedItem;
    const isLow = item.current_stock <= item.min_stock;
    const itemTotalVal = item.current_stock * item.cost_price;

    return (
      <View style={s.detailPanel}>
        <View style={s.detailHeader}>
          <View style={[s.skuBadge, { backgroundColor: colors.brand.primaryBg }]}>
            <AppText variant="md" color={colors.brand.primary}>{item.code || 'NL'}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#050505">{item.name}</AppText>
            <AppText variant="md" color={colors.text.secondary}>
              SKU: {item.code || 'NL'} · {item.category || 'Vật tư'}
            </AppText>
          </View>
        </View>
        <View style={s.detailBody}>
          <View style={s.detailStatRow}>
            <AppText variant="md" color="#65676B">Tồn kho</AppText>
            <AppText variant="md" color={isLow ? colors.status.danger : '#050505'}>
              {item.current_stock} {item.unit}
            </AppText>
          </View>
          <View style={s.detailStatRow}>
            <AppText variant="md" color="#65676B">Hạn mức tối thiểu</AppText>
            <AppText variant="md" color="#050505">{item.min_stock} {item.unit}</AppText>
          </View>
          <View style={s.detailStatRow}>
            <AppText variant="md" color="#65676B">Đơn giá vốn</AppText>
            <AppText variant="md" color="#050505">{formatVND(item.cost_price)} / {item.unit}</AppText>
          </View>
          <View style={s.detailStatRow}>
            <AppText variant="md" color="#65676B">Tổng giá trị tồn</AppText>
            <AppText variant="md" color={colors.brand.primary}>{formatVND(itemTotalVal)}</AppText>
          </View>
          <View style={s.detailStatRow}>
            <AppText variant="md" color="#65676B">Trạng thái</AppText>
            <View style={[s.badge, { backgroundColor: isLow ? '#FEE2E2' : '#ECFDF5' }]}>
              <AppText variant="md" color={isLow ? colors.status.danger : colors.status.success}>
                {isLow ? '⚠️ Sắp hết hàng' : 'An toàn'}
              </AppText>
            </View>
          </View>
        </View>
        <View style={s.detailActions}>
          <TouchableOpacity style={ss.panelBtnSecondary} onPress={() => openEdit(item)}>
            <Icon name="pencil" size={16} color={colors.brand.primary} />
            <AppText variant="md" color={colors.brand.primary}>Chỉnh sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={ss.panelBtnDanger} onPress={() => handleDelete(item.id, item.name)}>
            <Icon name="trash-can-outline" size={16} color={colors.status.danger} />
            <AppText variant="md" color={colors.status.danger}>Xóa</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCard = ({ item }: { item: RawMaterial }) => {
    const isSelected = selectedId === item.id;
    const isLow = item.current_stock <= item.min_stock;

    if (!isWide) {
      return (
        <View style={ss.listRow} key={item.id}>
          <View style={[s.posSkuBadgeMini, isLow && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
            <AppText variant="md" color={isLow ? colors.status.danger : colors.brand.primary}>
              {item.code || 'NL'}
            </AppText>
          </View>
          <TouchableOpacity style={{ flex: 1, paddingRight: 8 }}
            onPress={() => setSelectedId(isSelected ? null : item.id)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="md" color="#0F172A" numberOfLines={1}>{item.name}</AppText>
              {isLow && <View style={s.badgeDangerMini}><AppText variant="md" color={colors.status.danger}>Hết</AppText></View>}
            </View>
            <AppText variant="md" color="#64748B" numberOfLines={1}>
              Min: {item.min_stock} {item.unit} · {formatVND(item.cost_price)}/{item.unit}
            </AppText>
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
            <AppText variant="md" color={isLow ? colors.status.danger : '#0F172A'}>
              {item.current_stock} <AppText variant="md" color="#64748B">{item.unit}</AppText>
            </AppText>
          </View>
          <TouchableOpacity style={ss.miniActionBtn} onPress={() => openEdit(item)}>
            <Icon name="pencil" size={16} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={() => setSelectedId(isSelected ? null : item.id)}
        style={[s.cardWide, isSelected && { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryBg }]}
        activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[s.skuBadge, isLow && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
            <AppText variant="md" color={isLow ? colors.status.danger : '#1E293B'}>{item.code || 'NL'}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="md" color="#050505" numberOfLines={1}>{item.name}</AppText>
              {isLow && <View style={s.badgeDangerMini}><AppText variant="md" color={colors.status.danger}>Sắp hết</AppText></View>}
            </View>
            <AppText variant="md" color="#65676B" style={{ marginTop: 2 }}>
              {item.category || 'Vật tư'} · Min: {item.min_stock} {item.unit}
            </AppText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="md" color={isLow ? colors.status.danger : '#050505'}>
              {item.current_stock} <AppText variant="md" color="#65676B">{item.unit}</AppText>
            </AppText>
            <AppText variant="md" color="#65676B">{formatVND(item.cost_price)}/{item.unit}</AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStockForm = () => (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="md" color="#050505">Mã nguyên liệu *</AppText>
          <TextInput value={form.code} onChangeText={(v) => setForm((f) => ({ ...f, code: v }))}
            style={s.fieldInput} placeholder="VD: NL01" placeholderTextColor="#94A3B8" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="md" color="#050505">Đơn vị tính *</AppText>
          <TextInput value={form.unit} onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))}
            style={s.fieldInput} placeholder="kg, lít, hộp..." placeholderTextColor="#94A3B8" />
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <AppText variant="md" color="#050505">Tên nguyên liệu *</AppText>
        <TextInput value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          style={s.fieldInput} placeholder="VD: Thịt bò Mỹ nhập khẩu..." placeholderTextColor="#94A3B8" />
      </View>
      <View style={{ gap: 4 }}>
        <AppText variant="md" color="#050505">Nhóm danh mục</AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c} onPress={() => setForm((f) => ({ ...f, category: c }))}
              style={[s.catChipForm, form.category === c && s.catChipFormActive]}>
              <AppText variant="md" weight={form.category === c ? 'bold' : 'normal'}
                color={form.category === c ? '#FFF' : colors.text.secondary}>{c}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="md" color="#050505">Tồn kho hiện tại</AppText>
          <TextInput value={form.current_stock} onChangeText={(v) => setForm((f) => ({ ...f, current_stock: v }))}
            keyboardType="numeric" style={s.fieldInput} placeholder="0" placeholderTextColor="#94A3B8" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="md" color="#050505">Cảnh báo tồn ít (Min)</AppText>
          <TextInput value={form.min_stock} onChangeText={(v) => setForm((f) => ({ ...f, min_stock: v }))}
            keyboardType="numeric" style={s.fieldInput} placeholder="10" placeholderTextColor="#94A3B8" />
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <AppText variant="md" color="#050505">Giá vốn đơn vị (VNĐ)</AppText>
        <TextInput value={form.cost_price} onChangeText={(v) => setForm((f) => ({ ...f, cost_price: v }))}
          keyboardType="numeric" style={s.fieldInput} placeholder="0" placeholderTextColor="#94A3B8" />
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      {/* Top Action Bar */}
      <View style={ss.topActionBar}>
        <View style={ss.searchInputWrap}>
          <Icon name="magnify" size={20} color="#64748B" />
          <TextInput value={search} onChangeText={setSearch} placeholder="Tìm nguyên liệu, mã SKU..."
            placeholderTextColor="#94A3B8" style={ss.searchTextInput} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={ss.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Icon name="plus" size={18} color="#FFFFFF" />
          <AppText variant="md" color="#FFFFFF">Thêm vật tư</AppText>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 46 }} contentContainerStyle={ss.filterChipsContainer}>
        <TouchableOpacity onPress={() => { setCatFilter(null); setLowOnly(false); }}
          style={[ss.filterChip, !catFilter && !lowOnly && ss.filterChipActive]}>
          <AppText variant="md" color={!catFilter && !lowOnly ? colors.brand.primary : '#334155'}>
            Tất cả ({materials.length})
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setLowOnly(!lowOnly)}
          style={[ss.filterChip, lowOnly && s.catChipPillDangerActive]}>
          <AppText variant="md" color={lowOnly ? colors.status.danger : '#334155'}>
            ⚠️ Sắp hết ({metrics.lowCount})
          </AppText>
        </TouchableOpacity>
        {CATEGORIES.map((c) => {
          const active = catFilter === c;
          const count = materials.filter((m) => m.category === c).length;
          return (
            <TouchableOpacity key={c} onPress={() => setCatFilter(active ? null : c)}
              style={[ss.filterChip, active && ss.filterChipActive]}>
              <AppText variant="md" color={active ? colors.brand.primary : '#334155'}>
                {c} ({count})
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            {loading ? <TableSkeleton rowCount={5} /> : displayList.length > 0 ? (
              <FlatList data={displayList} keyExtractor={(item) => item.id} renderItem={renderCard}
                contentContainerStyle={{ gap: 10, paddingBottom: 24 }} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} />
            ) : (
              <EmptyState icon="package-variant-remove" title="Không tìm thấy nguyên liệu"
                subtitle="Nhấn + Thêm vật tư để tạo mới" />
            )}
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {groupedMaterials.length === 0 ? (
              <View style={s.mobileEmptyWrap}>
                <AppText variant="md" color="#0F172A">Không tìm thấy nguyên liệu</AppText>
                <AppText variant="md" color="#64748B">Nhấn + Thêm vật tư để tạo mới</AppText>
              </View>
            ) : groupedMaterials.map((group) => (
              <View key={group.category} style={ss.sectionWrap}>
                <View style={ss.sectionHeader}>
                  <AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                    {group.category.toUpperCase()}
                  </AppText>
                  <View style={s.catBadgeCount}>
                    <AppText variant="md" weight="normal" color="#64748B">{group.data.length} vật tư</AppText>
                  </View>
                </View>
                <View style={ss.sectionItems}>
                  {group.data.map((item) => (
                    <React.Fragment key={item.id}>{renderCard({ item })}</React.Fragment>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Mobile Detail Modal */}
      {!isWide && (
        <DetailModal visible={!!selectedItem} title={selectedItem?.name || ''}
          subtitle={selectedItem ? `ĐVT: ${selectedItem.unit || 'N/A'}` : undefined}
          onClose={() => setSelectedId(null)}
          onEdit={selectedItem ? () => { const item = selectedItem; openEdit(item); setSelectedId(null); } : undefined}
          onDelete={selectedItem ? () => { const item = selectedItem; handleDelete(item.id, item.name); setSelectedId(null); } : undefined}>
          {renderDetailPanel()}
        </DetailModal>
      )}

      <FormModal visible={showForm} title={editingId ? 'Chỉnh sửa nguyên liệu' : 'Thêm nguyên liệu mới'}
        onClose={() => setShowForm(false)} onSave={() => handleSave(() => !form.name.trim() ? 'Tên nguyên liệu không được để trống' : null)}
        saveLabel={editingId ? 'Cập nhật' : 'Thêm'} saving={saving}>
        {renderStockForm()}
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
  skuBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDangerMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
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
  fieldInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  catChipForm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  catChipFormActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  catChipPillDangerActive: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.status.danger,
  },
  catBadgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  mobileEmptyWrap: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posSkuBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginRight: 10,
  },
});

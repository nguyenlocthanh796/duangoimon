import React, { useCallback, useEffect, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, RawMaterial } from '../../lib/api';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import AppText from '../../lib/components/ui/AppText';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';

type FormState = {
  code: string; name: string; category: string; current_stock: string;
  min_stock: string; unit: string; cost_price: string;
};

const EMPTY_FORM: FormState = {
  code: '', name: '', category: 'Thịt & Hải sản', current_stock: '0',
  min_stock: '10', unit: 'kg', cost_price: '0',
};

const CATEGORIES = [
  'Thịt & Hải sản', 'Rau củ quả', 'Gia vị & Khác', 'Đồ uống & Trái cây',
  'Bao bì & Dụng cụ', 'Cà phê & Trà', 'Sữa & Bơ phô mai',
];

export default function StockScreen() {
  const { isWide } = useResponsive();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const d = await api.getRawMaterials();
      setMaterials(d);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải kho');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (m: RawMaterial) => {
    setEditingId(m.id);
    setForm({
      code: m.code, name: m.name, category: m.category ?? 'Thịt & Hải sản',
      current_stock: String(m.current_stock), min_stock: String(m.min_stock),
      unit: m.unit, cost_price: String(m.cost_price),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      Alert.alert('Lỗi', 'Mã và tên nguyên liệu không được để trống'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        current_stock: parseFloat(form.current_stock) || 0,
        min_stock: parseFloat(form.min_stock) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
      };
      if (editingId) await api.updateRawMaterial(editingId, payload);
      else await api.createRawMaterial(payload);
      setShowForm(false); setForm(EMPTY_FORM); load();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xác nhận xóa', `Xóa nguyên liệu "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { try { await api.deleteRawMaterial(id); load(); } catch (e: any) { Alert.alert('Lỗi', e.message); } } },
    ]);
  };

  const filtered = materials.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || m.category === catFilter;
    const matchLow = !lowOnly || m.current_stock <= m.min_stock;
    return matchSearch && matchCat && matchLow;
  });

  const lowCount = materials.filter(m => m.current_stock <= m.min_stock).length;
  const totalValue = materials.reduce((sum, m) => sum + (m.current_stock * m.cost_price), 0);

  // ── Render Form Fields ──
  const renderStockForm = () => (
    <View style={{ gap: 10, paddingTop: 4 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Mã NL *</AppText>
          <TextInput
            value={form.code}
            onChangeText={v => setForm(f => ({ ...f, code: v }))}
            style={styles.fieldInput}
            placeholder="VD: NL001"
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <View style={{ flex: 2 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Tên nguyên liệu *</AppText>
          <TextInput
            value={form.name}
            onChangeText={v => setForm(f => ({ ...f, name: v }))}
            style={styles.fieldInput}
            placeholder="VD: Thịt bò tươi"
            placeholderTextColor={colors.text.muted}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Tồn kho hiện tại</AppText>
          <TextInput
            value={form.current_stock}
            onChangeText={v => setForm(f => ({ ...f, current_stock: v }))}
            keyboardType="numeric"
            style={styles.fieldInput}
            placeholder="0"
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Tồn tối thiểu</AppText>
          <TextInput
            value={form.min_stock}
            onChangeText={v => setForm(f => ({ ...f, min_stock: v }))}
            keyboardType="numeric"
            style={styles.fieldInput}
            placeholder="10"
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Đơn vị tính</AppText>
          <TextInput
            value={form.unit}
            onChangeText={v => setForm(f => ({ ...f, unit: v }))}
            style={styles.fieldInput}
            placeholder="kg, lít, hộp"
            placeholderTextColor={colors.text.muted}
          />
        </View>
      </View>

      <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Giá vốn đơn vị (VNĐ)</AppText>
      <TextInput
        value={form.cost_price}
        onChangeText={v => setForm(f => ({ ...f, cost_price: v }))}
        keyboardType="numeric"
        style={styles.fieldInput}
        placeholder="0"
        placeholderTextColor={colors.text.muted}
      />
    </View>
  );

  // ── Stats Panel (iPad right) ──
  const renderStatsPanel = () => {
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="package-variant-closed" size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tổng quan kho hàng</AppText>
        </View>

        <View style={styles.panelStatRow}>
          <AppText variant="sm" color={colors.text.secondary}>Tổng số mặt hàng</AppText>
          <AppText variant="md" weight="bold" color={colors.text.primary}>{materials.length}</AppText>
        </View>
        <View style={styles.panelStatRow}>
          <AppText variant="sm" color={colors.text.secondary}>Sắp hết kho (Cảnh báo)</AppText>
          <AppText variant="md" weight="bold" color={lowCount > 0 ? colors.status.danger : colors.status.success}>{lowCount}</AppText>
        </View>
        <View style={styles.panelStatRow}>
          <AppText variant="sm" color={colors.text.secondary}>Tổng giá trị kho</AppText>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(totalValue)}</AppText>
        </View>

        <View style={styles.panelDivider} />

        {/* Filter chips */}
        <TouchableOpacity
          style={[styles.filterRow, lowOnly && { backgroundColor: colors.status.dangerBg }]}
          onPress={() => setLowOnly(!lowOnly)}
        >
          <Icon name="alert-circle-outline" size={16} color={lowOnly ? colors.status.danger : colors.icon.muted} />
          <AppText variant="sm" color={lowOnly ? colors.status.danger : colors.text.primary} style={{ flex: 1 }}>
            Chỉ xem mặt hàng sắp hết
          </AppText>
          {lowOnly && <Icon name="check" size={14} color={colors.status.danger} />}
        </TouchableOpacity>

        <View style={styles.panelDivider} />

        <TouchableOpacity style={styles.panelCta} onPress={openAdd}>
          <Icon name="plus" size={16} color={colors.text.inverse} />
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm nguyên liệu</AppText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderInlineForm = () => {
    return (
      <View style={[styles.panelBox, { flex: 1, marginHorizontal: 12 }]}>
        <View style={styles.panelHeader}>
          <Icon name={editingId ? 'pencil' : 'plus'} size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>{editingId ? 'Chỉnh sửa nguyên liệu' : 'Thêm nguyên liệu'}</AppText>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 10 }}>
          {renderStockForm()}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <TouchableOpacity
            style={{ flex: 1, height: 42, borderRadius: shape.radius.md, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => setShowForm(false)}
          >
            <AppText variant="sm" color={colors.text.secondary}>Hủy</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1.5, height: 42, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
            onPress={handleSave}
            disabled={saving}
          >
            {saving && <ActivityIndicator size="small" color={colors.text.inverse} />}
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>{editingId ? 'Cập nhật' : 'Lưu'}</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Stock Item Card ──
  const renderItem = ({ item }: { item: RawMaterial }) => {
    const isLow = item.current_stock <= item.min_stock;
    return (
      <TouchableOpacity style={styles.item} onPress={() => openEdit(item)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
          <View style={[styles.codeTag, { backgroundColor: isLow ? colors.status.dangerBg : colors.surface.app }]}>
            <AppText variant="sm" weight="bold" color={isLow ? colors.status.danger : colors.text.secondary}>{item.code}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{item.name}</AppText>
              {isLow && (
                <View style={styles.lowBadge}>
                  <AppText variant="sm" weight="bold" color={colors.status.danger}>Sắp hết</AppText>
                </View>
              )}
            </View>
            <AppText variant="sm" color={colors.text.muted} style={{ marginTop: 2 }}>{item.category || 'Khác'} · Min: {item.min_stock} {item.unit}</AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="sm" weight="bold" color={isLow ? colors.status.danger : colors.text.primary}>
              {item.current_stock} {item.unit}
            </AppText>
            <AppText variant="sm" color={colors.text.muted}>{formatVND(item.cost_price)}/{item.unit}</AppText>
          </View>
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
        placeholder="Tìm nguyên liệu theo tên, mã..."
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

  const renderList = () => {
    if (loading) return (
      <View style={styles.center}>
        <TableSkeleton rowCount={5} />
        <AppText variant="sm" color={colors.text.muted}>Đang tải tồn kho...</AppText>
      </View>
    );
    return (
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
        ListHeaderComponent={renderSearch}
        ListEmptyComponent={
          <EmptyState
            title="Kho trống"
            subtitle="Chưa có nguyên liệu nào trong kho"
          />
        }
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
      ) : renderList()}
      {!isWide && <FAB onPress={openAdd} />}
      {!isWide && (
        <FormModal
          visible={showForm}
          title={editingId ? 'Chỉnh sửa nguyên liệu' : 'Thêm nguyên liệu'}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
          saveLabel={editingId ? 'Cập nhật' : 'Thêm'}
          saving={saving}
        >
          {renderStockForm()}
        </FormModal>
      )}
    </View>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  /* Right panel */
  panelBox: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    padding: 16,
    gap: 14,
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: shape.radius.md,
  },
  panelCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    borderRadius: shape.radius.md,
    height: 42,
    marginTop: 4,
  },

  /* Search */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface.card,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: shape.radius.md,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    ...font.md,
    color: colors.text.primary,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    gap: 12,
  },

  /* Item card */
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: shape.radius.lg,
    padding: 12,
  },
  codeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: shape.radius.sm,
  },
  lowBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: shape.radius.sm,
    backgroundColor: colors.status.dangerBg,
  },
  deleteBtn: { padding: 4 },
  fieldInput: {
    borderRadius: shape.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...font.md,
    color: colors.text.primary,
    backgroundColor: colors.surface.app,
  },
});

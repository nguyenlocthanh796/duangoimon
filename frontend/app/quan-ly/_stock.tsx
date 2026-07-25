import React, { useCallback, useEffect, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, RawMaterial } from '../../lib/api';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
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
      Alert.alert('Lỗi', e.message || 'Không thể tải kho hàng');
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

  const openEdit = (m: RawMaterial) => {
    setEditingId(m.id);
    setForm({
      code: m.code || '',
      name: m.name || '',
      category: m.category || 'Thịt & Hải sản',
      current_stock: String(m.current_stock ?? 0),
      min_stock: String(m.min_stock ?? 10),
      unit: m.unit || 'kg',
      cost_price: String(m.cost_price ?? 0),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Lỗi', 'Tên nguyên liệu không được để trống');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        code: form.code,
        name: form.name,
        category: form.category,
        current_stock: parseFloat(form.current_stock) || 0,
        min_stock: parseFloat(form.min_stock) || 0,
        unit: form.unit,
        cost_price: parseFloat(form.cost_price) || 0,
      };
      if (editingId) {
        await api.updateRawMaterial(editingId, payload);
      } else {
        await api.createRawMaterial(payload);
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu nguyên liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa nguyên liệu "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteRawMaterial(id);
            load();
          } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Không thể xóa');
          }
        },
      },
    ]);
  };

  const filtered = materials.filter(m => {
    const isLow = m.current_stock <= m.min_stock;
    if (lowOnly && !isLow) return false;
    if (catFilter && m.category !== catFilter) return false;
    const q = search.trim().toLowerCase();
    if (q && !(m.name || '').toLowerCase().includes(q) && !(m.code || '').toLowerCase().includes(q)) return false;
    return true;
  });

  const lowCount = materials.filter(m => m.current_stock <= m.min_stock).length;
  const totalValue = materials.reduce((acc, m) => acc + (m.current_stock * m.cost_price), 0);

  const renderStockForm = () => (
    <View style={{ gap: 12 }}>
      <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Mã nguyên liệu</AppText>
      <TextInput
        value={form.code}
        onChangeText={v => setForm(f => ({ ...f, code: v }))}
        style={styles.fieldInput}
        placeholder="VD: NL001"
        placeholderTextColor={colors.text.muted}
      />

      <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Tên nguyên liệu *</AppText>
      <TextInput
        value={form.name}
        onChangeText={v => setForm(f => ({ ...f, name: v }))}
        style={styles.fieldInput}
        placeholder="VD: Thịt bò mỹ"
        placeholderTextColor={colors.text.muted}
      />

      <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Danh mục</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setForm(f => ({ ...f, category: c }))}
            style={[styles.catChip, form.category === c && styles.catChipActive]}
          >
            <AppText variant="sm" color={form.category === c ? colors.brand.primary : colors.text.secondary}>{c}</AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 12 }}>
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
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Tồn tối thiểu (Min)</AppText>
          <TextInput
            value={form.min_stock}
            onChangeText={v => setForm(f => ({ ...f, min_stock: v }))}
            keyboardType="numeric"
            style={styles.fieldInput}
            placeholder="10"
            placeholderTextColor={colors.text.muted}
          />
        </View>
      </View>

      <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Đơn vị tính</AppText>
      <TextInput
        value={form.unit}
        onChangeText={v => setForm(f => ({ ...f, unit: v }))}
        style={styles.fieldInput}
        placeholder="kg, lít, hộp..."
        placeholderTextColor={colors.text.muted}
      />

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
  const renderStatsPanel = () => (
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

      <TouchableOpacity
        style={[styles.filterRowItem, lowOnly && { backgroundColor: colors.status.dangerBg }]}
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

  const renderInlineForm = () => (
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
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>{editingId ? 'Cập nhật' : 'Lưu'}</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Stock Item Card ──
  const renderItem = ({ item }: { item: RawMaterial }) => {
    const isLow = item.current_stock <= item.min_stock;

    if (!isWide) {
      // 📱 Facebook Mobile Feed Card (Full Width)
      return (
        <View style={styles.itemMobile}>
          <TouchableOpacity style={styles.cardHeaderRow} onPress={() => openEdit(item)} activeOpacity={0.8}>
            <View style={[styles.avatarCircle, { backgroundColor: isLow ? '#FEE2E2' : '#EEF2FF' }]}>
              <Icon name="package-variant-closed" size={20} color={isLow ? colors.status.danger : colors.brand.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{item.name}</AppText>
                {isLow && (
                  <View style={styles.lowBadge}>
                    <AppText variant="sm" weight="bold" color={colors.status.danger}>Sắp hết</AppText>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <AppText variant="sm" color="#65676B">Mã: {item.code || 'N/A'}</AppText>
                <AppText variant="sm" color="#65676B">· {item.category || 'Khác'}</AppText>
                <AppText variant="sm" color="#65676B">· Min: {item.min_stock} {item.unit}</AppText>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="md" weight="bold" color={isLow ? colors.status.danger : colors.text.primary}>
                {item.current_stock} {item.unit}
              </AppText>
              <AppText variant="sm" color="#65676B">{formatVND(item.cost_price)}/{item.unit}</AppText>
            </View>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
          <View style={[styles.codeTag, { backgroundColor: isLow ? colors.status.dangerBg : colors.surface.app }]}>
            <AppText variant="sm" weight="bold" color={isLow ? colors.status.danger : colors.text.secondary}>{item.code}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{item.name}</AppText>
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
            <AppText variant="md" weight="bold" color={isLow ? colors.status.danger : colors.text.primary}>
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

  const renderCategoryPills = () => (
    <View style={{ marginVertical: 4, marginBottom: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        <TouchableOpacity
          onPress={() => { setCatFilter(null); setLowOnly(false); }}
          style={[styles.chip, !catFilter && !lowOnly && styles.chipActive]}
        >
          <Icon name="grid" size={14} color={!catFilter && !lowOnly ? colors.brand.primary : '#65676B'} />
          <AppText variant="sm" weight={!catFilter && !lowOnly ? "bold" : "normal"} color={!catFilter && !lowOnly ? colors.brand.primary : "#050505"}>
            Tất cả {materials.length}
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setLowOnly(!lowOnly)}
          style={[styles.chip, lowOnly && styles.chipDangerActive]}
        >
          <Icon name="alert-circle-outline" size={14} color={lowOnly ? colors.status.danger : colors.status.danger} />
          <AppText variant="sm" weight={lowOnly ? "bold" : "normal"} color={lowOnly ? colors.status.danger : "#050505"}>
            ⚠️ Sắp hết {lowCount}
          </AppText>
        </TouchableOpacity>

        {CATEGORIES.map(c => {
          const active = catFilter === c;
          const count = materials.filter(m => m.category === c).length;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => setCatFilter(active ? null : c)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                {c} {count}
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
        <AppText variant="sm" color={colors.text.muted}>Đang tải kho hàng...</AppText>
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
            {/* Story Highlight Metrics on Mobile */}
            <View style={styles.fbMetricContainer}>
              <View style={styles.fbMetricCard}>
                <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Icon name="package-variant-closed" size={18} color={colors.brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="md" weight="bold" color="#050505">{materials.length}</AppText>
                  <AppText variant="sm" color="#65676B">Tổng mặt hàng</AppText>
                </View>
              </View>

              <View style={styles.fbMetricCard}>
                <View style={[styles.fbMetricIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="alert-circle-outline" size={18} color={colors.status.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="md" weight="bold" color={lowCount > 0 ? colors.status.danger : colors.status.success}>{lowCount}</AppText>
                  <AppText variant="sm" color="#65676B">Sắp hết kho</AppText>
                </View>
              </View>
            </View>

            {renderSearch()}
            {renderCategoryPills()}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="package-variant-remove"
            title="Kho hàng trống"
            subtitle="Nhấn nút + bên dưới để thêm nguyên liệu đầu tiên"
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
          <AppText variant="md" weight="bold" color="#050505">{materials.length} nguyên liệu</AppText>
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm nguyên liệu</AppText>
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
    maxWidth: 480,
  },
  fbMetricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface.card,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  fbMetricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  },
  searchInput: {
    flex: 1,
    ...font.md,
    color: colors.text.primary,
  },

  /* Filter chips */
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
  chipDangerActive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
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
  lowBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEE2E2',
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
  deleteBtn: { padding: 4 },

  /* Form modal & right panel */
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface.app,
  },
  catChipActive: {
    backgroundColor: colors.brand.primaryBg,
  },
  fieldInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...font.md,
    color: colors.text.primary,
    backgroundColor: colors.surface.app,
  },
  panelBox: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  panelStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  filterRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  panelCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    borderRadius: 999,
    height: 44,
  },
});

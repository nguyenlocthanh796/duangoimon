import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, ss } from '../../theme';
import { shape } from '../../theme/shape';
import { request } from '../../api/client';
import ScreenHeader from '../ui/ScreenHeader';
import { useSidebar } from '../../context/SidebarContext';
import { useResponsive } from '../../hooks/useResponsive';

const API = '/api/v1/quan-ly';
interface RM {
  id: string;
  code: string;
  name: string;
  unit: string;
  default_cost: number;
  current_stock: number;
  min_stock: number;
}

function formatVND(v: number) {
  return v.toLocaleString('vi-VN') + 'đ';
}

/* ── What-If Simulation ── */
function useSimulation(items: any[], salePrice: number) {
  const [simCosts, setSimCosts] = useState<Record<number, number>>({});
  const origCosts = useMemo(() => {
    const m: Record<number, number> = {};
    items.forEach((it, i) => {
      m[i] = it.cost || 0;
    });
    return m;
  }, [items]);

  const totalCost = useMemo(() => {
    return items.reduce(
      (sum, it, i) => sum + (simCosts[i] !== undefined ? simCosts[i] : it.cost || 0),
      0
    );
  }, [items, simCosts]);

  const foodCostPct = salePrice ? Math.round((totalCost / salePrice) * 100 * 100) / 100 : 0;

  return { simCosts, setSimCosts, totalCost, foodCostPct, resetSim: () => setSimCosts({}) };
}

/* ── Raw Material Picker ── */
function RawMaterialPicker({
  materials,
  value,
  onChange,
}: {
  materials: RM[];
  value: string;
  onChange: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const sel = materials.find((m) => m.id === value);
  const filtered = q.trim()
    ? materials.filter(
        (m) =>
          m.name.toLowerCase().includes(q.toLowerCase()) ||
          m.code?.toLowerCase().includes(q.toLowerCase())
      )
    : materials;
  return (
    <View>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[
          s.inputSmall,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          },
        ]}
      >
        <Text
          style={{ ...font.sm, color: sel ? colors.text.primary : colors.text.muted, flex: 1 }}
          numberOfLines={1}
        >
          {sel ? `${sel.code || ''} ${sel.name}` : 'Chọn NL...'}
        </Text>
        <Icon name="chevron-down" size={14} color={colors.icon.muted} />
      </TouchableOpacity>
      {open && (
        <View
          style={{
            position: 'absolute',
            zIndex: 999,
            top: 40,
            left: 0,
            right: 0,
            backgroundColor: colors.surface.card,
            borderWidth: 1,
            borderColor: colors.border.default,
            borderRadius: 10,
            maxHeight: 180,
            boxShadow: '0px 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Tìm NL..."
            style={{
              padding: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.default,
              ...font.sm,
            }}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {filtered.map((m) => {
              const isLowStock = m.current_stock < m.min_stock;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => {
                    onChange(m.id, m.name);
                    setOpen(false);
                    setQ('');
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: value === m.id ? colors.brand.primaryBg : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      ...font.sm,
                      fontWeight: value === m.id ? '700' : '400',
                      color: value === m.id ? colors.brand.primary : colors.text.primary,
                    }}
                  >
                    {m.code && <Text style={{ color: colors.text.muted }}>{m.code} </Text>}
                    {m.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ ...font.sm, color: colors.text.muted }}>
                      Tồn: {m.current_stock} {m.unit}
                    </Text>
                    {isLowStock && (
                      <Icon name="alert-circle-outline" size={12} color={colors.status.warning} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

/* ── Product Picker ── */
function ProductPicker({
  products = [],
  value,
  onChange,
}: {
  products: any[];
  value: string;
  onChange: (prod: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const sel = products.find((p) => p.id === value || p.product_id === value);
  const filtered = q.trim()
    ? products.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q.toLowerCase()) ||
          (p.code || '').toLowerCase().includes(q.toLowerCase())
      )
    : products;
  return (
    <View style={{ zIndex: 1000 }}>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={[
          s.input,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
          },
        ]}
      >
        <Text
          style={{ ...font.md, color: sel ? colors.text.primary : colors.text.muted, flex: 1 }}
          numberOfLines={1}
        >
          {sel ? `${sel.name} (${formatVND(sel.price || sel.selling_price || 0)})` : value || 'Chọn món ăn / đồ uống...'}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.icon.muted} />
      </TouchableOpacity>
      {open && (
        <View
          style={{
            position: 'absolute',
            zIndex: 1001,
            top: 48,
            left: 0,
            right: 0,
            backgroundColor: colors.surface.card,
            borderWidth: 1,
            borderColor: colors.border.default,
            borderRadius: 10,
            maxHeight: 200,
          }}
        >
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Tìm tên món ăn..."
            style={{
              padding: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.default,
              ...font.sm,
            }}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            {filtered.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => {
                  onChange(p);
                  setOpen(false);
                  setQ('');
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F1F5F9',
                  backgroundColor: value === p.id ? colors.brand.primaryBg : 'transparent',
                }}
              >
                <Text
                  style={{
                    ...font.smBold,
                    color: value === p.id ? colors.brand.primary : colors.text.primary,
                  }}
                >
                  {p.name}
                </Text>
                <Text style={{ ...font.sm, color: colors.text.muted }}>
                  Giá bán: {formatVND(p.price || p.selling_price || 0)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

/* ── Recipe Form ── */
interface Props {
  visible: boolean;
  materials: RM[];
  products?: any[];
  onClose: () => void;
  onSaved: () => void;
  editRecipe?: any;
  cloneFrom?: any;
}

export default function RecipeForm({
  visible,
  materials,
  products = [],
  onClose,
  onSaved,
  editRecipe,
  cloneFrom,
}: Props) {
  const isEdit = !!editRecipe;
  const isClone = !!cloneFrom;
  const source = editRecipe || cloneFrom;

  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [items, setItems] = useState<
    {
      raw_material_id: string;
      raw_material_name: string;
      quantity: string;
      unit: string;
      cost: string;
    }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [simMode, setSimMode] = useState(false);

  const salePrice = source?.product_price || 0;
  const { simCosts, setSimCosts, totalCost, foodCostPct, resetSim } = useSimulation(
    items,
    salePrice
  );

  useEffect(() => {
    if (source) {
      setProductId(source.product_id || '');
      setName(
        isClone
          ? `${source.name || source.recipe_name} (Copy)`
          : source.name || source.recipe_name || ''
      );
      const rawItems = source.items || source.ingredients || [];
      setItems(
        rawItems.map((it: any) => ({
          raw_material_id: it.raw_material_id || it.material_id || it.id || '',
          raw_material_name: it.raw_material_name || it.material_name || it.name || '',
          quantity: String(it.quantity ?? 0),
          unit: it.unit || 'kg',
          cost: String(it.cost ?? it.unit_price ?? 0),
        }))
      );
    } else {
      setProductId('');
      setName('');
      setItems([]);
    }
    resetSim();
    setSimMode(false);
  }, [visible]);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { raw_material_id: '', raw_material_name: '', quantity: '0', unit: 'kg', cost: '0' },
    ]);
  const updateItem = (idx: number, field: string, value: string) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!productId || !name || items.length === 0) return alert('Thiếu thông tin');
    setSaving(true);
    try {
      const body = JSON.stringify({
        product_id: productId,
        name,
        items: items.map((it) => ({
          raw_material_id: it.raw_material_id,
          quantity: parseFloat(it.quantity) || 0,
          unit: it.unit,
          cost: parseFloat(it.cost) || 0,
        })),
      });
      if (isEdit) {
        await request(API + `/recipes/${editRecipe.id}`, { method: 'PUT', body });
      } else {
        await request(API + '/recipes', { method: 'POST', body });
      }
      onSaved();
    } catch {
      alert('Lỗi lưu công thức.');
    } finally {
      setSaving(false);
    }
  };

  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { top: isWide ? 0 : -45, zIndex: 10000, backgroundColor: colors.surface.app || '#F8FAFC' }]}>
      <ScreenHeader
        title={isEdit ? 'Sửa công thức' : isClone ? 'Nhân bản công thức' : 'Tạo công thức mới'}
        subtitle={name ? `BOM: ${name}` : undefined}
        showBack
        onBackPress={onClose}
        onMenuPress={openSidebar}
        compact
        right={
          <TouchableOpacity
            onPress={save}
            disabled={saving}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: colors.brand.primary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
            }}
          >
            <Icon name="check" size={16} color="#FFF" />
            <Text style={{ ...font.smBold, color: '#FFF' }}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Text>
          </TouchableOpacity>
        }
      />

        {/* Simulation bar */}
        {salePrice > 0 && simMode && (
          <View style={s.simBar}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Text style={{ ...font.sm, color: colors.text.primary }}>
                💰 {formatVND(totalCost)}
              </Text>
              <Text
                style={{
                  ...font.sm,
                  color:
                    foodCostPct > 45
                      ? colors.status.danger
                      : foodCostPct > 30
                        ? colors.status.warning
                        : colors.status.success,
                }}
              >
                CP: {foodCostPct}%
              </Text>
              <Text style={{ ...font.sm, color: colors.text.secondary }}>
                LN: {formatVND(salePrice - totalCost)}
              </Text>
            </View>
          </View>
        )}

        <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          {/* CardBox 1: Thông tin món áp dụng BOM */}
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <Text style={{ ...font.smBold, color: '#1E293B', letterSpacing: 0.5 }}>
                THÔNG TIN MÓN ÁP DỤNG BOM
              </Text>
            </View>
            <View style={{ padding: 10, gap: 10 }}>
              <View style={{ zIndex: 2000 }}>
                <Text style={s.label}>Món ăn / Đồ uống áp dụng (*)</Text>
                <ProductPicker
                  products={products}
                  value={productId}
                  onChange={(p) => {
                    setProductId(p.id || p.product_id);
                    if (!name) setName(`BOM ${p.name}`);
                  }}
                />
              </View>
              <View>
                <Text style={s.label}>Tên công thức định lượng (*)</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="VD: BOM Phở Bò Đặc Biệt"
                  style={s.input}
                />
              </View>
            </View>
          </View>

          {/* CardBox 2: Danh sách nguyên liệu định lượng (BOM) */}
          <View style={ss.sectionWrap}>
            <View style={[ss.sectionHeader, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={{ ...font.smBold, color: '#1E293B', letterSpacing: 0.5 }}>
                ĐỊNH LƯỢNG NGUYÊN LIỆU ({items.length})
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {salePrice > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSimMode(!simMode);
                      if (simMode) resetSim();
                    }}
                    style={[s.miniBtn, simMode && { backgroundColor: colors.brand.primary + '20' }]}
                  >
                    <Icon
                      name="chart-timeline-variant"
                      size={14}
                      color={simMode ? colors.brand.primary : colors.text.muted}
                    />
                    <Text style={{ ...font.sm, color: simMode ? colors.brand.primary : colors.text.muted }}>
                      {simMode ? 'Mô phỏng' : 'What-If'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={addItem}
                  style={s.addBtnSm}
                >
                  <Icon name="plus" size={14} color="#FFF" />
                  <Text style={{ ...font.smBold, color: '#FFF' }}>Thêm NL</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ padding: 10, gap: 8 }}>
              {items.map((it, idx) => {
                const rm = materials.find((m) => m.id === it.raw_material_id);
                const isLowStock = rm ? rm.current_stock < rm.min_stock : false;

                return (
                  <View key={idx} style={s.ingredientRow}>
                    <View style={{ flex: 2 }}>
                      <RawMaterialPicker
                        materials={materials}
                        value={it.raw_material_id}
                        onChange={(id, rawName) => {
                          updateItem(idx, 'raw_material_id', id);
                          updateItem(idx, 'raw_material_name', rawName);
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        value={it.quantity}
                        onChangeText={(v) => updateItem(idx, 'quantity', v)}
                        placeholder="SL"
                        keyboardType="decimal-pad"
                        style={s.inputSmall}
                      />
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <TextInput
                        value={it.cost}
                        onChangeText={(v) => {
                          updateItem(idx, 'cost', v);
                          if (simMode) setSimCosts((prev) => ({ ...prev, [idx]: parseFloat(v) || 0 }));
                        }}
                        placeholder="CP (VNĐ)"
                        keyboardType="decimal-pad"
                        style={[s.inputSmall, simMode && { borderColor: colors.brand.primary }]}
                      />
                    </View>
                    {isLowStock && (
                      <Icon name="alert-circle-outline" size={16} color={colors.status.warning} />
                    )}
                    <TouchableOpacity onPress={() => removeItem(idx)} style={s.deleteBtnSm}>
                      <Icon name="trash-can-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {items.length === 0 && (
                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ ...font.sm, color: colors.text.muted, fontStyle: 'italic' }}>
                    Chưa có nguyên liệu. Nhấn "+ Thêm NL" để bắt đầu lập BOM.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  label: { ...font.smBold, color: colors.text.secondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 36,
    ...font.sm,
    color: colors.text.primary,
    backgroundColor: '#FFFFFF',
  },
  inputSmall: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 36,
    ...font.sm,
    color: colors.text.primary,
    backgroundColor: '#FFFFFF',
  },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  addBtnSm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.brand.primary,
  },
  deleteBtnSm: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF9E7',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
});

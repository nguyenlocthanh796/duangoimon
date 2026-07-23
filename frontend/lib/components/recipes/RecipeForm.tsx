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
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import { request } from '../../api/client';

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

/* ── Recipe Form ── */
interface Props {
  visible: boolean;
  materials: RM[];
  onClose: () => void;
  onSaved: () => void;
  editRecipe?: any;
  cloneFrom?: any;
}

export default function RecipeForm({
  visible,
  materials,
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
      setItems(
        (source.items || []).map((it: any) => ({
          raw_material_id: it.raw_material_id,
          raw_material_name: '',
          quantity: String(it.quantity || ''),
          unit: it.unit || 'kg',
          cost: String(it.cost || ''),
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ ...font.mdBold, color: colors.text.muted }}>Huỷ</Text>
          </TouchableOpacity>
          <Text style={{ ...font.lg, color: colors.text.primary }}>
            {isEdit ? 'Sửa công thức' : isClone ? 'Nhân bản công thức' : 'Công thức mới'}
          </Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            <Text
              style={{ ...font.mdBold, color: saving ? colors.text.muted : colors.brand.primary }}
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Text>
          </TouchableOpacity>
        </View>

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

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View>
            <Text style={s.label}>Món (ID sản phẩm)</Text>
            <TextInput
              value={productId}
              onChangeText={setProductId}
              placeholder="Nhập product_id..."
              style={s.input}
            />
          </View>
          <View>
            <Text style={s.label}>Tên công thức</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="VD: Phở bò - công thức chuẩn"
              style={s.input}
            />
          </View>

          <View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Text style={s.label}>Nguyên liệu</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
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
                      size={16}
                      color={simMode ? colors.brand.primary : colors.text.muted}
                    />
                    <Text
                      style={{
                        ...font.sm,
                        color: simMode ? colors.brand.primary : colors.text.muted,
                      }}
                    >
                      {simMode ? 'Đang mô phỏng' : 'What-If'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={addItem}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Icon name="plus-circle-outline" size={18} color={colors.brand.primary} />
                  <Text style={{ ...font.sm, color: colors.brand.primary }}>Thêm</Text>
                </TouchableOpacity>
              </View>
            </View>

            {items.map((it, idx) => {
              const rm = materials.find((m) => m.id === it.raw_material_id);
              const isLowStock = rm ? rm.current_stock < rm.min_stock : false;
              const currentCost =
                simMode && simCosts[idx] !== undefined ? simCosts[idx] : parseFloat(it.cost) || 0;

              return (
                <View key={idx} style={s.ingredientRow}>
                  <View style={{ flex: 2 }}>
                    <RawMaterialPicker
                      materials={materials}
                      value={it.raw_material_id}
                      onChange={(id, name) => {
                        updateItem(idx, 'raw_material_id', id);
                        updateItem(idx, 'raw_material_name', name);
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
                        if (simMode)
                          setSimCosts((prev) => ({ ...prev, [idx]: parseFloat(v) || 0 }));
                      }}
                      placeholder="CP"
                      keyboardType="decimal-pad"
                      style={[s.inputSmall, simMode && { borderColor: colors.brand.primary }]}
                    />
                  </View>
                  {isLowStock && (
                    <Icon name="alert-circle-outline" size={18} color={colors.status.warning} />
                  )}
                  <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 8 }}>
                    <Icon name="close-circle" size={20} color={colors.status.danger} />
                  </TouchableOpacity>
                </View>
              );
            })}

            {items.length === 0 && (
              <Text style={{ ...font.sm, color: colors.text.muted, fontStyle: 'italic' }}>
                Chưa có nguyên liệu. Nhấn "Thêm" để bắt đầu.
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 10,
    padding: 12,
    ...font.md,
    color: colors.text.primary,
    backgroundColor: colors.surface.app,
  },
  inputSmall: {
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 8,
    ...font.sm,
    color: colors.text.primary,
    backgroundColor: colors.surface.app,
  },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: shape.radius.sm,
    backgroundColor: colors.surface.disabled,
  },
  simBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF9E7',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
});

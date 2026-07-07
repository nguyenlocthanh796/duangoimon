import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { request } from '../../api/client';

const API = '/api/v1/quan-ly';

/* ── Raw Material Picker ── */

export function RawMaterialPicker({ materials, value, onChange }: {
  materials: any[]; value: string; onChange: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const sel = materials.find(m => m.id === value);
  const filtered = q.trim()
    ? materials.filter(m => m.name.toLowerCase().includes(q.toLowerCase()) || m.code?.toLowerCase().includes(q.toLowerCase()))
    : materials;
  return (
    <View>
      <TouchableOpacity onPress={() => setOpen(true)}
        style={[s.inputSmall, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }]}>
        <Text style={{ ...font.caption, color: sel ? colors.text.primary : colors.text.muted, flex: 1 }} numberOfLines={1}>
          {sel ? `${sel.code || ''} ${sel.name}` : 'Chọn NL...'}
        </Text>
        <Icon name="chevron-down" size={14} color={colors.icon.muted} />
      </TouchableOpacity>
      {open && (
        <View style={{ position: 'absolute', zIndex: 999, top: 40, left: 0, right: 0, backgroundColor: colors.surface.card, borderWidth: 1, borderColor: colors.border.default, borderRadius: 10, maxHeight: 180, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }}>
          <TextInput value={q} onChangeText={setQ} placeholder="Tìm NL..." style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border.default, ...font.caption }} />
          <ScrollView keyboardShouldPersistTaps="handled">
            {filtered.map(m => (
              <TouchableOpacity key={m.id} onPress={() => { onChange(m.id, m.name); setOpen(false); setQ(''); }}
                style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: value === m.id ? colors.brand.primaryBg : 'transparent' }}>
                <Text style={{ ...font.caption, fontWeight: value === m.id ? '700' : '400', color: value === m.id ? colors.brand.primary : colors.text.primary }}>
                  {m.code && <Text style={{ color: colors.text.muted }}>{m.code} </Text>}{m.name}
                </Text>
                <Text style={{ ...font.micro, color: colors.text.muted }}>Tồn: {m.current_stock} {m.unit}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

/* ── Recipe Form ── */

export default function RecipeForm({ visible, materials, onClose, onSaved }: {
  visible: boolean; materials: any[]; onClose: () => void; onSaved: () => void;
}) {
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [items, setItems] = useState<{ raw_material_id: string; raw_material_name: string; quantity: string; unit: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems(prev => [...prev, { raw_material_id: '', raw_material_name: '', quantity: '0', unit: 'kg' }]);
  const updateItem = (idx: number, field: string, value: string) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!productId || !name || items.length === 0) return alert('Thiếu thông tin');
    setSaving(true);
    try {
      await request(API + '/recipes', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, name, items: items.map(it => ({ raw_material_id: it.raw_material_id, raw_material_name: it.raw_material_name || undefined, quantity: parseFloat(it.quantity) || 0, unit: it.unit })) }),
      });
      onSaved();
    } catch { alert('Lỗi tạo công thức.'); } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text></TouchableOpacity>
          <Text style={{ ...font.h2, color: colors.text.primary }}>Công thức mới</Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            <Text style={{ ...font.button, color: saving ? colors.text.muted : colors.brand.primary }}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>          
          <View>
            <Text style={s.label}>Món (ID sản phẩm)</Text>
            <TextInput value={productId} onChangeText={setProductId} placeholder="Nhập product_id..." style={s.input} />
          </View>
          <View>
            <Text style={s.label}>Tên công thức</Text>
            <TextInput value={name} onChangeText={setName} placeholder="VD: Phở bò - công thức chuẩn" style={s.input} />
          </View>
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={s.label}>Nguyên liệu</Text>
              <TouchableOpacity onPress={addItem} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="plus-circle-outline" size={18} color={colors.brand.primary} />
                <Text style={{ ...font.tab, color: colors.brand.primary }}>Thêm</Text>
              </TouchableOpacity>
            </View>
            {items.map((it, idx) => (
              <View key={idx} style={s.ingredientRow}>
                <View style={{ flex: 2 }}>
                  <RawMaterialPicker materials={materials} value={it.raw_material_id}
                    onChange={(id, name) => { updateItem(idx, 'raw_material_id', id); updateItem(idx, 'raw_material_name', name); }} />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput value={it.quantity} onChangeText={v => updateItem(idx, 'quantity', v)} placeholder="SL" keyboardType="decimal-pad" style={s.inputSmall} />
                </View>
                <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 8 }}>
                  <Icon name="close-circle" size={20} color={colors.status.danger} />
                </TouchableOpacity>
              </View>
            ))}
            {items.length === 0 && <Text style={{ ...font.caption, color: colors.text.muted, fontStyle: 'italic' }}>Chưa có nguyên liệu. Nhấn "Thêm" để bắt đầu.</Text>}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View>{children}</View>;
}

const s = StyleSheet.create({
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
  label: { ...font.label, color: colors.text.secondary, marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: 10, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app },
  inputSmall: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: 8, padding: 8, ...font.caption, color: colors.text.primary, backgroundColor: colors.surface.app },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
});

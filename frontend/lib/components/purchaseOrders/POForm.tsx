import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { request } from '../../api/client';

const API = '/api/v1/quan-ly';

export default function POForm({
  visible,
  suppliers,
  materials,
  onClose,
  onSaved,
}: {
  visible: boolean;
  suppliers: any[];
  materials: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<
    { raw_material_id: string; raw_material_name: string; quantity: string; unit_price: string }[]
  >([]);
  const [saving, setSaving] = useState(false);

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { raw_material_id: '', raw_material_name: '', quantity: '0', unit_price: '0' },
    ]);
  const updateItem = (idx: number, field: string, value: string) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!supplierId || items.length === 0) return alert('Thiếu thông tin');
    setSaving(true);
    try {
      await request(API + '/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: supplierId,
          note: note || undefined,
          items: items.map((it) => ({
            raw_material_id: it.raw_material_id,
            raw_material_name: it.raw_material_name || undefined,
            quantity: parseFloat(it.quantity) || 0,
            unit_price: parseFloat(it.unit_price) || 0,
          })),
        }),
      });
      onSaved();
    } catch {
      alert('Lỗi tạo PO.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text>
          </TouchableOpacity>
          <Text style={{ ...font.sectionTitle, color: colors.text.primary }}>PO mới</Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            <Text
              style={{ ...font.button, color: saving ? colors.text.muted : colors.brand.primary }}
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16, gap: 16 }}>
          <View>
            <Text style={s.label}>Nhà cung cấp</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {suppliers.map((sup) => (
                <TouchableOpacity
                  key={sup.id}
                  onPress={() => setSupplierId(sup.id)}
                  style={[s.supChip, supplierId === sup.id && s.supChipActive]}
                >
                  <Text style={[s.supChipText, supplierId === sup.id && s.supChipTextActive]}>
                    {sup.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View>
            <Text style={s.label}>Ghi chú</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Ghi chú..."
              style={s.input}
            />
          </View>
          <View>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}
            >
              <Text style={s.label}>Nguyên liệu</Text>
              <TouchableOpacity onPress={addItem} style={{ flexDirection: 'row', gap: 4 }}>
                <Icon name="plus-circle" size={18} color={colors.brand.primary} />
                <Text style={{ ...font.bodySmall, color: colors.brand.primary }}>Thêm</Text>
              </TouchableOpacity>
            </View>
            {items.map((it, idx) => (
              <View
                key={idx}
                style={{ flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' }}
              >
                <View style={{ flex: 2 }}>
                  <TextInput
                    value={it.raw_material_id}
                    onChangeText={(v) => updateItem(idx, 'raw_material_id', v)}
                    placeholder="ID NL"
                    style={s.inputSmall}
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
                <View style={{ flex: 1 }}>
                  <TextInput
                    value={it.unit_price}
                    onChangeText={(v) => updateItem(idx, 'unit_price', v)}
                    placeholder="ĐG"
                    keyboardType="decimal-pad"
                    style={s.inputSmall}
                  />
                </View>
                <TouchableOpacity onPress={() => removeItem(idx)}>
                  <Icon name="close-circle" size={20} color={colors.status.danger} />
                </TouchableOpacity>
              </View>
            ))}
            {items.length === 0 && (
              <Text style={{ fontStyle: 'italic', ...font.caption, color: colors.text.muted }}>
                Chưa có nguyên liệu.
              </Text>
            )}
          </View>
        </View>
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
  label: { ...font.label, color: colors.text.secondary, marginBottom: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 10,
    padding: 12,
    ...font.body,
    color: colors.text.primary,
    backgroundColor: colors.surface.app,
  },
  inputSmall: {
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 8,
    ...font.caption,
    color: colors.text.primary,
    backgroundColor: colors.surface.app,
    width: 80,
    textAlign: 'center',
  },
  supChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.app,
  },
  supChipActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primaryBg },
  supChipText: { ...font.caption, color: colors.text.secondary },
  supChipTextActive: { color: colors.brand.primary, fontWeight: '600' },
});

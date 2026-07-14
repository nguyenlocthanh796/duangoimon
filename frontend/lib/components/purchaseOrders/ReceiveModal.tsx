import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { request } from '../../api/client';

const API = '/api/v1/quan-ly';

export default function ReceiveModal({
  visible,
  po,
  onClose,
  onSaved,
}: {
  visible: boolean;
  po: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [receives, setReceives] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (po?.items) {
      const init: Record<string, string> = {};
      po.items.forEach((it: any) => {
        const remaining = it.quantity - (it.received_quantity || 0);
        init[it.raw_material_id || it.id] = String(remaining > 0 ? remaining : it.quantity);
      });
      setReceives(init);
    }
  }, [po]);

  const save = async () => {
    setSaving(true);
    try {
      await request(`${API}/purchase-orders/${po.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          items: Object.entries(receives).map(([raw_material_id, quantity]) => ({
            raw_material_id,
            quantity: parseFloat(quantity) || 0,
          })),
        }),
      });
      onSaved();
    } catch {
      alert('Nhập kho thất bại.');
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
          <Text style={{ ...font.sectionTitle, color: colors.text.primary }}>Nhập kho · {po?.po_number}</Text>
          <TouchableOpacity onPress={save} disabled={saving}>
            <Text
              style={{ ...font.button, color: saving ? colors.text.muted : colors.brand.primary }}
            >
              {saving ? 'Đang xử lý...' : 'Xác nhận'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          {po?.items?.map((it: any) => (
            <View
              key={it.id || it.raw_material_id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ ...font.body, color: colors.text.primary }}>
                  {it.raw_material_name}
                </Text>
                <Text style={{ ...font.caption, color: colors.text.muted }}>
                  Đã đặt: {it.quantity} · Đã nhận: {it.received_quantity || 0}
                </Text>
              </View>
              <TextInput
                value={receives[it.raw_material_id || it.id] || '0'}
                onChangeText={(v) =>
                  setReceives((prev) => ({ ...prev, [it.raw_material_id || it.id]: v }))
                }
                keyboardType="decimal-pad"
                style={s.inputSmall}
              />
            </View>
          ))}
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
});

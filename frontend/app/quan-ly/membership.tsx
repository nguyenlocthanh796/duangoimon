"use client";
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { MembershipTier, LoyaltyPoint } from '../../lib/api/client';

export default function MembershipScreen() {
  const { openSidebar } = useSidebar();
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MembershipTier | null>(null);
  const [form, setForm] = useState({ name: '', min_spent: '0', discount_rate: '0', multiplier: '1', color: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request<MembershipTier[]>(`/api/v1/quan-ly/membership/tiers`);
      setTiers(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ name: '', min_spent: '0', discount_rate: '0', multiplier: '1', color: '' }); setShowForm(true); };

  const save = async () => {
    if (!form.name) return;
    try {
      const body = { ...form, min_spent: Number(form.min_spent), discount_rate: Number(form.discount_rate), multiplier: Number(form.multiplier) };
      if (editing) {
        await request(`/api/v1/quan-ly/membership/tiers/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await request('/api/v1/quan-ly/membership/tiers', { method: 'POST', body: JSON.stringify(body) });
      }
      setShowForm(false); load();
    } catch { /* ignore */ }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Icon name="menu" size={22} color={colors.icon.default} /></TouchableOpacity>
          <View>
            <Text style={{ ...font.h1, color: colors.text.primary }}>Hội Viên 🏆</Text>
            <Text style={{ ...font.caption, color: colors.text.muted }}>{tiers.length} hạng</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openNew} style={styles.addBtn}><Icon name="plus" size={18} color={colors.text.inverse} /><Text style={{ color: colors.text.inverse, ...font.tab }}>Thêm</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={tiers} keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40, gap: 12 }}><Icon name="crown" size={48} color={colors.text.muted} /><Text style={{ ...font.body, color: colors.text.muted }}>Chưa có hạng</Text></View>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color || '#94A3B8' }} />
                <Text style={{ ...font.h3, color: colors.text.primary, flex: 1 }}>{item.name}</Text>
                <Text style={{ ...font.badge, color: colors.text.muted }}>{item.discount_rate}% giảm</Text>
              </View>
              <Text style={{ ...font.caption, color: colors.text.secondary, marginTop: 4 }}>Mức chi {item.min_spent.toLocaleString('vi-VN')}đ · ×{item.multiplier} điểm</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text></TouchableOpacity>
            <Text style={{ ...font.h2, color: colors.text.primary }}>Hạng mới</Text>
            <TouchableOpacity onPress={save}><Text style={{ ...font.button, color: colors.brand.primary }}>Lưu</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <TextField label="Tên hạng *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
            <TextField label="Mức chi tối thiểu" value={form.min_spent} onChangeText={v => setForm(p => ({ ...p, min_spent: v }))} keyboardType="decimal-pad" />
            <TextField label="Giảm giá (%)" value={form.discount_rate} onChangeText={v => setForm(p => ({ ...p, discount_rate: v }))} keyboardType="decimal-pad" />
            <TextField label="Hệ số điểm" value={form.multiplier} onChangeText={v => setForm(p => ({ ...p, multiplier: v }))} keyboardType="decimal-pad" />
            <TextField label="Màu (hex)" value={form.color} onChangeText={v => setForm(p => ({ ...p, color: v }))} placeholder="#..." />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function TextField({ label, value, onChangeText, keyboardType, multiline, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; keyboardType?: any; multiline?: boolean; placeholder?: string }) {
  return (
    <View>
      <Text style={{ ...font.label, color: colors.text.secondary, marginBottom: 4 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholder={placeholder}
        multiline={multiline} numberOfLines={multiline ? 3 : 1}
        style={{ borderWidth: 1.5, borderColor: colors.border.default, borderRadius: 10, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.default, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.brand.primary },
  card: { backgroundColor: colors.surface.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border.default },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
});

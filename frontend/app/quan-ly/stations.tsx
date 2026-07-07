"use client";
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Station } from '../../lib/api/client';

export default function StationsScreen() {
  const { openSidebar } = useSidebar();
  const [items, setItems] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [form, setForm] = useState({ name: '', code: '', categories: '', printer_name: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await request('/api/v1/quan-ly/stations');
      setItems(Array.isArray(data) ? data : (data.items || []));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ name: '', code: '', categories: '', printer_name: '' }); setShowForm(true); };
  const openEdit = (s: Station) => { setEditing(s); setForm({ name: s.name, code: s.code, categories: (s.categories || []).join(', '), printer_name: s.printer_name || '' }); setShowForm(true); };

  const save = async () => {
    if (!form.name || !form.code) return;
    try {
      const body = { name: form.name, code: form.code, categories: form.categories.split(',').map(s => s.trim()).filter(Boolean), printer_name: form.printer_name || undefined };
      if (editing) {
        await request(`/api/v1/quan-ly/stations/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await request('/api/v1/quan-ly/stations', { method: 'POST', body: JSON.stringify(body) });
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
            <Text style={{ ...font.h1, color: colors.text.primary }}>Trạm Bếp 🔥</Text>
            <Text style={{ ...font.caption, color: colors.text.muted }}>{items.length} trạm</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openNew} style={styles.addBtn}><Icon name="plus" size={18} color={colors.text.inverse} /><Text style={{ color: colors.text.inverse, ...font.tab }}>Thêm</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items} keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40, gap: 12 }}><Icon name="stove" size={48} color={colors.text.muted} /><Text style={{ ...font.body, color: colors.text.muted }}>Chưa có trạm</Text></View>}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ ...font.h3, color: colors.text.primary }}>{item.name}</Text>
                <Text style={{ ...font.badge, color: colors.text.muted }}>{item.code}</Text>
              </View>
              <Text style={{ ...font.caption, color: colors.text.secondary, marginTop: 4 }}>
                {(item.categories || []).join(', ') || 'Tất cả'} {item.printer_name ? `· 🖨️ ${item.printer_name}` : ''}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text></TouchableOpacity>
            <Text style={{ ...font.h2, color: colors.text.primary }}>{editing ? 'Sửa trạm' : 'Trạm mới'}</Text>
            <TouchableOpacity onPress={save}><Text style={{ ...font.button, color: colors.brand.primary }}>Lưu</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <TextField label="Tên *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
            <TextField label="Mã *" value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} />
            <TextField label="Danh mục (cách nhau bằng dấu phẩy)" value={form.categories} onChangeText={v => setForm(p => ({ ...p, categories: v }))} />
            <TextField label="Tên máy in" value={form.printer_name} onChangeText={v => setForm(p => ({ ...p, printer_name: v }))} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function TextField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View>
      <Text style={{ ...font.label, color: colors.text.secondary, marginBottom: 4 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText}
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

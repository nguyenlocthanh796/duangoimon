"use client";
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Branch } from '../../lib/api/client';

export default function BranchesScreen() {
  const { openSidebar } = useSidebar();
  const [items, setItems] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await request('/api/v1/quan-ly/branches');
      setItems(Array.isArray(data) ? data : (data.items || []));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ name: '', code: '', address: '', phone: '' }); setShowForm(true); };
  const openEdit = (b: Branch) => { setEditing(b); setForm({ name: b.name, code: b.code, address: b.address || '', phone: b.phone || '' }); setShowForm(true); };

  const save = async () => {
    if (!form.name || !form.code) return;
    try {
      if (editing) {
        await request(`/api/v1/quan-ly/branches/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await request('/api/v1/quan-ly/branches', { method: 'POST', body: JSON.stringify(form) });
      }
      setShowForm(false); load();
    } catch { /* ignore */ }
  };

  const del = async (id: string) => {
    try {
      await request(`/api/v1/quan-ly/branches/${id}`, { method: 'DELETE' });
      load();
    } catch { /* ignore */ }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Icon name="menu" size={22} color={colors.icon.default} /></TouchableOpacity>
          <View>
            <Text style={{ ...font.h1, color: colors.text.primary }}>Chi Nhánh 🏢</Text>
            <Text style={{ ...font.caption, color: colors.text.muted }}>{items.length} chi nhánh</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openNew} style={styles.addBtn}><Icon name="plus" size={18} color={colors.text.inverse} /><Text style={{ color: colors.text.inverse, ...font.tab }}>Thêm</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items} keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40, gap: 12 }}><Icon name="domain" size={48} color={colors.text.muted} /><Text style={{ ...font.body, color: colors.text.muted }}>Chưa có chi nhánh</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...font.h3, color: colors.text.primary }}>{item.name}</Text>
                  <Text style={{ ...font.badge, color: colors.text.muted }}>{item.code}</Text>
                  {item.address && <Text style={{ ...font.caption, color: colors.text.secondary, marginTop: 2 }}>{item.address}</Text>}
                  {item.phone && <Text style={{ ...font.caption, color: colors.text.secondary }}>{item.phone}</Text>}
                </View>
                <View style={{ gap: 4 }}>
                  <TouchableOpacity onPress={() => openEdit(item)}><Icon name="pencil" size={18} color={colors.text.muted} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => del(item.id)}><Icon name="delete" size={18} color="#DC2626" /></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text></TouchableOpacity>
            <Text style={{ ...font.h2, color: colors.text.primary }}>{editing ? 'Sửa CN' : 'CN mới'}</Text>
            <TouchableOpacity onPress={save}><Text style={{ ...font.button, color: colors.brand.primary }}>Lưu</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <TextField label="Tên *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
            <TextField label="Mã *" value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} />
            <TextField label="Địa chỉ" value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} multiline />
            <TextField label="SĐT" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function TextField({ label, value, onChangeText, keyboardType, multiline }: { label: string; value: string; onChangeText: (v: string) => void; keyboardType?: any; multiline?: boolean }) {
  return (
    <View>
      <Text style={{ ...font.label, color: colors.text.secondary, marginBottom: 4 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType}
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

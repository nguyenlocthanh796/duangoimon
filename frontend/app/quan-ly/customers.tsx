"use client";
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Customer } from '../../lib/api/client';

const API = '/api/v1/quan-ly';

export default function CustomersScreen() {
  const { openSidebar } = useSidebar();
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await request<Customer[]>(`${API}/customers${params}`);
      setItems(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function formatVND(v: number) { return v.toLocaleString('vi-VN') + 'đ'; }

  const openNew = () => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '' }); setShowForm(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '' }); setShowForm(true); };

  const save = async () => {
    if (!form.name || !form.phone) return;
    try {
      if (editing) {
        await request(`${API}/customers/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await request(`${API}/customers`, { method: 'POST', body: JSON.stringify(form) });
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
            <Text style={{ ...font.h1, color: colors.text.primary }}>Khách Hàng 👥</Text>
            <Text style={{ ...font.caption, color: colors.text.muted }}>{items.length} khách</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openNew} style={styles.addBtn}>
          <Icon name="plus" size={18} color={colors.text.inverse} />
          <Text style={{ color: colors.text.inverse, ...font.tab }}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 12 }}>
        <TextInput value={search} onChangeText={setSearch} placeholder="🔍 Tìm tên, SĐT..." style={styles.searchInput} />
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items} keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Icon name="account-group" size={48} color={colors.text.muted} />
              <Text style={{ ...font.body, color: colors.text.muted }}>Chưa có khách hàng</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ ...font.h3, color: colors.text.primary }}>{item.name}</Text>
                <Text style={{ ...font.badge, color: item.is_active ? '#16A34A' : '#94A3B8' }}>{item.is_active ? 'Hoạt động' : 'Ẩn'}</Text>
              </View>
              <Text style={{ ...font.caption, color: colors.text.secondary, marginTop: 4 }}>{item.phone}{item.email ? ` · ${item.email}` : ''}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                <Text style={{ ...font.caption, color: colors.text.muted }}>Đã chi: {formatVND(item.total_spent)}</Text>
                <Text style={{ ...font.caption, color: colors.text.muted }}>{item.visit_count} lượt</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text></TouchableOpacity>
            <Text style={{ ...font.h2, color: colors.text.primary }}>{editing ? 'Sửa KH' : 'KH mới'}</Text>
            <TouchableOpacity onPress={save}><Text style={{ ...font.button, color: colors.brand.primary }}>Lưu</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <TextField label="Tên *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
            <TextField label="SĐT *" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
            <TextField label="Email" value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} keyboardType="email-address" />
            <TextField label="Địa chỉ" value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} multiline />
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
  searchInput: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: 12, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.card },
  card: { backgroundColor: colors.surface.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border.default },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
});

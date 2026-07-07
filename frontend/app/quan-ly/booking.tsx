"use client";
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Booking } from '../../lib/api/client';

const API = '/api/v1/quan-ly';

const STATUS_OPTS = ['pending', 'confirmed', 'cancelled', 'arrived'];
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Chờ XN', color: '#D97706', bg: '#FFFBEB' },
  confirmed: { label: 'Đã XN',  color: '#16A34A', bg: '#DCFCE7' },
  cancelled: { label: 'Đã Huỷ', color: '#DC2626', bg: '#FEE2E2' },
  arrived:   { label: 'Đã đến', color: '#2563EB', bg: '#EFF6FF' },
};

export default function BookingScreen() {
  const { openSidebar } = useSidebar();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState({ customer_name: '', phone: '', email: '', guest_count: '2', note: '' });
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const data = await request<Booking[]>(`${API}/booking${params}`);
      setItems(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ customer_name: '', phone: '', email: '', guest_count: '2', note: '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.customer_name || !form.phone) return;
    try {
      if (editing) {
        await request(`${API}/booking/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await request(`${API}/booking`, { method: 'POST', body: JSON.stringify({ ...form, guest_count: Number(form.guest_count), booked_at: new Date().toISOString() }) });
      }
      setShowForm(false);
      load();
    } catch { /* ignore */ }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await request(`${API}/booking/${id}/${status === 'confirmed' ? 'confirm' : status === 'cancelled' ? 'cancel' : 'arrive'}`, { method: 'POST' });
      load();
    } catch { /* ignore */ }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Icon name="menu" size={22} color={colors.icon.default} /></TouchableOpacity>
          <View>
            <Text style={{ ...font.h1, color: colors.text.primary }}>Đặt Bàn 📅</Text>
            <Text style={{ ...font.caption, color: colors.text.muted }}>{items.length} đặt bàn</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openNew} style={styles.addBtn}>
          <Icon name="plus" size={18} color={colors.text.inverse} />
          <Text style={{ color: colors.text.inverse, ...font.tab }}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Status filter tabs */}
      <View style={{ flexDirection: 'row', gap: 6, padding: 12 }}>
        {['', ...STATUS_OPTS].map(s => (
          <TouchableOpacity key={s} onPress={() => setStatusFilter(s)}
            style={[styles.filterTab, { backgroundColor: statusFilter === s ? colors.brand.primary : colors.surface.disabled }]}>
            <Text style={{ ...font.tab, color: statusFilter === s ? colors.text.inverse : colors.text.muted }}>
              {s ? STATUS_MAP[s]?.label : 'Tất cả'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items} keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Icon name="calendar-text" size={48} color={colors.text.muted} />
              <Text style={{ ...font.body, color: colors.text.muted }}>Chưa có đặt bàn</Text>
            </View>
          }
          renderItem={({ item }) => {
            const st = STATUS_MAP[item.status] || STATUS_MAP.pending;
            return (
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.h3, color: colors.text.primary }}>{item.customer_name}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={{ ...font.caption, color: colors.text.secondary, marginTop: 4 }}>
                  {item.phone}{item.email ? ` · ${item.email}` : ''}
                </Text>
                <Text style={{ ...font.caption, color: colors.text.muted, marginTop: 2 }}>
                  {item.guest_count} khách · {item.booked_at ? new Date(item.booked_at).toLocaleDateString('vi-VN') : ''}
                </Text>
                {item.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity onPress={() => updateStatus(item.id, 'confirmed')} style={[styles.actionBtn, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={{ ...font.tab, color: '#16A34A' }}>Xác nhận</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => updateStatus(item.id, 'cancelled')} style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={{ ...font.tab, color: '#DC2626' }}>Huỷ</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text></TouchableOpacity>
            <Text style={{ ...font.h2, color: colors.text.primary }}>Đặt bàn mới</Text>
            <TouchableOpacity onPress={save}><Text style={{ ...font.button, color: colors.brand.primary }}>Lưu</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <TextField label="Tên khách *" value={form.customer_name} onChangeText={v => setForm(p => ({ ...p, customer_name: v }))} />
            <TextField label="Số điện thoại *" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
            <TextField label="Email" value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} keyboardType="email-address" />
            <TextField label="Số khách" value={form.guest_count} onChangeText={v => setForm(p => ({ ...p, guest_count: v }))} keyboardType="number-pad" />
            <TextField label="Ghi chú" value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} multiline />
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
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { ...font.badge, fontWeight: '700' },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
});

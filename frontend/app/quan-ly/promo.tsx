"use client";
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Voucher, PromoRule } from '../../lib/api/client';

export default function PromoScreen() {
  const { openSidebar } = useSidebar();
  const [tab, setTab] = useState<'voucher'|'rule'>('voucher');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [rules, setRules] = useState<PromoRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: '', name: '', type: 'percent', value: '0', min_order: '0', valid_from: '', valid_until: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [v, r] = await Promise.all([
        request<Voucher[]>('/api/v1/quan-ly/promo/vouchers'),
        request<PromoRule[]>('/api/v1/quan-ly/promo/rules'),
      ]);
      setVouchers(v); setRules(r);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items: any[] = tab === 'voucher' ? vouchers : rules;

  const openNew = () => { setEditing(null); setForm({ code: '', name: '', type: 'percent', value: '0', min_order: '0', valid_from: '', valid_until: '' }); setShowForm(true); };

  const save = async () => {
    if (tab !== 'voucher' || !form.code || !form.name) return;
    try {
      const body = { ...form, value: Number(form.value), min_order: Number(form.min_order) };
      await request('/api/v1/quan-ly/promo/vouchers', { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false); load();
    } catch { /* ignore */ }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Icon name="menu" size={22} color={colors.icon.default} /></TouchableOpacity>
          <Text style={{ ...font.h1, color: colors.text.primary }}>Khuyến Mãi 🎫</Text>
        </View>
        <TouchableOpacity onPress={openNew} style={styles.addBtn}><Icon name="plus" size={18} color={colors.text.inverse} /><Text style={{ color: colors.text.inverse, ...font.tab }}>Thêm</Text></TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        <TouchableOpacity onPress={() => setTab('voucher')} style={[styles.tab, { backgroundColor: tab === 'voucher' ? colors.brand.primary : colors.surface.disabled }]}>
          <Text style={{ ...font.tab, color: tab === 'voucher' ? colors.text.inverse : colors.text.muted }}>Voucher ({vouchers.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('rule')} style={[styles.tab, { backgroundColor: tab === 'rule' ? colors.brand.primary : colors.surface.disabled }]}>
          <Text style={{ ...font.tab, color: tab === 'rule' ? colors.text.inverse : colors.text.muted }}>Quy tắc ({rules.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items} keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40, gap: 12 }}><Icon name="ticket-outline" size={48} color={colors.text.muted} /><Text style={{ ...font.body, color: colors.text.muted }}>Chưa có</Text></View>}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ ...font.h3, color: colors.text.primary }}>{item.name || item.code}</Text>
                <View style={[styles.badge, { backgroundColor: (item as any).is_active ? '#DCFCE7' : '#F1F5F9' }]}>
                  <Text style={{ ...font.badge, color: (item as any).is_active ? '#16A34A' : '#94A3B8' }}>{(item as any).is_active ? 'Hoạt động' : 'Tắt'}</Text>
                </View>
              </View>
              {tab === 'voucher' && (
                <Text style={{ ...font.caption, color: colors.text.muted, marginTop: 4 }}>
                  Mã: {(item as Voucher).code} · {(item as Voucher).type === 'percent' ? `${(item as Voucher).value}%` : `${(item as Voucher).value.toLocaleString('vi-VN')}đ`} · Đã dùng {(item as Voucher).used_count}
                </Text>
              )}
              {tab === 'rule' && (
                <Text style={{ ...font.caption, color: colors.text.muted, marginTop: 4 }}>Loại: {(item as PromoRule).type}</Text>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text></TouchableOpacity>
            <Text style={{ ...font.h2, color: colors.text.primary }}>Voucher mới</Text>
            <TouchableOpacity onPress={save}><Text style={{ ...font.button, color: colors.brand.primary }}>Lưu</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <TextField label="Mã *" value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} />
            <TextField label="Tên *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setForm(p => ({ ...p, type: 'percent' }))} style={[styles.typeBtn, { backgroundColor: form.type === 'percent' ? colors.brand.primary : colors.surface.disabled }]}>
                <Text style={{ ...font.tab, color: form.type === 'percent' ? colors.text.inverse : colors.text.muted }}>%</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setForm(p => ({ ...p, type: 'fixed' }))} style={[styles.typeBtn, { backgroundColor: form.type === 'fixed' ? colors.brand.primary : colors.surface.disabled }]}>
                <Text style={{ ...font.tab, color: form.type === 'fixed' ? colors.text.inverse : colors.text.muted }}>Tiền mặt</Text>
              </TouchableOpacity>
            </View>
            <TextField label="Giá trị" value={form.value} onChangeText={v => setForm(p => ({ ...p, value: v }))} keyboardType="decimal-pad" />
            <TextField label="Đơn tối thiểu" value={form.min_order} onChangeText={v => setForm(p => ({ ...p, min_order: v }))} keyboardType="decimal-pad" />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function TextField({ label, value, onChangeText, keyboardType, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; keyboardType?: any; placeholder?: string }) {
  return (
    <View>
      <Text style={{ ...font.label, color: colors.text.secondary, marginBottom: 4 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholder={placeholder}
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
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  typeBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, flex: 1, alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
});

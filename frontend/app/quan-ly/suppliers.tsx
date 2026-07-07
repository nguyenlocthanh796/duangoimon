"use client";
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';

const API = '/api/v1/quan-ly';

export default function SuppliersScreen() {
  const { openSidebar } = useSidebar();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: '', name: '', phone: '', email: '', contact_person: '', address: '', tax_code: '', payment_terms: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request<any[]>(API + '/suppliers');
      setSuppliers(data);
    } catch (e) {
      console.error('Failed to load suppliers', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ code: '', name: '', phone: '', email: '', contact_person: '', address: '', tax_code: '', payment_terms: '' }); setShowForm(true); };
  const openEdit = (s: any) => { setEditing(s); setForm({ code: s.code, name: s.name, phone: s.phone || '', email: s.email || '', contact_person: s.contact_person || '', address: s.address || '', tax_code: s.tax_code || '', payment_terms: s.payment_terms || '' }); setShowForm(true); };

  const save = async () => {
    if (!form.code || !form.name) return;
    try {
      if (editing) {
        await request(API + `/suppliers/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await request(API + '/suppliers', { method: 'POST', body: JSON.stringify(form) });
      }
      setShowForm(false);
      load();
    } catch { console.error('Save failed'); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Icon name="menu" size={22} color={colors.icon.default} /></TouchableOpacity>
          <View>
            <Text style={{ ...font.h1, color: colors.text.primary }}>Nhà Cung Cấp 🚚</Text>
            <Text style={{ ...font.caption, color: colors.text.muted }}>{suppliers.length} NCC</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openNew} style={styles.addBtn}>
          <Icon name="plus" size={18} color={colors.text.inverse} />
          <Text style={{ color: colors.text.inverse, ...font.tab }}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={suppliers}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Icon name="truck" size={48} color={colors.text.muted} />
              <Text style={{ ...font.body, color: colors.text.muted }}>Chưa có NCC</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openEdit(item)} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ ...font.h3, color: colors.text.primary }}>{item.name}</Text>
                <Text style={{ ...font.badge, color: colors.text.muted }}>{item.code}</Text>
              </View>
              {(item.phone || item.email) && (
                <Text style={{ ...font.caption, color: colors.text.secondary, marginTop: 4 }}>
                  {[item.phone, item.email].filter(Boolean).join(' · ')}
                </Text>
              )}
              {item.contact_person && (
                <Text style={{ ...font.caption, color: colors.text.muted, marginTop: 2 }}>
                  LH: {item.contact_person}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text></TouchableOpacity>
            <Text style={{ ...font.h2, color: colors.text.primary }}>{editing ? 'Sửa NCC' : 'NCC mới'}</Text>
            <TouchableOpacity onPress={save}><Text style={{ ...font.button, color: colors.brand.primary }}>Lưu</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <TextField label="Mã NCC *" value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} />
            <TextField label="Tên NCC *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
            <TextField label="Người liên hệ" value={form.contact_person} onChangeText={v => setForm(p => ({ ...p, contact_person: v }))} />
            <TextField label="Số điện thoại" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} keyboardType="phone-pad" />
            <TextField label="Email" value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} keyboardType="email-address" />
            <TextField label="Mã số thuế" value={form.tax_code} onChangeText={v => setForm(p => ({ ...p, tax_code: v }))} />
            <TextField label="Địa chỉ" value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} multiline />
            <TextField label="Điều khoản TT" value={form.payment_terms} onChangeText={v => setForm(p => ({ ...p, payment_terms: v }))} />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function TextField({ label, value, onChangeText, keyboardType, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void; keyboardType?: any; multiline?: boolean;
}) {
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
  card: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border.default },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
});

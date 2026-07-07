"use client";
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Campaign } from '../../lib/api/client';

export default function MarketingScreen() {
  const { openSidebar } = useSidebar();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'email', trigger: 'scheduled', segment_filters: '{}', template_title: '', template_body: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request<Campaign[]>('/api/v1/quan-ly/marketing/campaigns');
      setCampaigns(data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name) return;
    try {
      await request('/api/v1/quan-ly/marketing/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name, type: form.type, trigger: form.trigger,
          segment_filters: JSON.parse(form.segment_filters || '{}'),
          template: { title: form.template_title, body: form.template_body },
        }),
      });
      setShowForm(false); load();
    } catch { /* ignore */ }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Icon name="menu" size={22} color={colors.icon.default} /></TouchableOpacity>
          <Text style={{ ...font.h1, color: colors.text.primary }}>Marketing 📣</Text>
        </View>
        <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}><Icon name="plus" size={18} color={colors.text.inverse} /><Text style={{ color: colors.text.inverse, ...font.tab }}>Chiến dịch</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={campaigns} keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={<View style={{ alignItems: 'center', padding: 40, gap: 12 }}><Icon name="bullhorn" size={48} color={colors.text.muted} /><Text style={{ ...font.body, color: colors.text.muted }}>Chưa có chiến dịch</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ ...font.h3, color: colors.text.primary }}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: item.is_active ? '#DCFCE7' : '#F1F5F9' }]}>
                  <Text style={{ ...font.badge, color: item.is_active ? '#16A34A' : '#94A3B8' }}>{item.is_active ? 'Chạy' : 'Tắt'}</Text>
                </View>
              </View>
              <Text style={{ ...font.caption, color: colors.text.secondary, marginTop: 4 }}>{item.type} · {item.trigger} · Đã gửi: {item.sent_count}</Text>
            </View>
          )}
        />
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.card }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}><Text style={{ ...font.button, color: colors.text.muted }}>Huỷ</Text></TouchableOpacity>
            <Text style={{ ...font.h2, color: colors.text.primary }}>Chiến dịch mới</Text>
            <TouchableOpacity onPress={save}><Text style={{ ...font.button, color: colors.brand.primary }}>Lưu</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <TextField label="Tên *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
            <TextField label="Template tiêu đề" value={form.template_title} onChangeText={v => setForm(p => ({ ...p, template_title: v }))} />
            <TextField label="Template nội dung" value={form.template_body} onChangeText={v => setForm(p => ({ ...p, template_body: v }))} multiline />
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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
});

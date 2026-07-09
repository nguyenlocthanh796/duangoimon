"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Campaign } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

type SortKey = 'name' | 'type' | 'is_active' | 'sent_count';

export default function MarketingScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [form, setForm] = useState({ name: '', type: 'email', trigger: 'scheduled', template_title: '', template_body: '' });
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const data: any = await request(`${API}/marketing/campaigns`); setCampaigns(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  const handleSave = async () => {
    if (!form.name) { Alert.alert('Lỗi', 'Tên chiến dịch bắt buộc'); return; }
    try { await request(`${API}/marketing/campaigns`, { method: 'POST', body: JSON.stringify(form) }); setShowForm(false); load(); }
    catch { Alert.alert('Lỗi', 'Không thể lưu'); }
  };

  const toggleActive = async (c: Campaign) => {
    try { await request(`${API}/marketing/campaigns/${c.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !c.is_active }) }); load(); }
    catch { /* ignore */ }
  };

  const stats = { total: campaigns.length, active: campaigns.filter(c => c.is_active).length, sent: campaigns.reduce((s, c) => s + (c.sent_count || 0), 0) };

  const sorted = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      if (sortKey === 'type') return sortAsc ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
      if (sortKey === 'is_active') return sortAsc ? Number(a.is_active) - Number(b.is_active) : Number(b.is_active) - Number(a.is_active);
      if (sortKey === 'sent_count') return sortAsc ? (a.sent_count || 0) - (b.sent_count || 0) : (b.sent_count || 0) - (a.sent_count || 0);
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });
  }, [campaigns, sortKey, sortAsc]);

  const StatItem = ({ icon, value, label }: { icon: string; value: string | number; label: string }) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon as any} size={14} color={colors.text.muted} />
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  const SortHeader = ({ label, sort, w }: { label: string; sort: SortKey; w?: number | string }) => (
    <TouchableOpacity onPress={() => toggleSort(sort)} style={{ width: w as any, flexDirection: 'row', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
      <Text style={[s.thText, sortKey === sort && { color: colors.brand.primary }]}>{label}</Text>
      {sortKey === sort ? <Icon name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color={colors.brand.primary} /> : null}
    </TouchableOpacity>
  );

  const renderPanel = () => (
    <View style={s.panelBox}>
      <View style={s.panelHeader}><Icon name="bullhorn" size={18} color={colors.brand.primary} /><Text style={s.panelHeaderText}>Marketing</Text></View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatItem icon="bullhorn" value={stats.total} label="Chiến dịch" />
        <View style={s.panelDividerV} />
        <StatItem icon="play-circle" value={stats.active} label="Đang chạy" />
        <View style={s.panelDividerV} />
        <StatItem icon="send" value={stats.sent} label="Đã gửi" />
      </View>
      <View style={s.panelDivider} />
      {selected ? (
        <View style={{ gap: 8 }}>
          <Text style={{ ...font.body, fontWeight: '700', color: colors.text.primary }}>{selected.name}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Text style={{ ...font.caption, color: colors.text.muted, textTransform: 'capitalize' }}>{selected.type}</Text>
            <Text style={{ ...font.caption, color: colors.text.muted }}>· {selected.trigger}</Text>
          </View>
          <TouchableOpacity onPress={() => toggleActive(selected)} style={[s.activeChip, { alignSelf: 'flex-start', backgroundColor: selected.is_active ? '#DCFCE7' : '#FEE2E2' }]}>
            <Icon name={selected.is_active ? 'toggle-switch' : 'toggle-switch-off'} size={16} color={selected.is_active ? '#16A34A' : '#DC2626'} />
            <Text style={{ ...font.micro, fontWeight: '700', color: selected.is_active ? '#16A34A' : '#DC2626' }}>{selected.is_active ? 'Đang chạy' : 'Tạm dừng'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.panelCta} onPress={() => setShowForm(true)}><Icon name="plus" size={14} color="#fff" /><Text style={s.panelCtaText}>Tạo chiến dịch</Text></TouchableOpacity>
      )}
    </View>
  );

  const TableRow = ({ item }: { item: Campaign }) => (
    <TouchableOpacity onPress={() => setSelected(item)} style={s.tr} activeOpacity={0.7}>
      <Text style={[s.td, { flex: 1, fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[s.td, { width: 55, textAlign: 'center', ...font.caption, color: colors.text.muted, textTransform: 'capitalize' }]}>{item.type}</Text>
      <TouchableOpacity onPress={() => toggleActive(item)} style={{ width: 55, alignItems: 'flex-end' }}>
        <View style={[s.activeChipSmall, { backgroundColor: item.is_active ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={{ ...font.micro, fontWeight: '700', color: item.is_active ? '#16A34A' : '#DC2626' }}>{item.is_active ? 'Bật' : 'Tắt'}</Text>
        </View>
      </TouchableOpacity>
      <Text style={[s.td, { width: 40, textAlign: 'right' }]}>{item.sent_count || 0}</Text>
    </TouchableOpacity>
  );

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={sorted} keyExtractor={item => item.id} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 32 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="bullhorn-outline" title="Chưa có chiến dịch" subtitle="Tạo chiến dịch marketing" />}
        ListHeaderComponent={
          <View style={s.thead}>
            <Text style={[s.thText, { flex: 1 }]}>Chiến dịch</Text>
            <SortHeader label="Loại" sort="type" w={55} />
            <SortHeader label="TT" sort="is_active" w={55} />
            <SortHeader label="Gửi" sort="sent_count" w={40} />
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Marketing" subtitle={`${stats.active} đang chạy`}
        onMenuPress={openSidebar}
        right={<TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Icon name="plus" size={18} color="#fff" /></TouchableOpacity>}
      />
      <View style={s.statsBar}>
        <StatItem icon="bullhorn" value={stats.total} label="Chiến dịch" />
        <View style={s.barDivider} />
        <StatItem icon="play-circle" value={stats.active} label="Đang chạy" />
        <View style={s.barDivider} />
        <StatItem icon="send" value={stats.sent} label="Đã gửi" />
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 12 }}>{renderPanel()}</View>
        </View>
      ) : renderList()}

      <FormModal visible={showForm} title="Tạo chiến dịch" onClose={() => setShowForm(false)} onSave={handleSave} saveLabel="Tạo">
        <View style={{ gap: 12, paddingTop: 4 }}>
          <Text style={s.fieldLabel}>Tên *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={s.fieldInput} placeholder="Khuyến mãi tháng 7" />
          <Text style={s.fieldLabel}>Loại</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['email', 'sms', 'push'].map(t => (
              <TouchableOpacity key={t} onPress={() => setForm(p => ({ ...p, type: t }))}
                style={[s.chip, form.type === t && { backgroundColor: colors.brand.primary }]}>
                <Text style={[s.chipText, form.type === t && { color: '#fff', fontWeight: '700' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fieldLabel}>Kích hoạt</Text>
          <TextInput value={form.trigger} onChangeText={v => setForm(p => ({ ...p, trigger: v }))} style={s.fieldInput} placeholder="scheduled / event" />
          <Text style={s.fieldLabel}>Tiêu đề</Text><TextInput value={form.template_title} onChangeText={v => setForm(p => ({ ...p, template_title: v }))} style={s.fieldInput} placeholder="Tiêu đề" />
          <Text style={s.fieldLabel}>Nội dung</Text><TextInput value={form.template_body} onChangeText={v => setForm(p => ({ ...p, template_body: v }))} style={[s.fieldInput, { minHeight: 80 }]} multiline placeholder="Nội dung..." />
        </View>
      </FormModal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  addBtn: { width: 44, height: 44, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '900', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },

  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: colors.border.default, marginBottom: 4 },
  thText: { ...font.caption, fontWeight: '700', color: colors.text.muted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  td: { ...font.bodySmall, color: colors.text.primary },
  activeChipSmall: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: shape.radius.full },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default },
  chipText: { ...font.badge, color: colors.text.muted },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingVertical: 12, minHeight: 44 },
  panelCtaText: { ...font.button, color: '#fff' },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: shape.radius.md },

  fieldLabel: { ...font.label, color: colors.text.secondary, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: shape.radius.md, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app },

  separator: { width: 1, backgroundColor: colors.border.light },
});

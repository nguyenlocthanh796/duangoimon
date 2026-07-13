import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Campaign } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
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
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [form, setForm] = useState({ name: '', type: 'email', content: '', is_active: true });
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const data: any = await request(`${API}/campaigns`); setCampaigns(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  const openNew = () => { setEditing(null); setForm({ name: '', type: 'email', content: '', is_active: true }); setShowForm(true); };
  const openEdit = (c: Campaign) => { setEditing(c); setForm({ name: c.name, type: c.type, content: c.content || '', is_active: c.is_active ?? true }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) { Alert.alert('Lỗi', 'Tên chiến dịch bắt buộc'); return; }
    try {
      const body = { name: form.name, type: form.type, content: form.content, is_active: form.is_active };
      if (editing) await request(`${API}/campaigns/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await request(`${API}/campaigns`, { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu'); }
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.is_active).length,
    sent: campaigns.reduce((s, c) => s + (c.sent_count || 0), 0),
  };

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

  const renderPanel = () => {
    if (!selected) return null;
    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}><Icon name="bullhorn" size={18} color={colors.brand.primary} /><Text style={s.panelHeaderText}>{selected.name}</Text></View>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ alignItems: 'center', flex: 1 }}><Text style={s.panelStatValue}>{selected.sent_count || 0}</Text><Text style={s.panelStatLabel}>Đã gửi</Text></View>
          <View style={s.panelDividerV} />
          <View style={{ alignItems: 'center', flex: 1 }}><Text style={s.panelStatValue}>{selected.open_count || 0}</Text><Text style={s.panelStatLabel}>Đã mở</Text></View>
          <View style={s.panelDividerV} />
          <View style={{ alignItems: 'center', flex: 1 }}><Text style={s.panelStatValue}>{selected.click_count || 0}</Text><Text style={s.panelStatLabel}>Click</Text></View>
        </View>
        <View style={s.panelDivider} />
        <Text style={{ ...font.caption, fontWeight: '700', color: colors.text.primary, marginBottom: 4 }}>Nội dung</Text>
        <Text style={{ ...font.caption, color: colors.text.secondary }} numberOfLines={4}>{selected.content || '—'}</Text>
      </View>
    );
  };

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    const filtered = [...campaigns].sort((a, b) => { /* ... sort logic */ return 0; });
    return (
      <FlatList data={filtered} keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 100 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="bullhorn" title="Chưa có chiến dịch" subtitle="Tạo chiến dịch marketing đầu tiên" />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelected(item)} style={s.tr} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={[s.td, { fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text>
              <Text style={{ ...font.micro, color: colors.text.muted }}>{item.type}</Text>
            </View>
            <Text style={[s.td, { width: 60, textAlign: 'right' }]}>{item.sent_count || 0}</Text>
            <View style={{ width: 60, alignItems: 'flex-end' }}>
              <View style={[s.activeChip, { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' }]}>
                <Text style={{ ...font.micro, fontWeight: '700', color: item.is_active ? '#2E7D32' : '#C62828' }}>{item.is_active ? 'ON' : 'OFF'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => openEdit(item)} style={{ padding: 4 }}><Icon name="pencil-outline" size={16} color={colors.text.muted} /></TouchableOpacity>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View style={s.thead}>
            <Text style={[s.thText, { flex: 1 }]}>Chiến dịch</Text>
            <SortHeader label="Đã gửi" sort="sent_count" w={60} />
            <Text style={[s.thText, { width: 60, textAlign: 'right' }]}>Trạng thái</Text>
            <View style={{ width: 24 }} />
          </View>
        }
      />
    );
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Marketing" subtitle={`${stats.active} đang chạy`}
        onMenuPress={openSidebar} compact
        right={<TouchableOpacity onPress={() => setShowForm(true)} style={s.addBtn}><Icon name="plus" size={18} color="#fff" /></TouchableOpacity>}
      />
      <View style={s.statsBar}>
        <StatItem icon="bullhorn" value={stats.total} label="Chiến dịch" />
        <View style={s.barDivider} />
        <StatItem icon="check-circle" value={stats.active} label="Đang chạy" />
        <View style={s.barDivider} />
        <StatItem icon="send" value={stats.sent} label="Đã gửi" />
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : renderList()}
      <FormModal visible={showForm} title={editing ? 'Sửa chiến dịch' : 'Chiến dịch mới'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Tạo'}>
        <View style={{ gap: 10, paddingTop: 4 }}>
          <Text style={s.fieldLabel}>Tên *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={s.fieldInput} placeholder="VD: Khuyến mãi tháng 7" />
          <Text style={s.fieldLabel}>Loại</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['email', 'sms', 'push'].map(t => (
              <TouchableOpacity key={t} onPress={() => setForm(p => ({ ...p, type: t }))}
                style={[s.typeChip, form.type === t && s.typeChipActive]}>
                <Text style={[s.typeChipText, form.type === t && s.typeChipTextActive]}>{t.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fieldLabel}>Nội dung</Text>
          <TextInput value={form.content} onChangeText={v => setForm(p => ({ ...p, content: v }))} style={[s.fieldInput, { minHeight: 80 }]} multiline placeholder="Nội dung chiến dịch" />
          <TouchableOpacity onPress={() => setForm(p => ({ ...p, is_active: !p.is_active }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={form.is_active ? 'toggle-switch' : 'toggle-switch-off'} size={20} color={form.is_active ? '#16A34A' : colors.text.muted} />
            <Text style={{ ...font.bodySmall, color: colors.text.primary }}>{form.is_active ? 'Kích hoạt' : 'Tạm dừng'}</Text>
          </TouchableOpacity>
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  addBtn: { width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '900', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },
  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: colors.border.default, marginBottom: 4 },
  thText: { ...font.caption, fontWeight: '700', color: colors.text.muted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  td: { ...font.bodySmall, color: colors.text.primary },
  activeChip: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: shape.radius.full },
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },
  panelStatLabel: { ...font.caption, color: colors.text.muted, marginTop: 2 },
  panelStatValue: { ...font.h3, fontWeight: '900', color: colors.text.primary },
  fieldLabel: { ...font.label, color: colors.text.secondary, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: shape.radius.md, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app },
  separator: { width: 1, backgroundColor: colors.border.light },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled },
  typeChipActive: { backgroundColor: colors.brand.primary },
  typeChipText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.muted },
  typeChipTextActive: { color: colors.text.inverse },
});
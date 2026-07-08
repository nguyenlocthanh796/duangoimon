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
import type { MembershipTier } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';
function formatVND(v: number) { return (v || 0).toLocaleString('vi-VN') + 'đ'; }

type SortKey = 'name' | 'min_spent' | 'discount_rate' | 'members';

export default function MembershipScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MembershipTier | null>(null);
  const [selected, setSelected] = useState<MembershipTier | null>(null);
  const [form, setForm] = useState({ name: '', min_spent: '0', discount_rate: '0', multiplier: '1', color: '', is_active: true });
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const data: any = await request(`${API}/membership/tiers`); setTiers(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  const openNew = () => { setEditing(null); setForm({ name: '', min_spent: '0', discount_rate: '0', multiplier: '1', color: '', is_active: true }); setShowForm(true); };
  const openEdit = (t: MembershipTier) => { setEditing(t); setForm({ name: t.name, min_spent: String(t.min_spent), discount_rate: String(t.discount_rate), multiplier: String(t.multiplier), color: t.color || '', is_active: t.is_active ?? true }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) { Alert.alert('Lỗi', 'Tên hạng bắt buộc'); return; }
    try {
      const body = { ...form, min_spent: Number(form.min_spent), discount_rate: Number(form.discount_rate), multiplier: Number(form.multiplier) };
      if (editing) await request(`${API}/membership/tiers/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await request(`${API}/membership/tiers`, { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu'); }
  };

  const del = (id: string) => { Alert.alert('Xác nhận', 'Xoá hạng này?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { try { await request(`${API}/membership/tiers/${id}`, { method: 'DELETE' }); load(); } catch {} } }]); };

  const stats = { total: tiers.length, maxDisc: Math.max(...tiers.map(t => t.discount_rate), 0), active: tiers.filter(t => t.is_active).length };

  const sorted = useMemo(() => {
    return [...tiers].sort((a, b) => {
      if (sortKey === 'min_spent') return sortAsc ? (a.min_spent || 0) - (b.min_spent || 0) : (b.min_spent || 0) - (a.min_spent || 0);
      if (sortKey === 'discount_rate') return sortAsc ? (a.discount_rate || 0) - (b.discount_rate || 0) : (b.discount_rate || 0) - (a.discount_rate || 0);
      if (sortKey === 'members') return sortAsc ? (a.member_count || 0) - (b.member_count || 0) : (b.member_count || 0) - (a.member_count || 0);
      return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    });
  }, [tiers, sortKey, sortAsc]);

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
      <View style={s.panelHeader}><Icon name="crown" size={18} color={colors.brand.primary} /><Text style={s.panelHeaderText}>Hội viên</Text></View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatItem icon="crown" value={stats.total} label="Hạng" />
        <View style={s.panelDividerV} />
        <StatItem icon="check-circle" value={stats.active} label="Đang dùng" />
      </View>
      <View style={s.panelDivider} />
      {selected ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {selected.color ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selected.color }} /> : null}
            <Text style={{ ...font.body, fontWeight: '700', color: colors.text.primary }}>{selected.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={s.panelLabel}>Min chi</Text><Text style={s.panelValue}>{formatVND(selected.min_spent || 0)}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={s.panelLabel}>Giảm</Text><Text style={s.panelValue}>{selected.discount_rate}%</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={s.panelLabel}>Nhân điểm</Text><Text style={s.panelValue}>{selected.multiplier}x</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={s.panelLabel}>Thành viên</Text><Text style={s.panelValue}>{selected.member_count || 0}</Text></View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity onPress={() => openEdit(selected)} style={[s.panelBtn, { backgroundColor: colors.brand.primary }]}><Icon name="pencil" size={14} color="#fff" /><Text style={s.panelBtnText}>Sửa</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => del(selected.id)} style={[s.panelBtn, { backgroundColor: colors.status.danger }]}><Icon name="delete" size={14} color="#fff" /><Text style={s.panelBtnText}>Xoá</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.panelCta} onPress={openNew}><Icon name="plus" size={14} color="#fff" /><Text style={s.panelCtaText}>Thêm hạng</Text></TouchableOpacity>
      )}
    </View>
  );

  const TableRow = ({ item }: { item: MembershipTier }) => (
    <TouchableOpacity onPress={() => setSelected(item)} style={s.tr} activeOpacity={0.7}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {item.color ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} /> : null}
        <Text style={[s.td, { fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text>
      </View>
      <Text style={[s.td, { width: 60, textAlign: 'right', ...font.caption, color: colors.text.muted }]}>{formatVND(item.min_spent || 0)}</Text>
      <Text style={[s.td, { width: 45, textAlign: 'right', fontWeight: '700', color: colors.brand.primary }]}>{item.discount_rate}%</Text>
      <Text style={[s.td, { width: 35, textAlign: 'right', ...font.caption, color: colors.text.muted }]}>{item.member_count || 0}</Text>
    </TouchableOpacity>
  );

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={sorted} keyExtractor={item => item.id} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 100 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="crown-off" title="Chưa có hạng" subtitle="Tạo hạng thành viên đầu tiên" />}
        ListHeaderComponent={
          <View style={s.thead}>
            <Text style={[s.thText, { flex: 1 }]}>Hạng</Text>
            <SortHeader label="Min chi" sort="min_spent" w={60} />
            <SortHeader label="Giảm" sort="discount_rate" w={45} />
            <SortHeader label="TV" sort="members" w={35} />
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Hội viên" subtitle={`${stats.active} hạng đang dùng`}
        onMenuPress={openSidebar}
        right={isWide ? undefined : <TouchableOpacity onPress={openNew} style={s.addBtn}><Icon name="plus" size={18} color="#fff" /></TouchableOpacity>}
      />
      <View style={s.statsBar}>
        <StatItem icon="crown" value={stats.total} label="Hạng" />
        <View style={s.barDivider} />
        <StatItem icon="percent" value={`${stats.maxDisc}%`} label="Giảm tối đa" />
        <View style={s.barDivider} />
        <StatItem icon="account-group" value={tiers.reduce((s, t) => s + (t.member_count || 0), 0)} label="Thành viên" />
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 12 }}>{renderPanel()}</View>
        </View>
      ) : renderList()}
      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa hạng' : 'Thêm hạng'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 12, paddingTop: 4 }}>
          <Text style={s.fieldLabel}>Tên hạng *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={s.fieldInput} placeholder="Vàng" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Min chi</Text><TextInput value={form.min_spent} onChangeText={v => setForm(p => ({ ...p, min_spent: v }))} style={s.fieldInput} keyboardType="decimal-pad" placeholder="0" /></View>
            <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Giảm (%)</Text><TextInput value={form.discount_rate} onChangeText={v => setForm(p => ({ ...p, discount_rate: v }))} style={s.fieldInput} keyboardType="decimal-pad" placeholder="0" /></View>
            <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Nhân điểm</Text><TextInput value={form.multiplier} onChangeText={v => setForm(p => ({ ...p, multiplier: v }))} style={s.fieldInput} keyboardType="decimal-pad" placeholder="1" /></View>
          </View>
          <Text style={s.fieldLabel}>Màu sắc</Text>
          <TextInput value={form.color} onChangeText={v => setForm(p => ({ ...p, color: v }))} style={s.fieldInput} placeholder="#FFD700" />
          <TouchableOpacity onPress={() => setForm(p => ({ ...p, is_active: !p.is_active }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name={form.is_active ? 'toggle-switch' : 'toggle-switch-off'} size={20} color={form.is_active ? '#16A34A' : colors.text.muted} />
            <Text style={{ ...font.bodySmall, color: colors.text.primary }}>{form.is_active ? 'Đang áp dụng' : 'Tạm ngừng'}</Text>
          </TouchableOpacity>
        </View>
      </FormModal>
    </SafeAreaView>
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

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: shape.radius.md },
  panelBtnText: { ...font.buttonSmall, fontWeight: '700', color: '#fff' },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingVertical: 12, minHeight: 44 },
  panelCtaText: { ...font.button, color: '#fff' },
  panelLabel: { ...font.caption, color: colors.text.muted },
  panelValue: { ...font.bodySmall, fontWeight: '700', color: colors.text.primary },

  fieldLabel: { ...font.label, color: colors.text.secondary, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: shape.radius.md, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app },

  separator: { width: 1, backgroundColor: colors.border.light },
});

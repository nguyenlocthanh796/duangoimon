"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Voucher, PromoRule } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';

export default function PromoScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [tab, setTab] = useState<'voucher'|'rule'>('voucher');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [rules, setRules] = useState<PromoRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: '', name: '', type: 'percent', value: '0', min_order: '0', valid_from: '', valid_until: '' });
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const [v, r] = await Promise.all([request<Voucher[]>('/api/v1/quan-ly/promo/vouchers'), request<PromoRule[]>('/api/v1/quan-ly/promo/rules')]); setVouchers(v); setRules(r); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: string) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  const items: any[] = tab === 'voucher' ? vouchers : rules;
  const openNew = () => { setEditing(null); setForm({ code: '', name: '', type: 'percent', value: '0', min_order: '0', valid_from: '', valid_until: '' }); setShowForm(true); };

  const sorted = useMemo(() => {
    const arr = [...items];
    const cmp = (a: any, b: any) => {
      if (sortKey === 'active') return sortAsc ? (a.is_active ? -1 : 1) - (b.is_active ? -1 : 1) : (b.is_active ? -1 : 1) - (a.is_active ? -1 : 1);
      if (sortKey === 'value') {
        const av = parseFloat(a.value || '0'), bv = parseFloat(b.value || '0');
        return sortAsc ? av - bv : bv - av;
      }
      if (sortKey === 'date') return sortAsc ? (a.valid_from || '').localeCompare(b.valid_from || '') : (b.valid_from || '').localeCompare(a.valid_from || '');
      return sortAsc ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '');
    };
    return arr.sort(cmp);
  }, [items, sortKey, sortAsc]);

  const StatItem = ({ icon, value, label }: { icon: string; value: string | number; label: string }) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon as any} size={14} color={colors.text.muted} />
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  const SortHeader = ({ label, sort, w }: { label: string; sort: string; w?: number | string }) => (
    <TouchableOpacity onPress={() => toggleSort(sort)} style={{ width: w as any, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={[s.thText, sortKey === sort && { color: colors.brand.primary }]}>{label}</Text>
      {sortKey === sort ? <Icon name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color={colors.brand.primary} /> : null}
    </TouchableOpacity>
  );

  const renderPanel = () => {
    const activeV = vouchers.filter(v => v.is_active).length;
    const used = vouchers.reduce((s, v) => s + (v.used_count || 0), 0);
    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <Icon name="ticket-percent" size={18} color={colors.brand.primary} />
          <Text style={s.panelHeaderText}>Khuyến mãi</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, alignItems: 'center' }}><Text style={s.panelStatValue}>{vouchers.length}</Text><Text style={s.panelStatLabel}>Voucher</Text></View>
          <View style={s.panelDividerV} />
          <View style={{ flex: 1, alignItems: 'center' }}><Text style={[s.panelStatValue, { color: '#16A34A' }]}>{activeV}</Text><Text style={s.panelStatLabel}>Hoạt động</Text></View>
          <View style={s.panelDividerV} />
          <View style={{ flex: 1, alignItems: 'center' }}><Text style={s.panelStatValue}>{rules.length}</Text><Text style={s.panelStatLabel}>Quy tắc</Text></View>
        </View>
        <View style={s.panelDivider} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="history" size={14} color={colors.text.muted} />
          <Text style={s.panelLabel}>Đã dùng {used} lượt</Text>
        </View>
      </View>
    );
  };

  const TableRow = ({ item }: { item: any }) => {
    const active = item.is_active !== false;
    const isV = tab === 'voucher';
    const expiresSoon = isV && item.valid_until && new Date(item.valid_until) < new Date(Date.now() + 7*86400000);
    return (
      <View style={s.tr}>
        <TouchableOpacity onPress={() => { setEditing(item); setForm({ code: item.code || '', name: item.name || '', type: item.type || 'percent', value: String(item.value || '0'), min_order: String(item.min_order || '0'), valid_from: item.valid_from || '', valid_until: item.valid_until || '' }); setShowForm(true); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[s.td, { flex: 1, fontWeight: '600' }]} numberOfLines={1}>{item.name || item.code}</Text>
          <Text style={[s.td, { width: 90, textAlign: 'center', ...font.caption, color: colors.text.muted }]}>{isV ? (item.type === 'percent' ? `${item.value}%` : `${Number(item.value).toLocaleString('vi-VN')}đ`) : (item.type || '-')}</Text>
        </TouchableOpacity>
        {isV && item.valid_from ? <Text style={[s.td, { width: 85, textAlign: 'center', ...font.caption, color: expiresSoon ? '#DC2626' : colors.text.muted }]}>{item.valid_from.slice(0, 10)}</Text> : <View style={{ width: 85 }} />}
        <TouchableOpacity onPress={async () => { try { await request(`/api/v1/quan-ly/promo/${isV ? 'vouchers' : 'rules'}/${item.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !active }) }); load(); } catch {} }} style={[s.activeChip, { backgroundColor: active ? '#DCFCE7' : '#F1F5F9' }]}>
          <View style={[s.activeDot, { backgroundColor: active ? '#16A34A' : '#94A3B8' }]} />
          <Text style={{ ...font.micro, fontWeight: '700', color: active ? '#16A34A' : '#94A3B8' }}>{active ? 'Bật' : 'Tắt'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const list = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={sorted} keyExtractor={item => item.id} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 100 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="ticket-outline" title="Chưa có" subtitle="Thêm khuyến mãi đầu tiên" />}
        ListHeaderComponent={
          <View style={s.thead}>
            <SortHeader label="Tên / Mã" sort="name" w={1} />
            <SortHeader label="Giá trị" sort="value" w={90} />
            <SortHeader label="Hiệu lực" sort="date" w={85} />
            <TouchableOpacity onPress={() => toggleSort('active')} style={{ width: 65, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={[s.thText, sortKey === 'active' && { color: colors.brand.primary }]}>Trạng thái</Text>
              {sortKey === 'active' ? <Icon name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color={colors.brand.primary} /> : null}
            </TouchableOpacity>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Khuyến mãi" subtitle={`${vouchers.length} voucher · ${rules.length} quy tắc`}
        onMenuPress={openSidebar}
        right={isWide ? undefined : <TouchableOpacity onPress={openNew} style={s.addBtn}><Icon name="plus" size={18} color="#fff" /><Text style={s.addBtnText}>Thêm</Text></TouchableOpacity>}
      />
      <View style={s.statsBar}>
        <StatItem icon="ticket-outline" value={vouchers.length} label="Voucher" />
        <View style={s.barDivider} />
        <StatItem icon="sale" value={rules.length} label="Quy tắc" />
        <View style={s.barDivider} />
        <StatItem icon="check-circle-outline" value={vouchers.filter(v => v.is_active).length} label="Hoạt động" />
      </View>
      <View style={s.tabRow}>
        {(['voucher', 'rule'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary }]}>
            <Icon name={t === 'voucher' ? 'ticket-outline' : 'sale'} size={14} color={tab === t ? '#fff' : colors.text.muted} />
            <Text style={[s.tabText, tab === t && { color: '#fff' }]}>{t === 'voucher' ? 'Voucher' : 'Quy tắc'} ({items.length})</Text>
          </TouchableOpacity>
        ))}
        {isWide && <TouchableOpacity onPress={openNew} style={s.addBtnSm}><Icon name="plus" size={14} color="#fff" /><Text style={s.addBtnSmText}>Thêm</Text></TouchableOpacity>}
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{list()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 12 }}>{renderPanel()}</View>
        </View>
      ) : list()}
      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa voucher' : 'Thêm voucher'} onClose={() => setShowForm(false)} onSave={() => {}} saveLabel="Lưu">
        <View style={{ gap: 12, paddingTop: 4 }}>
          <Text style={s.fieldLabel}>Mã *</Text><TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={s.fieldInput} />
          <Text style={s.fieldLabel}>Tên *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={s.fieldInput} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => setForm(p => ({ ...p, type: 'percent' }))} style={[s.typeBtn, form.type === 'percent' && { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary }]}>
              <Text style={{ ...font.button, color: form.type === 'percent' ? '#fff' : colors.text.muted }}>%</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setForm(p => ({ ...p, type: 'fixed' }))} style={[s.typeBtn, form.type === 'fixed' && { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary }]}>
              <Text style={{ ...font.button, color: form.type === 'fixed' ? '#fff' : colors.text.muted }}>Tiền mặt</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.fieldLabel}>Giá trị</Text><TextInput value={form.value} onChangeText={v => setForm(p => ({ ...p, value: v }))} keyboardType="decimal-pad" style={s.fieldInput} />
          <Text style={s.fieldLabel}>Đơn tối thiểu</Text><TextInput value={form.min_order} onChangeText={v => setForm(p => ({ ...p, min_order: v }))} keyboardType="decimal-pad" style={s.fieldInput} />
        </View>
      </FormModal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 44, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: '#fff' },
  addBtnSm: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 12, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary, marginLeft: 'auto' },
  addBtnSmText: { ...font.label, color: '#fff' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '900', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },

  tabRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default },
  tabText: { ...font.micro, fontWeight: '600', color: colors.text.muted },

  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: colors.border.default, marginBottom: 4 },
  thText: { ...font.caption, fontWeight: '700', color: colors.text.muted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  td: { ...font.bodySmall, color: colors.text.primary },
  activeChip: { width: 65, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6, borderRadius: shape.radius.full },
  activeDot: { width: 6, height: 6, borderRadius: 3 },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelStatLabel: { ...font.caption, color: colors.text.muted, marginTop: 2 },
  panelStatValue: { ...font.h3, fontWeight: '900', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },
  panelLabel: { ...font.caption, color: colors.text.muted },

  fieldLabel: { ...font.label, color: colors.text.secondary, marginBottom: 4 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: shape.radius.md, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: shape.radius.md, borderWidth: 1.5, borderColor: colors.border.default, alignItems: 'center', backgroundColor: colors.surface.disabled },

  separator: { width: 1, backgroundColor: colors.border.light },
});

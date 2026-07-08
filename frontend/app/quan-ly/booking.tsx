"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Booking } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Chờ XN', color: '#D97706', bg: '#FFFBEB', icon: 'clock-outline' },
  confirmed: { label: 'Đã XN',  color: '#16A34A', bg: '#DCFCE7', icon: 'check-circle-outline' },
  cancelled: { label: 'Đã Huỷ', color: '#DC2626', bg: '#FEE2E2', icon: 'cancel' },
  arrived:   { label: 'Đã đến', color: '#2563EB', bg: '#EFF6FF', icon: 'door-open' },
};

type SortKey = 'customer_name' | 'guest_count' | 'created_at' | 'status';

export default function BookingScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [form, setForm] = useState({ customer_name: '', phone: '', email: '', guest_count: '2', note: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const params = statusFilter ? `?status=${statusFilter}` : ''; const data: any = await request(`${API}/booking${params}`); setItems(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  const openNew = () => { setSelected(null); setForm({ customer_name: '', phone: '', email: '', guest_count: '2', note: '' }); setShowForm(true); };

  const handleStatusChange = async (id: string, status: string) => {
    try { await request(`${API}/booking/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }); load(); }
    catch { Alert.alert('Lỗi', 'Không thể cập nhật'); }
  };

  const statuses = ['', 'pending', 'confirmed', 'arrived', 'cancelled'];
  const stats = { total: items.length, pending: items.filter(i => i.status === 'pending').length, confirmed: items.filter(i => i.status === 'confirmed').length, arrived: items.filter(i => i.status === 'arrived').length, cancelled: items.filter(i => i.status === 'cancelled').length };

  const sorted = useMemo(() => {
    const arr = [...items];
    const cmp = (a: Booking, b: Booking) => {
      if (sortKey === 'status') {
        const order = ['pending', 'confirmed', 'arrived', 'cancelled'];
        return sortAsc ? order.indexOf(a.status) - order.indexOf(b.status) : order.indexOf(b.status) - order.indexOf(a.status);
      }
      if (sortKey === 'customer_name') return sortAsc ? b.customer_name.localeCompare(a.customer_name) : a.customer_name.localeCompare(b.customer_name);
      if (sortKey === 'guest_count') return sortAsc ? a.guest_count - b.guest_count : b.guest_count - a.guest_count;
      return sortAsc ? (a.created_at || '').localeCompare(b.created_at || '') : (b.created_at || '').localeCompare(a.created_at || '');
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

  const SortHeader = ({ label, sort, w }: { label: string; sort: SortKey; w?: number | string }) => (
    <TouchableOpacity onPress={() => toggleSort(sort)} style={{ width: w as any, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={[s.thText, sortKey === sort && { color: colors.brand.primary }]}>{label}</Text>
      {sortKey === sort ? <Icon name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color={colors.brand.primary} /> : null}
    </TouchableOpacity>
  );

  const renderPanel = () => {
    const counts: Record<string, number> = { pending: 0, confirmed: 0, arrived: 0, cancelled: 0 };
    items.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; });
    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <Icon name="calendar-check" size={18} color={colors.brand.primary} />
          <Text style={s.panelHeaderText}>Đặt bàn</Text>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={[s.panelStatValue, { fontSize: 32 }]}>{items.length}</Text>
          <Text style={s.panelStatLabel}>Tổng lượt đặt</Text>
        </View>
        <View style={s.panelDivider} />
        {Object.entries(STATUS_MAP).map(([k, v]) => {
          const c = counts[k] || 0;
          return (
            <TouchableOpacity key={k} style={[s.panelRow, statusFilter === k && { backgroundColor: v.bg, borderRadius: shape.radius.md, marginHorizontal: -4, paddingHorizontal: 4 }]} onPress={() => setStatusFilter(statusFilter === k ? '' : k)}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: v.color }} />
              <Text style={{ flex: 1, ...font.bodySmall, color: colors.text.primary }}>{v.label}</Text>
              <Text style={{ ...font.bodySmall, fontWeight: '700', color: v.color }}>{c}</Text>
            </TouchableOpacity>
          );
        })}
        {statusFilter ? <TouchableOpacity onPress={() => setStatusFilter('')} style={{ paddingVertical: 4 }}><Text style={{ ...font.micro, color: colors.brand.primary }}>Xoá bộ lọc</Text></TouchableOpacity> : null}
        <View style={s.panelDivider} />
        {selected ? (
          <View style={{ gap: 8 }}>
            <Text style={{ ...font.body, fontWeight: '700', color: colors.text.primary }}>{selected.customer_name}</Text>
            <Text style={{ ...font.caption, color: colors.text.muted }}>{selected.phone}</Text>
            <Text style={{ ...font.caption, color: colors.text.muted }}>{selected.guest_count} khách</Text>
            {selected.note ? <Text style={{ ...font.caption, color: colors.text.secondary, fontStyle: 'italic' }}>{selected.note}</Text> : null}
            {selected.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'confirmed')} style={[s.panelBtn, { backgroundColor: '#16A34A' }]}><Icon name="check" size={14} color="#fff" /><Text style={s.panelBtnText}>Xác nhận</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'arrived')} style={[s.panelBtn, { backgroundColor: '#2563EB' }]}><Icon name="door-open" size={14} color="#fff" /><Text style={s.panelBtnText}>Check-in</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'cancelled')} style={[s.panelBtn, { backgroundColor: '#DC2626' }]}><Icon name="cancel" size={14} color="#fff" /><Text style={s.panelBtnText}>Huỷ</Text></TouchableOpacity>
              </View>
            )}
            {selected.status === 'confirmed' && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'arrived')} style={[s.panelBtn, { backgroundColor: '#2563EB' }]}><Icon name="door-open" size={14} color="#fff" /><Text style={s.panelBtnText}>Check-in</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'cancelled')} style={[s.panelBtn, { backgroundColor: '#DC2626' }]}><Icon name="cancel" size={14} color="#fff" /><Text style={s.panelBtnText}>Huỷ</Text></TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={s.panelCta} onPress={openNew}><Icon name="plus" size={14} color="#fff" /><Text style={s.panelCtaText}>Đặt bàn mới</Text></TouchableOpacity>
        )}
      </View>
    );
  };

  const TableRow = ({ item }: { item: Booking }) => {
    const st = STATUS_MAP[item.status] ?? { label: item.status, color: '#94A3B8', bg: '#F1F5F9', icon: 'help-circle' };
    return (
      <TouchableOpacity onPress={() => setSelected(item)} style={s.tr} activeOpacity={0.7}>
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSelected(item); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[s.avatar, { backgroundColor: st.bg }]}>
            <Icon name="account" size={14} color={st.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.td, { fontWeight: '600' }]} numberOfLines={1}>{item.customer_name}</Text>
            <Text style={{ ...font.micro, color: colors.text.muted }}>{item.phone}</Text>
          </View>
        </TouchableOpacity>
        <Text style={[s.td, { width: 50, textAlign: 'center' }]}>{item.guest_count}</Text>
        <Text style={[s.td, { width: 85, textAlign: 'center', ...font.caption, color: colors.text.muted }]}>{item.created_at?.slice(0, 10) || '-'}</Text>
        <View style={[s.statusBadge, { backgroundColor: st.bg, width: 80 }]}>
          <Icon name={st.icon as any} size={10} color={st.color} />
          <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={sorted} keyExtractor={item => item.id} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 100 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="calendar-plus" title="Chưa có đặt bàn" subtitle="Nhấn + để thêm lượt đặt mới" />}
        ListHeaderComponent={
          <View style={s.thead}>
            <SortHeader label="Khách hàng" sort="customer_name" w={1} />
            <SortHeader label="Khách" sort="guest_count" w={50} />
            <SortHeader label="Ngày" sort="created_at" w={85} />
            <View style={{ width: 80 }}><Text style={s.thText}>Trạng thái</Text></View>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Đặt bàn" subtitle={`${items.length} lượt đặt`}
        showBack onMenuPress={openSidebar} onBackPress={() => router.back()}
        right={isWide ? undefined : <TouchableOpacity onPress={openNew} style={s.addBtn}><Icon name="plus" size={18} color="#fff" /><Text style={s.addBtnText}>Thêm</Text></TouchableOpacity>}
      />
      <View style={s.statsBar}>
        <StatItem icon="calendar-check" value={stats.total} label="Tổng" />
        <View style={s.barDivider} />
        <StatItem icon="clock-outline" value={stats.pending} label="Chờ" />
        <View style={s.barDivider} />
        <StatItem icon="check-circle-outline" value={stats.confirmed} label="Đã XN" />
        <View style={s.barDivider} />
        <StatItem icon="door-open" value={stats.arrived} label="Đã đến" />
        <View style={s.barDivider} />
        <StatItem icon="cancel" value={stats.cancelled} label="Huỷ" />
      </View>
      <View style={s.filterRow}>
        {statuses.map(st => (
          <TouchableOpacity key={st} onPress={() => setStatusFilter(st)}
            style={[s.chip, statusFilter === st && { backgroundColor: colors.brand.primary }]}>
            <Text style={[s.chipText, statusFilter === st && { color: '#fff' }]}>{st ? (STATUS_MAP[st]?.label || st) : 'Tất cả'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 12 }}>{renderPanel()}</View>
        </View>
      ) : renderList()}
      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title="Đặt bàn mới" onClose={() => setShowForm(false)} onSave={async () => { if (form.phone) { try { await request(`${API}/booking`, { method: 'POST', body: JSON.stringify(form) }); setShowForm(false); load(); } catch { Alert.alert('Lỗi', 'Không thể tạo'); } } else Alert.alert('Lỗi', 'Nhập SĐT'); }} saveLabel="Đặt">
        <View style={{ gap: 12, paddingTop: 4 }}>
          <Text style={s.fieldLabel}>Tên khách *</Text>
          <TextInput value={form.customer_name} onChangeText={v => setForm(p => ({ ...p, customer_name: v }))} style={s.fieldInput} placeholder="Tên khách" />
          <Text style={s.fieldLabel}>SĐT *</Text>
          <TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} style={s.fieldInput} keyboardType="phone-pad" placeholder="090..." />
          <Text style={s.fieldLabel}>Email</Text>
          <TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} style={s.fieldInput} keyboardType="email-address" placeholder="email@example.com" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Text style={s.fieldLabel}>Số khách</Text><TextInput value={form.guest_count} onChangeText={v => setForm(p => ({ ...p, guest_count: v }))} keyboardType="number-pad" style={s.fieldInput} /></View>
          </View>
          <Text style={s.fieldLabel}>Ghi chú</Text>
          <TextInput value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} style={[s.fieldInput, { minHeight: 80 }]} multiline placeholder="Ghi chú..." />
        </View>
      </FormModal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  addBtnText: { ...font.buttonSmall, fontWeight: '700', color: '#fff' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '900', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },

  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default },
  chipText: { ...font.badge, color: colors.text.muted },

  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: colors.border.default, marginBottom: 4 },
  thText: { ...font.caption, fontWeight: '700', color: colors.text.muted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  td: { ...font.bodySmall, color: colors.text.primary },
  avatar: { width: 30, height: 30, borderRadius: shape.radius.sm, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 3, paddingHorizontal: 6, borderRadius: shape.radius.full },
  statusText: { ...font.micro, fontWeight: '700' },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelStatValue: { ...font.h1, fontWeight: '900', color: colors.text.primary },
  panelStatLabel: { ...font.caption, color: colors.text.muted, marginTop: 2 },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: shape.radius.md },
  panelBtnText: { ...font.buttonSmall, fontWeight: '700', color: '#fff' },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingVertical: 12, minHeight: 44 },
  panelCtaText: { ...font.button, color: '#fff' },

  fieldLabel: { ...font.label, color: colors.text.secondary, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: shape.radius.md, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app },

  separator: { width: 1, backgroundColor: colors.border.light },
});

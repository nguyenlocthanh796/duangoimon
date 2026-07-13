import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Customer } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import SearchBar from '../../lib/components/ui/SearchBar';

const API = '/api/v1/quan-ly';
function formatVND(v: number) { return (v || 0).toLocaleString('vi-VN') + 'đ'; }

type SortKey = 'name' | 'phone' | 'total_spent' | 'total_visits';

export default function CustomersScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [sortKey, setSortKey] = useState<SortKey>('total_spent');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const data: any = await request(`${API}/customers`); setCustomers(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  const handleSave = async () => {
    if (!form.name || !form.phone) { Alert.alert('Lỗi', 'Tên và SĐT bắt buộc'); return; }
    try { await request(`${API}/customers`, { method: 'POST', body: JSON.stringify(form) }); setShowForm(false); load(); }
    catch { Alert.alert('Lỗi', 'Không thể lưu'); }
  };

  const filtered = useMemo(() => {
    let arr = search ? customers.filter(c => (c.name?.toLowerCase() || '').includes(search.toLowerCase()) || (c.phone || '').includes(search)) : [...customers];
    return arr.sort((a, b) => {
      if (sortKey === 'phone') return sortAsc ? (a.phone || '').localeCompare(b.phone || '') : (b.phone || '').localeCompare(a.phone || '');
      if (sortKey === 'total_spent') return sortAsc ? (a.total_spent || 0) - (b.total_spent || 0) : (b.total_spent || 0) - (a.total_spent || 0);
      if (sortKey === 'total_visits') return sortAsc ? (a.visit_count || 0) - (b.visit_count || 0) : (b.visit_count || 0) - (a.visit_count || 0);
      return sortAsc ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '');
    });
  }, [customers, search, sortKey, sortAsc]);

  const stats = {
    total: customers.length,
    totalSpent: customers.reduce((s, c) => s + (c.total_spent || 0), 0),
    totalVisits: customers.reduce((s, c) => s + (c.visit_count || 0), 0),
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
    const top = [...filtered].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0)).slice(0, 5);
    const maxSpent = Math.max(...top.map(c => c.total_spent || 0), 1);
    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}><Icon name="account-group" size={18} color={colors.brand.primary} /><Text style={s.panelHeaderText}>Khách hàng</Text></View>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <StatItem icon="account-group" value={stats.total} label="Tổng" />
          <View style={s.panelDividerV} />
          <StatItem icon="currency-usd" value={formatVND(stats.totalSpent)} label="Tổng chi" />
          <View style={s.panelDividerV} />
          <StatItem icon="store" value={stats.totalVisits} label="Lượt" />
        </View>
        <View style={s.panelDivider} />
        <Text style={{ ...font.caption, fontWeight: '700', color: colors.text.primary, marginBottom: 4 }}>Top chi tiêu</Text>
        {top.map((c, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ width: 60, ...font.micro, color: colors.text.primary }} numberOfLines={1}>{c.name}</Text>
            <View style={{ flex: 1, height: 10, backgroundColor: colors.surface.disabled, borderRadius: 3 }}>
              <View style={{ width: `${Math.max(5, ((c.total_spent || 0) / maxSpent) * 100)}%`, height: 10, backgroundColor: colors.brand.primary, borderRadius: 3 }} />
            </View>
            <Text style={{ width: 70, textAlign: 'right', ...font.micro, fontWeight: '700', color: colors.text.primary }}>{formatVND(c.total_spent || 0)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const TableRow = ({ item }: { item: Customer }) => (
    <TouchableOpacity onPress={() => setSelected(item)} style={s.tr} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={[s.td, { fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text>
        <Text style={{ ...font.micro, color: colors.text.muted }}>{item.phone}</Text>
      </View>
      <Text style={[s.td, { width: 75, textAlign: 'right', fontWeight: '700', color: colors.brand.primary }]}>{formatVND(item.total_spent || 0)}</Text>
      <Text style={[s.td, { width: 40, textAlign: 'right' }]}>{item.visit_count || 0}</Text>
    </TouchableOpacity>
  );

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={filtered} keyExtractor={item => item.id} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 100 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="account-off" title="Chưa có khách hàng" subtitle="Thêm khách hàng mới" />}
        ListHeaderComponent={
          <View style={s.thead}>
            <Text style={[s.thText, { flex: 1 }]}>Khách hàng</Text>
            <SortHeader label="Đã chi" sort="total_spent" w={75} />
            <SortHeader label="Lượt" sort="total_visits" w={40} />
          </View>
        }
      />
    );
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Khách hàng" subtitle={`${stats.total} khách`}
        onMenuPress={openSidebar} compact />
      <View style={s.statsBar}>
        <StatItem icon="account-group" value={stats.total} label="Tổng khách" />
        <View style={s.barDivider} />
        <StatItem icon="currency-usd" value={formatVND(stats.totalSpent)} label="Tổng chi" />
        <View style={s.barDivider} />
        <StatItem icon="store" value={stats.totalVisits} label="Lượt ghé" />
      </View>
      <View style={s.searchRow}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm tên hoặc SĐT..." />
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : renderList()}
      <FAB onPress={() => setShowForm(true)} />

      <FormModal visible={showForm} title="Thêm khách hàng" onClose={() => setShowForm(false)} onSave={handleSave} saveLabel="Thêm">
        <View style={{ gap: 10, paddingTop: 4 }}>
          <Text style={s.fieldLabel}>Tên *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={s.fieldInput} placeholder="Nguyễn Văn A" />
          <Text style={s.fieldLabel}>SĐT *</Text><TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} style={s.fieldInput} placeholder="090..." keyboardType="phone-pad" />
          <Text style={s.fieldLabel}>Email</Text><TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} style={s.fieldInput} placeholder="email@example.com" keyboardType="email-address" />
          <Text style={s.fieldLabel}>Địa chỉ</Text><TextInput value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} style={s.fieldInput} placeholder="Địa chỉ" />
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '900', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  searchInput: { flex: 1, ...font.body, color: colors.text.primary, paddingVertical: 0 },

  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: colors.border.default, marginBottom: 4 },
  thText: { ...font.caption, fontWeight: '700', color: colors.text.muted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  td: { ...font.bodySmall, color: colors.text.primary },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },

  fieldLabel: { ...font.label, color: colors.text.secondary, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: shape.radius.md, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app },

  separator: { width: 1, backgroundColor: colors.border.light },
});

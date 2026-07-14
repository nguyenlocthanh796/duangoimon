import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import SearchBar from '../../lib/components/ui/SearchBar';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

const ACTION_ICONS: Record<string, string> = { create: 'plus-circle', update: 'pencil', delete: 'delete-circle', login: 'login', logout: 'logout' };
const ACTION_COLORS: Record<string, string> = { create: '#16A34A', update: '#D97706', delete: '#DC2626', login: '#3B82F6', logout: '#64748B' };

type SortKey = 'created_at' | 'action';

export default function AuditScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const data: any = await request(API + '/audit-logs?limit=100'); setLogs(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  const counts: Record<string, number> = {};
  logs.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1; });

  const filtered = useMemo(() => {
    let arr = [...logs];
    if (filterAction) arr = arr.filter(l => l.action === filterAction);
    if (searchUser) arr = arr.filter(l => (l.user_name || '').toLowerCase().includes(searchUser.toLowerCase()));
    return arr.sort((a, b) => {
      if (sortKey === 'action') return sortAsc ? (a.action || '').localeCompare(b.action || '') : (b.action || '').localeCompare(a.action || '');
      return sortAsc ? (a.created_at || '').localeCompare(b.created_at || '') : (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [logs, filterAction, searchUser, sortKey, sortAsc]);

  const StatItem = ({ icon, value, label }: { icon: string; value: string | number; label: string }) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon as any} size={14} color={colors.text.muted} />
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  const SortHeader = ({ label, sort }: { label: string; sort: SortKey }) => (
    <TouchableOpacity onPress={() => toggleSort(sort)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={[s.thText, sortKey === sort && { color: colors.brand.primary }]}>{label}</Text>
      {sortKey === sort ? <Icon name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color={colors.brand.primary} /> : null}
    </TouchableOpacity>
  );

  const renderPanel = () => {
    const c: Record<string, number> = {};
    logs.forEach(l => { c[l.action] = (c[l.action] || 0) + 1; });
    const total = logs.length;
    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <Icon name="clipboard-text" size={18} color={colors.brand.primary} />
          <Text style={s.panelHeaderText}>Audit</Text>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 4 }}>
          <Text style={s.panelStatValue}>{total}</Text>
          <Text style={s.panelStatLabel}>Lượt ghi nhận</Text>
        </View>
        <View style={s.panelDivider} />
        {/* mini pie — just bars */}
        {Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => {
          const color = ACTION_COLORS[k] || '#64748B';
          const pct = total > 0 ? (v / total) * 100 : 0;
          return (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
              <View style={[s.panelRowDot, { backgroundColor: color }]} />
              <Text style={{ flex: 1, ...font.caption, color: colors.text.primary, textTransform: 'capitalize' }}>{k}</Text>
              <View style={{ width: 60, height: 8, backgroundColor: colors.surface.disabled, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: 8, backgroundColor: color, borderRadius: 4 }} />
              </View>
              <Text style={{ width: 30, textAlign: 'right', ...font.micro, fontWeight: '700', color }}>{v}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const TableRow = ({ item }: { item: any }) => {
    const icon = ACTION_ICONS[item.action] || 'information';
    const color = ACTION_COLORS[item.action] || '#64748B';
    const oldV = typeof item.old_value === 'object' ? JSON.stringify(item.old_value) : item.old_value;
    const newV = typeof item.new_value === 'object' ? JSON.stringify(item.new_value) : item.new_value;
    return (
      <TouchableOpacity style={s.tr} activeOpacity={0.7}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[s.actionIcon, { backgroundColor: color + '15' }]}>
            <Icon name={icon as any} size={12} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[s.td, { fontWeight: '600', textTransform: 'capitalize' }]}>{item.action}</Text>
              <Text style={{ ...font.micro, color: colors.text.muted }}>{item.resource}</Text>
            </View>
            <Text style={{ ...font.micro, color: colors.text.muted }}>{item.user_name}</Text>
          </View>
        </View>
        <Text style={[s.td, { width: 130, textAlign: 'right', ...font.caption, color: colors.text.muted }]}>{item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : ''}</Text>
      </TouchableOpacity>
    );
  };

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={filtered} keyExtractor={(item, i) => item.id || String(i)} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 32 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="clipboard-text-off" title="Chưa có log" subtitle="Chưa có ghi nhận nào" />}
        ListHeaderComponent={
          <View style={s.thead}>
            <SortHeader label="Hành động" sort="action" />
            <SortHeader label="Thời gian" sort="created_at" />
          </View>
        }
      />
    );
  };

  const actions = Object.keys(counts);
  return (
    <ScreenContainer compact>
      <ScreenHeader title="Audit Log" subtitle={`${logs.length} logs`}
        onMenuPress={openSidebar} compact
        right={<TouchableOpacity onPress={load} style={s.refreshBtn}><Icon name="refresh" size={18} color={colors.icon.default} /></TouchableOpacity>}
      />
      <View style={s.statsBar}>
        <StatItem icon="clipboard-text" value={logs.length} label="Tổng log" />
        <View style={s.barDivider} />
        <StatItem icon="plus-circle" value={counts['create'] || 0} label="Tạo" />
        <View style={s.barDivider} />
        <StatItem icon="pencil" value={counts['update'] || 0} label="Sửa" />
        <View style={s.barDivider} />
        <StatItem icon="delete-circle" value={counts['delete'] || 0} label="Xoá" />
      </View>
      <View style={s.filterRow}>
        <TouchableOpacity onPress={() => setFilterAction('')} style={[s.chip, !filterAction && { backgroundColor: colors.brand.primary }]}>
          <Text style={[s.chipText, !filterAction && { color: '#fff' }]}>Tất cả</Text>
        </TouchableOpacity>
        {actions.map(a => (
          <TouchableOpacity key={a} onPress={() => setFilterAction(filterAction === a ? '' : a)}
            style={[s.chip, filterAction === a && { backgroundColor: colors.brand.primary }]}>
            <Text style={[s.chipText, filterAction === a && { color: '#fff' }]}>{a}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <SearchBar value={searchUser} onChangeText={setSearchUser} placeholder="Tìm user..." />
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : renderList()}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  refreshBtn: { width: 44, height: 44, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '800', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },

  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light, flexWrap: 'wrap', alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default },
  chipText: { ...font.badge, color: colors.text.muted },
  searchInput: { borderWidth: 1, borderColor: colors.border.default, borderRadius: shape.radius.full, paddingHorizontal: 12, paddingVertical: 6, ...font.micro, color: colors.text.primary, backgroundColor: colors.surface.app, minWidth: 120 },

  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: colors.border.default, marginBottom: 4 },
  thText: { ...font.caption, fontWeight: '700', color: colors.text.muted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  td: { ...font.bodySmall, color: colors.text.primary },
  actionIcon: { width: 44, height: 44, borderRadius: shape.radius.sm, alignItems: 'center', justifyContent: 'center' },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelStatValue: { ...font.h1, fontWeight: '800', color: colors.text.primary },
  panelStatLabel: { ...font.caption, color: colors.text.muted, marginTop: 2 },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelRowDot: { width: 8, height: 8, borderRadius: 4 },

  separator: { width: 1, backgroundColor: colors.border.light },
});

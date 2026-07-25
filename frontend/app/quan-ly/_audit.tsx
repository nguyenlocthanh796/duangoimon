import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import SearchBar from '../../lib/components/ui/SearchBar';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';

const ACTION_ICONS: Record<string, string> = { create: 'plus-circle', update: 'pencil', delete: 'delete-circle', login: 'login', logout: 'logout' };
const ACTION_COLORS: Record<string, string> = { create: colors.status.success, update: colors.status.warning, delete: colors.status.danger, login: colors.status.info, logout: colors.text.muted };

export default function AuditScreen() {
  const { isWide } = useResponsive();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    try { setLoading(true); const data: any = await request(API + '/audit-logs?limit=100'); setLogs(Array.isArray(data) ? data : (data?.items || [])); }
    catch { setLogs([]); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts: Record<string, number> = {};
  logs.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1; });

  const filtered = useMemo(() => {
    let arr = [...logs];
    if (filterAction) arr = arr.filter(l => l.action === filterAction);
    if (searchUser) arr = arr.filter(l => (l.user_name || '').toLowerCase().includes(searchUser.toLowerCase()));
    return arr;
  }, [logs, filterAction, searchUser]);

  const columns: Column<any>[] = [
    {
      key: 'action',
      title: 'Hành động',
      flex: 1,
      sortable: true,
      sortValue: (l) => l.action || '',
      render: (l) => {
        const icon = ACTION_ICONS[l.action] || 'information';
        const color = ACTION_COLORS[l.action] || colors.text.muted;
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name={icon as any} size={14} color={color} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="sm" weight="bold" color={color} style={{ textTransform: 'capitalize' }}>{l.action}</AppText>
                <AppText variant="sm" color={colors.text.secondary}>{l.resource}</AppText>
              </View>
              <AppText variant="sm" color={colors.text.muted}>{l.user_name}</AppText>
            </View>
          </View>
        );
      },
    },
    {
      key: 'created_at',
      title: 'Thời gian',
      width: 130,
      align: 'right',
      sortable: true,
      sortValue: (l) => l.created_at || '',
      render: (l) => <AppText variant="sm" color={colors.text.muted}>{l.created_at ? new Date(l.created_at).toLocaleString('vi-VN') : ''}</AppText>,
    },
  ];

  const renderPanel = () => {
    const c: Record<string, number> = {};
    logs.forEach(l => { c[l.action] = (c[l.action] || 0) + 1; });
    const total = logs.length;
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="clipboard-text-outline" size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Thống kê kiểm toán hệ thống</AppText>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 4 }}>
          <AppText variant="lg" weight="bold" color={colors.text.primary}>{total}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Lượt ghi nhận log</AppText>
        </View>
        <View style={styles.panelDivider} />
        {Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => {
          const color = ACTION_COLORS[k] || colors.text.muted;
          const pct = total > 0 ? (v / total) * 100 : 0;
          return (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
              <View style={[styles.panelRowDot, { backgroundColor: color }]} />
              <AppText variant="sm" color={colors.text.primary} style={{ flex: 1, textTransform: 'capitalize' }}>{k}</AppText>
              <View style={{ width: 50, height: 6, backgroundColor: colors.surface.app, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
              </View>
              <AppText variant="sm" weight="bold" color={color} style={{ width: 25, textAlign: 'right' }}>{v}</AppText>
            </View>
          );
        })}
      </View>
    );
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const actions = Object.keys(counts);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="clipboard-text" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{logs.length}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tổng log</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="plus-circle" size={16} color={colors.status.success} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.status.success}>{counts['create'] || 0}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tạo mới</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="pencil" size={16} color={colors.status.warning} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.status.warning}>{counts['update'] || 0}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Cập nhật</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="delete-circle" size={16} color={colors.status.danger} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.status.danger}>{counts['delete'] || 0}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Xóa</AppText>
          </View>
        </View>
      </View>

      {/* Filter Chips & Search Bar */}
      <View style={styles.filterRow}>
        <TouchableOpacity onPress={() => setFilterAction('')} style={[styles.chip, !filterAction && styles.chipActive]}>
          <AppText variant="sm" color={!filterAction ? colors.brand.primary : colors.text.secondary} weight={!filterAction ? 'bold' : 'normal'}>Tất cả</AppText>
        </TouchableOpacity>
        {actions.map(a => (
          <TouchableOpacity key={a} onPress={() => setFilterAction(filterAction === a ? '' : a)}
            style={[styles.chip, filterAction === a && styles.chipActive]}>
            <AppText variant="sm" color={filterAction === a ? colors.brand.primary : colors.text.secondary} weight={filterAction === a ? 'bold' : 'normal'}>{a}</AppText>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <View style={{ width: 140 }}>
          <SearchBar value={searchUser} onChangeText={setSearchUser} placeholder="Tìm user..." />
        </View>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<any>
              columns={columns}
              data={filtered}
              getRowId={(l) => l.id}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onRefresh={load}
              compact
              emptyIcon="clipboard-text-off"
              emptyTitle="Chưa có log kiềm toán"
              emptySubtitle=""
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <DataTable<any>
            columns={columns}
            data={filtered}
            getRowId={(l) => l.id}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            onRefresh={load}
            compact
            emptyIcon="clipboard-text-off"
            emptyTitle="Chưa có log kiểm toán"
            emptySubtitle=""
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    marginHorizontal: 8,
    marginVertical: 8,
  },
  statItem: { flex: 1, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: shape.radius.md, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand.primaryBg },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelRowDot: { width: 6, height: 6, borderRadius: 3 },
});

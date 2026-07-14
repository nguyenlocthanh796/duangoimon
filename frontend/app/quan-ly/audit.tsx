import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import SearchBar from '../../lib/components/ui/SearchBar';

const API = '/api/v1/quan-ly';

const ACTION_ICONS: Record<string, string> = { create: 'plus-circle', update: 'pencil', delete: 'delete-circle', login: 'login', logout: 'logout' };
const ACTION_COLORS: Record<string, string> = { create: '#16A34A', update: '#D97706', delete: '#DC2626', login: '#3B82F6', logout: '#737373' };

export default function AuditScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    try { setLoading(true); const data: any = await request(API + '/audit-logs?limit=100'); setLogs(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
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
        const color = ACTION_COLORS[l.action] || '#737373';
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
              <Icon name={icon as any} size={12} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.cellAction, { color }]}>{l.action}</Text>
                <Text style={{ ...font.micro, color: '#737373' }}>{l.resource}</Text>
              </View>
              <Text style={{ ...font.micro, color: '#737373' }}>{l.user_name}</Text>
            </View>
          </View>
        );
      },
    },
    {
      key: 'created_at',
      title: 'Thời gian',
      width: 145,
      align: 'right',
      sortable: true,
      sortValue: (l) => l.created_at || '',
      render: (l) => <Text style={styles.cellTime}>{l.created_at ? new Date(l.created_at).toLocaleString('vi-VN') : ''}</Text>,
    },
  ];

  const renderPanel = () => {
    const c: Record<string, number> = {};
    logs.forEach(l => { c[l.action] = (c[l.action] || 0) + 1; });
    const total = logs.length;
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="clipboard-text" size={18} color={'#F97316'} />
          <Text style={styles.panelHeaderText}>Audit</Text>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 8}}>
          <Text style={styles.panelStatValue}>{total}</Text>
          <Text style={styles.panelStatLabel}>Lượt ghi nhận</Text>
        </View>
        <View style={styles.panelDivider} />
        {Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => {
          const color = ACTION_COLORS[k] || '#737373';
          const pct = total > 0 ? (v / total) * 100 : 0;
          return (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 3 }}>
              <View style={[styles.panelRowDot, { backgroundColor: color }]} />
              <Text style={{ flex: 1, ...font.caption, color: '#171717', textTransform: 'capitalize' }}>{k}</Text>
              <View style={{ width: 60, height: 8, backgroundColor: '#F5F5F5', borderRadius: 12, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: 8, backgroundColor: color, borderRadius: 12}} />
              </View>
              <Text style={{ width: 25, textAlign: 'right', ...font.micro, fontWeight: '600', color }}>{v}</Text>
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
    <ScreenContainer compact>
      <ScreenHeader title="Audit Log" subtitle={`${logs.length} logs`}
        onMenuPress={openSidebar} compact
        right={<TouchableOpacity onPress={load} style={styles.refreshBtn}><Icon name="refresh" size={18} color={colors.icon.default} /></TouchableOpacity>}
      />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="clipboard-text" size={14} color={'#737373'} /><Text style={styles.statValue}>{logs.length}</Text>
          </View>
          <Text style={styles.statLabel}>Tổng log</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="plus-circle" size={14} color={'#737373'} /><Text style={styles.statValue}>{counts['create'] || 0}</Text>
          </View>
          <Text style={styles.statLabel}>Tạo</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="pencil" size={14} color={'#737373'} /><Text style={styles.statValue}>{counts['update'] || 0}</Text>
          </View>
          <Text style={styles.statLabel}>Sửa</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="delete-circle" size={14} color={'#737373'} /><Text style={styles.statValue}>{counts['delete'] || 0}</Text>
          </View>
          <Text style={styles.statLabel}>Xoá</Text>
        </View>
      </View>
      <View style={styles.filterRow}>
        <TouchableOpacity onPress={() => setFilterAction('')} style={[styles.chip, !filterAction && styles.chipActive]}>
          <Text style={[styles.chipText, !filterAction && styles.chipTextActive]}>Tất cả</Text>
        </TouchableOpacity>
        {actions.map(a => (
          <TouchableOpacity key={a} onPress={() => setFilterAction(filterAction === a ? '' : a)}
            style={[styles.chip, filterAction === a && styles.chipActive]}>
            <Text style={[styles.chipText, filterAction === a && styles.chipTextActive]}>{a}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <SearchBar value={searchUser} onChangeText={setSearchUser} placeholder="Tìm user..." />
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
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
              emptyTitle="Chưa có log"
              emptySubtitle="Chưa có ghi nhận nào"
            />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
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
          emptyTitle="Chưa có log"
          emptySubtitle="Chưa có ghi nhận nào"
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  refreshBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
  statValue: { ...font.bodyBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.micro, color: '#737373', lineHeight: 12 },
  filterRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 4, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', flexWrap: 'wrap', alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5' },
  chipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  chipText: { ...font.badge, color: '#737373' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  cellAction: { ...font.bodySmall, fontWeight: '600', textTransform: 'capitalize' },
  cellTime: { ...font.caption, color: '#737373' },
  actionIcon: { width: 32, height: 32, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12},
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.body, fontWeight: '600', color: '#171717' },
  panelStatValue: { ...font.pageTitle, fontWeight: '600', color: '#171717' },
  panelStatLabel: { ...font.caption, color: '#737373', marginTop: 2 },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  panelRowDot: { width: 8, height: 8, borderRadius: 12},
  separator: { width: 1, backgroundColor: '#F0F0F0' },
});

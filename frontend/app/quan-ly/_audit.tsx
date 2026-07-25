import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import SearchBar from '../../lib/components/ui/SearchBar';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';

const ACTION_ICONS: Record<string, string> = { create: 'plus-circle', update: 'pencil', delete: 'delete-circle', login: 'login', logout: 'logout' };
const ACTION_COLORS: Record<string, string> = { create: colors.status.success, update: colors.status.warning, delete: colors.status.danger, login: colors.status.info, logout: colors.text.muted };
const ACTION_BG: Record<string, string> = { create: colors.status.successBg || '#DCFCE7', update: '#FEF3C7', delete: colors.status.dangerBg || '#FEE2E2', login: '#E0F2FE', logout: colors.surface.app };

export default function AuditScreen() {
  const { isWide } = useResponsive();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
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
      title: 'Hành động kiểm toán',
      flex: 1,
      sortable: true,
      sortValue: (l) => l.action || '',
      render: (l) => {
        const icon = ACTION_ICONS[l.action] || 'information';
        const color = ACTION_COLORS[l.action] || colors.text.muted;
        const bg = ACTION_BG[l.action] || colors.surface.app;
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.actionBadgeCircle, { backgroundColor: bg }]}>
              <Icon name={icon as any} size={16} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="md" weight="bold" color="#050505" style={{ textTransform: 'capitalize' }}>{l.action}</AppText>
                {l.resource ? <AppText variant="sm" color={colors.text.secondary}>· {l.resource}</AppText> : null}
              </View>
              <AppText variant="sm" color={colors.text.muted}>@{l.user_name || 'Hệ thống'}</AppText>
            </View>
          </View>
        );
      },
    },
    {
      key: 'created_at',
      title: 'Thời gian',
      width: 135,
      align: 'right',
      sortable: true,
      sortValue: (l) => l.created_at || '',
      render: (l) => <AppText variant="sm" color={colors.text.muted}>{l.created_at ? new Date(l.created_at).toLocaleString('vi-VN') : ''}</AppText>,
    },
  ];

  const renderMobileCard = (l: any) => {
    const icon = ACTION_ICONS[l.action] || 'information';
    const color = ACTION_COLORS[l.action] || colors.text.muted;
    const bg = ACTION_BG[l.action] || colors.surface.app;
    return (
      <View style={styles.mobileItemCardFbFullWidth} key={l.id}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.actionBadgeCircle, { backgroundColor: bg }]}>
            <Icon name={icon as any} size={20} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="md" weight="bold" color="#050505" style={{ textTransform: 'capitalize', fontSize: 16 }}>{l.action}</AppText>
              {l.resource ? <AppText variant="sm" color="#65676B">· {l.resource}</AppText> : null}
            </View>
            <AppText variant="sm" color="#65676B">@{l.user_name || 'Hệ thống'}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <AppText variant="sm" color="#65676B" style={{ fontSize: 12 }}>
              {l.created_at ? new Date(l.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
            </AppText>
          </View>
        </View>

        {/* Facebook Equal Bottom Action Bar */}
        <View style={styles.cardActionBar}>
          <TouchableOpacity style={styles.cardActionItem} onPress={() => setSelectedLog(l)}>
            <Icon name="file-document-outline" size={16} color={colors.brand.primary} />
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>Xem chi tiết log</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPanel = () => {
    const c: Record<string, number> = {};
    logs.forEach(l => { c[l.action] = (c[l.action] || 0) + 1; });
    const total = logs.length;
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="clipboard-text-outline" size={18} color={colors.brand.primary} />
          <AppText variant="md" weight="bold" color="#050505">
            {selectedLog ? 'Chi tiết log kiểm toán' : 'Thống kê kiểm toán hệ thống'}
          </AppText>
        </View>

        {selectedLog ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="sm" color={colors.text.muted}>Hành động</AppText>
              <AppText variant="sm" weight="bold" color={ACTION_COLORS[selectedLog.action] || colors.text.primary} style={{ textTransform: 'capitalize' }}>{selectedLog.action}</AppText>
            </View>
            <View style={styles.panelDivider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="sm" color={colors.text.muted}>Người thực hiện</AppText>
              <AppText variant="sm" weight="bold" color="#050505">@{selectedLog.user_name || 'Hệ thống'}</AppText>
            </View>
            <View style={styles.panelDivider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="sm" color={colors.text.muted}>Tài nguyên</AppText>
              <AppText variant="sm" weight="bold" color="#050505">{selectedLog.resource || '—'}</AppText>
            </View>
            <View style={styles.panelDivider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="sm" color={colors.text.muted}>Thời gian ghi nhận</AppText>
              <AppText variant="sm" color="#050505">{selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString('vi-VN') : '—'}</AppText>
            </View>
            <View style={styles.panelDivider} />
            <TouchableOpacity style={styles.panelCtaSecondary} onPress={() => setSelectedLog(null)}>
              <AppText variant="sm" weight="bold" color={colors.brand.primary}>Đóng chi tiết</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ alignItems: 'center', paddingVertical: 4 }}>
              <AppText variant="lg" weight="bold" color="#050505">{total}</AppText>
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
          </>
        )}
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
      {/* Search & Filter Bar */}
      <View style={styles.searchBarRow}>
        <SearchBar value={searchUser} onChangeText={setSearchUser} placeholder="Tìm nhân viên thực hiện..." />
      </View>

      {/* Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: colors.brand.primaryBg }]}>
            <Icon name="clipboard-text" size={18} color={colors.brand.primary} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color="#050505">{logs.length}</AppText>
            <AppText variant="sm" color="#65676B">Tổng log</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="plus-circle" size={18} color={colors.status.success} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={colors.status.success}>{counts['create'] || 0}</AppText>
            <AppText variant="sm" color="#65676B">Tạo mới</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="pencil" size={18} color={colors.status.warning} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={colors.status.warning}>{counts['update'] || 0}</AppText>
            <AppText variant="sm" color="#65676B">Cập nhật</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="delete-circle" size={18} color={colors.status.danger} />
          </View>
          <View>
            <AppText variant="md" weight="bold" color={colors.status.danger}>{counts['delete'] || 0}</AppText>
            <AppText variant="sm" color="#65676B">Xóa</AppText>
          </View>
        </View>
      </View>

      {/* Filter Chips - Facebook Sub-Filter Pills */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
          <TouchableOpacity onPress={() => setFilterAction('')} style={[styles.chip, !filterAction && styles.chipActive]}>
            <AppText variant="sm" color={!filterAction ? colors.brand.primary : '#050505'} weight={!filterAction ? 'bold' : 'normal'}>Tất cả</AppText>
          </TouchableOpacity>
          {actions.map(a => (
            <TouchableOpacity key={a} onPress={() => setFilterAction(filterAction === a ? '' : a)}
              style={[styles.chip, filterAction === a && styles.chipActive]}>
              <AppText variant="sm" color={filterAction === a ? colors.brand.primary : '#050505'} weight={filterAction === a ? 'bold' : 'normal'} style={{ textTransform: 'capitalize' }}>{a}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
              onRowPress={setSelectedLog}
              selectedRowId={selectedLog?.id ?? null}
              onRefresh={load}
              compact
              emptyIcon="clipboard-text-off"
              emptyTitle="Chưa có log kiểm toán"
              emptySubtitle=""
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1, width: '100%' }}>
          <DataTable<any>
            columns={columns}
            data={filtered}
            getRowId={(l) => l.id}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            onRowPress={setSelectedLog}
            selectedRowId={selectedLog?.id ?? null}
            onRefresh={load}
            renderMobileCard={renderMobileCard}
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
  searchBarRow: { paddingHorizontal: 12, marginVertical: 4 },

  /* Facebook Story Highlight Metric Cards Container */
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
  },
  fbMetricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.card,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  fbMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justify: 'center',
  },

  filterRow: { marginVertical: 4, marginBottom: 8 },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand.primaryBg, borderWidth: 1, borderColor: '#FFEDD5' },
  actionBadgeCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  actionCircleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' },

  /* Mobile Full-Width Edge-to-Edge Facebook Log Card */
  mobileItemCardFbFullWidth: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 0,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  /* Facebook Equal Bottom Action Bar */
  cardActionBar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 8, marginTop: 10 },
  cardActionItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelRowDot: { width: 6, height: 6, borderRadius: 3 },
  panelCtaSecondary: { height: 38, borderRadius: 999, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});

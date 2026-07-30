import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, ss } from '../../lib/theme';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import SearchBar from '../../lib/components/ui/SearchBar';
import DetailModal from '../../lib/components/ui/DetailModal';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';
const ACTION_COLORS: Record<string, string> = { create: colors.status.success, update: colors.status.warning, delete: colors.status.danger, login: colors.status.info, logout: colors.text.muted };
const ACTION_BG: Record<string, string> = { create: '#DCFCE7', update: '#FEF3C7', delete: '#FEE2E2', login: '#E0F2FE', logout: colors.surface.app };
const ACTION_LABELS: Record<string, string> = { create: 'Tạo mới', update: 'Cập nhật', delete: 'Xóa', login: 'Đăng nhập', logout: 'Đăng xuất', import: 'Nhập', export: 'Xuất' };
const fmtAction = (action: string) => (ACTION_LABELS[action?.toLowerCase()] || action?.charAt(0).toUpperCase() + action?.slice(1)) || '';

export default function AuditScreen(_props?: { isSearchOpen?: boolean }) {
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
    { key: 'action', title: 'Hành động', flex: 1, sortable: true,
      render: (l) => {
        const c = ACTION_COLORS[l.action] || colors.text.muted;
        const bg = ACTION_BG[l.action] || colors.surface.app;
        return (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} /></View>
          <View><AppText variant="md" color="#050505">{fmtAction(l.action)}{l.resource ? ` · ${l.resource}` : ''}</AppText><AppText variant="md" color={colors.text.muted}>@{l.user_name || 'Hệ thống'}</AppText></View>
        </View>);
      } },
    { key: 'created_at', title: 'Thời gian', width: 135, align: 'right' as const, sortable: true,
      render: (l) => <AppText variant="md" color={colors.text.muted}>{l.created_at ? new Date(l.created_at).toLocaleString('vi-VN') : ''}</AppText> },
  ];

  const renderMobileCard = (l: any) => {
    const c = ACTION_COLORS[l.action] || colors.text.muted;
    const bg = ACTION_BG[l.action] || colors.surface.app;
    return (
      <View style={s.row} key={l.id}>
        <View style={[s.avatar, { backgroundColor: bg }]}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} /></View>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedLog(l)}>
          <AppText variant="md" color="#0F172A">{fmtAction(l.action)}{l.resource ? ` · ${l.resource}` : ''}</AppText>
          <AppText variant="md" color="#64748B">@{l.user_name || 'Hệ thống'}</AppText>
        </TouchableOpacity>
        <AppText variant="md" color="#64748B">{l.created_at ? new Date(l.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</AppText>
        <TouchableOpacity style={ss.miniActionBtn} onPress={() => setSelectedLog(l)}><Icon name="eye-outline" size={16} color={colors.brand.primary} /></TouchableOpacity>
      </View>
    );
  };

  const renderPanel = () => {
    const c: Record<string, number> = {};
    logs.forEach(l => { c[l.action] = (c[l.action] || 0) + 1; });
    const total = logs.length;
    return (
      <View style={s.panel}>
        <View style={s.panelHdr}><AppText variant="md" color="#050505">{selectedLog ? fmtAction(selectedLog.action) : 'Thống kê'}</AppText></View>
        {selectedLog ? (
          <View style={{ gap: 8 }}>
            <Row label="Hành động" value={fmtAction(selectedLog.action)} color={ACTION_COLORS[selectedLog.action]} />
            <View style={s.divider} />
            <Row label="Người TH" value={`@${selectedLog.user_name || 'Hệ thống'}`} />
            <View style={s.divider} />
            <Row label="Tài nguyên" value={selectedLog.resource || 'Hệ thống'} />
            {selectedLog.created_at && <><View style={s.divider} /><Row label="Thời gian" value={new Date(selectedLog.created_at).toLocaleString('vi-VN')} /></>}
            <TouchableOpacity style={s.panelBtn} onPress={() => setSelectedLog(null)}><AppText variant="md" color={colors.brand.primary}>Đóng</AppText></TouchableOpacity>
          </View>
        ) : (
          <><View style={{ alignItems: 'center' }}><AppText variant="md" color="#050505">{total}</AppText><AppText variant="md" color={colors.text.muted}>Lượt log</AppText></View>
          <View style={s.divider} />
          {Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => {
            const color = ACTION_COLORS[k] || colors.text.muted;
            return (<View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} /><AppText variant="md" color={colors.text.primary} style={{ flex: 1 }}>{fmtAction(k)}</AppText><AppText variant="md" color={color}>{v}</AppText></View>);
          })}
        </>)}
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
      <View style={ss.topActionBar}>
        <View style={{ flex: 1 }}><SearchBar value={searchUser} onChangeText={setSearchUser} placeholder="Tìm nhân viên..." /></View>
        {!isWide && <TouchableOpacity onPress={load} style={ss.addBtn}><AppText variant="md" color="#FFF">Làm mới</AppText></TouchableOpacity>}
      </View>

      <View style={s.metricBar}>
        <View style={{ flex: 1 }}><AppText variant="md" color="#050505">{logs.length}</AppText><AppText variant="md" color="#64748B">Tổng</AppText></View>
        <View style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />
        <View style={{ flex: 1 }}><AppText variant="md" color={colors.status.success}>{counts['create'] || 0}</AppText><AppText variant="md" color="#64748B">Tạo</AppText></View>
        <View style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />
        <View style={{ flex: 1 }}><AppText variant="md" color={colors.status.warning}>{counts['update'] || 0}</AppText><AppText variant="md" color="#64748B">Sửa</AppText></View>
        <View style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />
        <View style={{ flex: 1 }}><AppText variant="md" color={colors.status.danger}>{counts['delete'] || 0}</AppText><AppText variant="md" color="#64748B">Xóa</AppText></View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingVertical: 6, backgroundColor: '#FFF' }}>
        <TouchableOpacity onPress={() => setFilterAction('')} style={[s.chip, !filterAction && s.chipActive]}><AppText variant="md" color={!filterAction ? colors.brand.primary : '#334155'}>Tất cả ({logs.length})</AppText></TouchableOpacity>
        {actions.map(a => {
          const active = filterAction === a;
          return (<TouchableOpacity key={a} onPress={() => setFilterAction(active ? '' : a)} style={[s.chip, active && s.chipActive]}><AppText variant="md" color={active ? colors.brand.primary : '#334155'}>{fmtAction(a)} ({counts[a]})</AppText></TouchableOpacity>);
        })}
      </ScrollView>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<any> columns={columns} data={filtered} getRowId={(l: any) => l.id} loading={loading}
              sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange}
              onRowPress={setSelectedLog} selectedRowId={selectedLog?.id ?? null} onRefresh={load} compact
              emptyIcon="clipboard-text-off" emptyTitle="Chưa có log" emptySubtitle="" />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}><AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>NHẬT KÝ ({filtered.length})</AppText></View>
            <View style={{ paddingHorizontal: 10 }}>{filtered.map(renderMobileCard)}</View>
          </View>
        </ScrollView>
      )}

      {!isWide && (
        <DetailModal visible={!!selectedLog} title={selectedLog ? fmtAction(selectedLog.action) : ''}
          subtitle={selectedLog ? `Tài nguyên: ${selectedLog.resource || 'Hệ thống'}` : undefined}
          onClose={() => setSelectedLog(null)}>
          {selectedLog && (
            <View style={{ gap: 12 }}>
              <Row label="Hành động" value={fmtAction(selectedLog.action)} color={ACTION_COLORS[selectedLog.action]} />
              <Row label="Người" value={`@${selectedLog.user_name || 'Hệ thống'}`} />
              <Row label="Tài nguyên" value={selectedLog.resource || 'Hệ thống'} />
              {selectedLog.created_at && <Row label="Thời gian" value={new Date(selectedLog.created_at).toLocaleString('vi-VN')} />}
            </View>
          )}
        </DetailModal>
      )}
    </View>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText variant="md" color="#64748B">{label}</AppText>
      <AppText variant="md" color={color || '#0F172A'}>{value}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 48, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  metricBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 10, paddingHorizontal: 12, gap: 0 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand.primaryBg, borderColor: colors.brand.primary },
  panel: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12 },
  panelHdr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  divider: { height: 1, backgroundColor: colors.border.light },
  panelBtn: { height: 44, borderRadius: 999, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});

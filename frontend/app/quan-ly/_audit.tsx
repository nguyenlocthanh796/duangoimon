import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import SearchBar from '../../lib/components/ui/SearchBar';
import DetailModal from '../../lib/components/ui/DetailModal';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';

const ACTION_ICONS: Record<string, string> = { create: 'plus-circle', update: 'pencil', delete: 'delete-circle', login: 'login', logout: 'logout' };
const ACTION_COLORS: Record<string, string> = { create: colors.status.success, update: colors.status.warning, delete: colors.status.danger, login: colors.status.info, logout: colors.text.muted };
const ACTION_BG: Record<string, string> = { create: colors.status.successBg || '#DCFCE7', update: '#FEF3C7', delete: colors.status.dangerBg || '#FEE2E2', login: '#E0F2FE', logout: colors.surface.app };

const ACTION_LABELS: Record<string, string> = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa dữ liệu',
  login: 'Đăng nhập',
  logout: 'Đăng xuất',
  import: 'Nhập dữ liệu',
  export: 'Xuất dữ liệu',
};

const formatActionLabel = (action: string) => {
  if (!action) return '';
  return ACTION_LABELS[action.toLowerCase()] || action.charAt(0).toUpperCase() + action.slice(1);
};

export default function AuditScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
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
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <AppText variant="md" color="#050505">{formatActionLabel(l.action)}</AppText>
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
      <View style={styles.posTableRow} key={l.id}>
        <View style={[styles.posAvatarMiniCircle, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        </View>

        <TouchableOpacity style={{ flex: 1, paddingRight: 8 }} onPress={() => setSelectedLog(l)} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="sm" color="#0F172A" numberOfLines={1}>
              {formatActionLabel(l.action)}
            </AppText>
            {l.resource ? <AppText variant="sm" color="#64748B" numberOfLines={1}>· {l.resource}</AppText> : null}
          </View>
          <AppText variant="sm" color="#64748B" numberOfLines={1}>
            @{l.user_name || 'Hệ thống'}
          </AppText>
        </TouchableOpacity>

        <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
          <AppText variant="sm" color="#64748B">
            {l.created_at ? new Date(l.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
          </AppText>
        </View>

        <TouchableOpacity style={styles.miniActionBtn} onPress={() => setSelectedLog(l)}>
          <Icon name="eye-outline" size={16} color={colors.brand.primary} />
        </TouchableOpacity>
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
          <AppText variant="md" weight="bold" color="#050505">
            {selectedLog ? `Chi tiết: ${formatActionLabel(selectedLog.action)}` : 'Thống kê nhật ký'}
          </AppText>
        </View>

        {selectedLog ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="sm" color={colors.text.muted}>Hành động</AppText>
              <AppText variant="sm" color={ACTION_COLORS[selectedLog.action] || '#050505'}>
                {formatActionLabel(selectedLog.action)}
              </AppText>
            </View>
            <View style={styles.panelDivider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="sm" color={colors.text.muted}>Người thực hiện</AppText>
              <AppText variant="sm" color="#050505">@{selectedLog.user_name || 'Hệ thống'}</AppText>
            </View>
            <View style={styles.panelDivider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="sm" color={colors.text.muted}>Tài nguyên</AppText>
              <AppText variant="sm" color="#050505">{selectedLog.resource || 'Hệ thống'}</AppText>
            </View>
            {selectedLog.created_at && (
              <>
                <View style={styles.panelDivider} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color={colors.text.muted}>Thời gian</AppText>
                  <AppText variant="sm" color="#050505">{new Date(selectedLog.created_at).toLocaleString('vi-VN')}</AppText>
                </View>
              </>
            )}
            <View style={styles.panelDivider} />
            <TouchableOpacity style={styles.panelCtaSecondary} onPress={() => setSelectedLog(null)}>
              <AppText variant="sm" color={colors.brand.primary}>Đóng chi tiết</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{ alignItems: 'center', paddingVertical: 4 }}>
              <AppText variant="md" weight="bold" color="#050505">{total}</AppText>
              <AppText variant="sm" color={colors.text.muted}>Lượt ghi nhận log</AppText>
            </View>
            <View style={styles.panelDivider} />
            {Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => {
              const color = ACTION_COLORS[k] || colors.text.muted;
              const pct = total > 0 ? (v / total) * 100 : 0;
              return (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
                  <View style={[styles.panelRowDot, { backgroundColor: color }]} />
                  <AppText variant="sm" color={colors.text.primary} style={{ flex: 1 }}>{formatActionLabel(k)}</AppText>
                  <View style={{ width: 50, height: 6, backgroundColor: colors.surface.app, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${pct}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
                  </View>
                  <AppText variant="sm" color={color} style={{ width: 25, textAlign: 'right' }}>{v}</AppText>
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

  const renderHeader = () => (
    <View>
      <View style={styles.searchBarRow}>
        <View style={{ flex: 1 }}>
          <SearchBar value={searchUser} onChangeText={setSearchUser} placeholder="Tìm nhân viên thực hiện..." />
        </View>
        {!isWide && (
          <TouchableOpacity onPress={load} style={styles.mobileAddBtn} activeOpacity={0.8}>
            <AppText variant="sm" weight="bold" color="#FFFFFF">Làm mới</AppText>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.flatMetricBar}>
        <View style={styles.flatMetricItem}>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#050505">{logs.length}</AppText>
            <AppText variant="sm" color="#65676B" style={{ fontSize: 11, lineHeight: 14 }}>Tổng nhật ký</AppText>
          </View>
        </View>

        <View style={styles.flatMetricDivider} />

        <View style={styles.flatMetricItem}>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color={colors.status.success}>{counts['create'] || 0}</AppText>
            <AppText variant="sm" color="#65676B" style={{ fontSize: 11, lineHeight: 14 }}>Tạo mới</AppText>
          </View>
        </View>

        <View style={styles.flatMetricDivider} />

        <View style={styles.flatMetricItem}>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color={colors.status.warning}>{counts['update'] || 0}</AppText>
            <AppText variant="sm" color="#65676B" style={{ fontSize: 11, lineHeight: 14 }}>Cập nhật</AppText>
          </View>
        </View>

        <View style={styles.flatMetricDivider} />

        <View style={styles.flatMetricItem}>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color={colors.status.danger}>{counts['delete'] || 0}</AppText>
            <AppText variant="sm" color="#65676B" style={{ fontSize: 11, lineHeight: 14 }}>Xóa dữ liệu</AppText>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, height: 44 }}
          contentContainerStyle={{ alignItems: 'center', backgroundColor: '#FFFFFF', flexDirection: 'row', gap: 6, paddingHorizontal: 12 }}
        >
          <TouchableOpacity
            onPress={() => setFilterAction('')}
            activeOpacity={0.7}
            style={[styles.chip, !filterAction && styles.chipActive]}
          >
            <AppText
              variant="sm"
              weight={!filterAction ? 'bold' : 'normal'}
              color={!filterAction ? colors.brand.primary : '#334155'}
            >
              Tất cả ({logs.length})
            </AppText>
          </TouchableOpacity>
          {actions.map(a => {
            const active = filterAction === a;
            const count = counts[a] || 0;
            return (
              <TouchableOpacity
                key={a}
                onPress={() => setFilterAction(active ? '' : a)}
                activeOpacity={0.7}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText
                  variant="sm"
                  weight={active ? 'bold' : 'normal'}
                  color={active ? colors.brand.primary : '#334155'}
                >
                  {formatActionLabel(a)} ({count})
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {isWide ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
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
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          {renderHeader()}
          <View style={styles.posCatSectionWrap}>
            <View style={styles.posCatHeader}>
              <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                DANH SÁCH NHẬT KÝ KIỂM TOÁN ({filtered.length})
              </AppText>
            </View>

            <View style={styles.posCatItemsGroup}>
              {filtered.map(l => renderMobileCard(l))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Mobile Detail Modal at Root level */}
      {!isWide && (
        <DetailModal
          visible={!!selectedLog}
          title={selectedLog ? formatActionLabel(selectedLog.action) : ''}
          subtitle={selectedLog ? `Tài nguyên: ${selectedLog.resource || 'Hệ thống'}` : undefined}
          onClose={() => setSelectedLog(null)}
        >
          {selectedLog && (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color="#64748B">Hành động kiểm toán</AppText>
                <AppText variant="sm" color={ACTION_COLORS[selectedLog.action] || '#0F172A'}>
                  {formatActionLabel(selectedLog.action)}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color="#64748B">Người thực hiện</AppText>
                <AppText variant="sm" color="#0F172A">@{selectedLog.user_name || 'Hệ thống'}</AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color="#64748B">Tài nguyên ảnh hưởng</AppText>
                <AppText variant="sm" color="#0F172A">{selectedLog.resource || 'Hệ thống'}</AppText>
              </View>
              {selectedLog.created_at ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color="#64748B">Thời gian ghi nhận</AppText>
                  <AppText variant="sm" color="#0F172A">{new Date(selectedLog.created_at).toLocaleString('vi-VN')}</AppText>
                </View>
              ) : null}
            </View>
          )}
        </DetailModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 6,
    backgroundColor: colors.brand.primary,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  /* POS Flat Edge-to-Edge Metric Header Bar */
  flatMetricBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  flatMetricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flatMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 6,
  },
  flatMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.brand.primaryBg,
    borderColor: colors.brand.primary,
  },
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
  panelCtaSecondary: { height: 44, borderRadius: 999, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center', marginTop: 4 },

  mobileTopActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 6,
  },
  mobileAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 6,
    backgroundColor: colors.brand.primary,
  },
  posTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  posAvatarMiniCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  miniActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posCatSectionWrap: {
    marginBottom: 16,
  },
  posCatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  catIconMiniCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posCatItemsGroup: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
});

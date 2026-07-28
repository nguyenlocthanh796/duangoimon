import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND, ss } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

function fmtDate(s?: string | null) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return s; }
}

export default function ShiftsScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const [active, setActive] = useState<any | null>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [initialCash, setInitialCash] = useState('0');
  const [actualCash, setActualCash] = useState('0');
  const [note, setNote] = useState('');

  const [sortKey, setSortKey] = useState<string>('started_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedShift = useMemo(() => shifts.find((s) => s.id === selectedId), [shifts, selectedId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [actRes, listRes]: any[] = await Promise.all([
        request(`${API}/shifts/active`).catch(() => null),
        request(`${API}/shifts`).catch(() => []),
      ]);
      setActive(actRes);
      setShifts(Array.isArray(listRes) ? listRes : (listRes?.items || []));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOpenShift = async () => {
    try {
      await request(`${API}/shifts/open`, {
        method: 'POST',
        body: JSON.stringify({ initial_cash: parseFloat(initialCash) || 0, note }),
      });
      setShowOpenModal(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể mở ca'); }
  };

  const handleCloseShift = async () => {
    if (!active?.id) return;
    try {
      await request(`${API}/shifts/${active.id}/close`, {
        method: 'POST',
        body: JSON.stringify({ actual_cash: parseFloat(actualCash) || 0, note }),
      });
      setShowCloseModal(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể chốt ca'); }
  };

  const columns: Column<any>[] = [
    {
      key: 'started_at',
      title: 'Thời gian ca',
      flex: 1,
      render: (s) => (
        <View>
          <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{fmtDate(s.started_at)}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Đóng: {s.ended_at ? fmtDate(s.ended_at) : 'Đang mở'}</AppText>
        </View>
      ),
    },
    {
      key: 'initial_cash',
      title: 'Tiền mở',
      width: 100,
      align: 'right',
      render: (s) => <AppText variant="sm" color={colors.text.secondary}>{formatVND(s.initial_cash)}</AppText>,
    },
    {
      key: 'revenue',
      title: 'Doanh thu',
      width: 110,
      align: 'right',
      render: (s) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(s.total_revenue || s.revenue)}</AppText>,
    },
  ];

  const totalClosed = shifts.filter(s => s.ended_at).length;
  const closedRevenue = shifts.reduce((acc, s) => acc + (s.total_revenue || s.revenue || 0), 0);

  const renderPanel = () => (
    <View style={ss.sectionWrap}>
      <View style={ss.sectionHeader}>
        <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>QUẢN LÝ CA LÀM VIỆC</AppText>
      </View>

      <View style={{ padding: 10, gap: 10 }}>
        {active?.id ? (
          <>
            <View style={{ backgroundColor: '#ECFDF5', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.status.success }} />
                <AppText variant="sm" weight="bold" color={colors.status.success}>CA ĐANG MỞ</AppText>
              </View>
              <AppText variant="sm" color="#64748B">Mở lúc: {fmtDate(active.started_at)}</AppText>
              <AppText variant="sm" color="#64748B">Tiền ban đầu: <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(active.initial_cash)}</AppText></AppText>
            </View>
            <TouchableOpacity onPress={() => setShowCloseModal(true)} style={[styles.panelBtn, { backgroundColor: colors.status.danger }]}>
              <Icon name="lock" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Chốt ca làm việc</AppText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <AppText variant="sm" color="#64748B">Hiện không có ca làm việc nào đang mở.</AppText>
            <TouchableOpacity onPress={() => setShowOpenModal(true)} style={[styles.panelBtn, { backgroundColor: colors.brand.primary }]}>
              <Icon name="plus" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Mở ca làm việc mới</AppText>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderMobileShiftCard = ({ item: s }: { item: any }) => {
    const isOpen = !s.ended_at;
    const statusColor = isOpen ? colors.status.success : colors.text.muted;
    const statusBg = isOpen ? '#ECFDF5' : '#F1F5F9';

    return (
      <View style={ss.listRow} key={s.id}>
        <View style={[styles.posAvatarMiniCircle, { backgroundColor: statusBg }]}>
          <AppText variant="sm" color={statusColor} style={{ fontSize: 11 }}>
            {isOpen ? '●' : '✓'}
          </AppText>
        </View>

        <TouchableOpacity
          style={{ flex: 1, paddingRight: 8 }}
          onPress={() => setSelectedId(s.id)}
          activeOpacity={0.7}
        >
          <AppText variant="sm" color="#0F172A" numberOfLines={1}>
            Ca mở: {fmtDate(s.started_at)}
          </AppText>
          <AppText variant="sm" color="#64748B" numberOfLines={1}>
            Tiền mở: {formatVND(s.initial_cash || 0)} · {isOpen ? 'Đang hoạt động' : `Đã kết ca`}
          </AppText>
        </TouchableOpacity>

        <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>
            {formatVND(s.total_revenue || s.revenue || 0)}
          </AppText>
          <AppText variant="sm" color={statusColor}>
            {isOpen ? 'Đang mở' : 'Đã kết ca'}
          </AppText>
        </View>

        <TouchableOpacity
          style={styles.miniActionBtn}
          onPress={() => setSelectedId(s.id)}
        >
          <Icon name={isOpen ? 'lock' : 'eye-outline'} size={16} color={isOpen ? colors.status.danger : colors.brand.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'started_at' ? 'desc' : 'asc'); }
  };

  const renderHeader = () => (
    <View>
      <View style={ss.metricContainer}>
        <View style={ss.metricCard}>
          <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="clock-outline" size={14} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#0F172A">{totalClosed}</AppText>
            <AppText variant="sm" color="#64748B">Ca đã đóng</AppText>
          </View>
        </View>

        <View style={ss.metricCard}>
          <View style={[ss.iconCircleSm, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="cash-register" size={14} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(closedRevenue)}</AppText>
            <AppText variant="sm" color="#64748B">Doanh thu ca</AppText>
          </View>
        </View>

        <View style={ss.metricCard}>
          <View style={[ss.iconCircleSm, { backgroundColor: active?.id ? '#ECFDF5' : '#F1F5F9' }]}>
            <Icon name={active?.id ? "play-circle-outline" : "stop-circle-outline"} size={14} color={active?.id ? colors.status.success : colors.text.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={active?.id ? colors.status.success : colors.text.muted}>{active?.id ? 'Đang mở' : 'Đã đóng'}</AppText>
            <AppText variant="sm" color="#64748B">Trạng thái ca</AppText>
          </View>
        </View>
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
                data={shifts}
                getRowId={(s) => s.id}
                loading={loading}
                sortKey={sortKey}
                sortDir={sortDir}
                onSortChange={handleSortChange}
                onRefresh={load}
                compact
                emptyIcon="timer-off"
                emptyTitle="Chưa có ca làm việc nào"
                emptySubtitle=""
              />
            </View>
            <View style={{ flex: 0.45 }}>{renderPanel()}</View>
          </View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          {renderHeader()}
          
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                LỊCH SỬ CA LÀM VIỆC ({shifts.length})
              </AppText>
            </View>

            <View style={{ paddingHorizontal: 10, paddingVertical: shifts.length ? 4 : 16 }}>
              {loading ? (
                <TableSkeleton rowCount={5} />
              ) : shifts.length === 0 ? (
                <EmptyState
                  icon="timer-off"
                  title="Chưa có ca làm việc nào"
                  subtitle="Nhấn nút Mở ca bên dưới để tạo ca làm việc mới"
                />
              ) : (
                shifts.map(item => (
                  <React.Fragment key={item.id}>
                    {renderMobileShiftCard({ item })}
                  </React.Fragment>
                ))
              )}
            </View>
          </View>

          {renderPanel()}
        </ScrollView>
      )}

      {/* Form Open Shift */}
      <FormModal visible={showOpenModal} title="Mở ca làm việc mới" onClose={() => setShowOpenModal(false)} onSave={handleOpenShift} saveLabel="Mở ca">
        <View style={{ gap: 10, paddingTop: 4 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tiền mặt bàn giao ban đầu (VNĐ)</AppText>
          <TextInput value={initialCash} onChangeText={setInitialCash} style={styles.fieldInput} keyboardType="numeric" placeholder="1000000" placeholderTextColor={colors.text.muted} />
          <AppText variant="sm" color={colors.text.primary}>Ghi chú mở ca</AppText>
          <TextInput value={note} onChangeText={setNote} style={styles.fieldInput} placeholder="Tình trạng ca mở..." placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>

      {/* Form Close Shift */}
      <FormModal visible={showCloseModal} title="Chốt ca làm việc" onClose={() => setShowCloseModal(false)} onSave={handleCloseShift} saveLabel="Chốt ca">
        <View style={{ gap: 10, paddingTop: 4 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tổng tiền mặt thực tế trong két (VNĐ)</AppText>
          <TextInput value={actualCash} onChangeText={setActualCash} style={styles.fieldInput} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.text.muted} />
          <AppText variant="sm" color={colors.text.primary}>Ghi chú bàn giao</AppText>
          <TextInput value={note} onChangeText={setNote} style={styles.fieldInput} placeholder="Lý do chênh lệch (nếu có)..." placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>

      {/* Mobile Detail Modal at Root level */}
      {!isWide && (
        <DetailModal
          visible={!!selectedShift}
          title={selectedShift ? `Ca mở: ${fmtDate(selectedShift.started_at)}` : ''}
          subtitle={selectedShift ? `Trạng thái: ${selectedShift.ended_at ? 'Đã kết ca' : 'Đang hoạt động'}` : undefined}
          onClose={() => setSelectedId(null)}
          actions={
            selectedShift && !selectedShift.ended_at
              ? [
                  {
                    label: 'Chốt ca làm việc',
                    icon: 'lock',
                    variant: 'danger',
                    onPress: () => {
                      setSelectedId(null);
                      setShowCloseModal(true);
                    },
                  },
                ]
              : []
          }
        >
          {selectedShift && (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color="#64748B">Thời gian mở ca</AppText>
                <AppText variant="sm" color="#0F172A">{fmtDate(selectedShift.started_at)}</AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color="#64748B">Thời gian đóng ca</AppText>
                <AppText variant="sm" color="#0F172A">{selectedShift.ended_at ? fmtDate(selectedShift.ended_at) : 'Đang hoạt động'}</AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color="#64748B">Tiền mặt bàn giao ban đầu</AppText>
                <AppText variant="sm" color="#0F172A">{formatVND(selectedShift.initial_cash || 0)}</AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color="#64748B">Doanh thu tích lũy trong ca</AppText>
                <AppText variant="md" weight="bold" color={colors.brand.primary}>
                  {formatVND(selectedShift.total_revenue || selectedShift.revenue || 0)}
                </AppText>
              </View>
              {selectedShift.note ? (
                <View style={{ gap: 4, marginTop: 4 }}>
                  <AppText variant="sm" color="#64748B">Ghi chú bàn giao</AppText>
                  <AppText variant="sm" color="#334155">{selectedShift.note}</AppText>
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
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  /* Facebook Story Highlight Metric Cards Container */
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
    maxWidth: 520,
  },
  fbMetricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface.card,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  fbMetricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },

  /* 📱 Mobile Full-Width Facebook Feed Card Block */
  itemMobile: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginTop: 10,
  },
  panelBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },
  panelBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },

  panelBox: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  panelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 999 },
  fieldInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },

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

  mobileTopActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: 6,
  },
  mobileAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
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

export default function ShiftsScreen() {
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
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="clock-outline" size={20} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>Quản lý ca làm việc</AppText>
      </View>

      {active?.id ? (
        <>
          <View style={{ backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="check-circle" size={16} color={colors.status.success} />
              <AppText variant="sm" weight="bold" color={colors.status.success}>CA ĐANG MỞ</AppText>
            </View>
            <AppText variant="sm" color={colors.text.primary}>Mở lúc: {fmtDate(active.started_at)}</AppText>
            <AppText variant="sm" color={colors.text.primary}>Tiền ban đầu: <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(active.initial_cash)}</AppText></AppText>
          </View>
          <TouchableOpacity onPress={() => setShowCloseModal(true)} style={[styles.panelBtn, { backgroundColor: colors.status.danger }]}>
            <Icon name="lock" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Chốt ca làm việc</AppText>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <AppText variant="sm" color={colors.text.muted}>Hiện không có ca làm việc nào đang mở.</AppText>
          <TouchableOpacity onPress={() => setShowOpenModal(true)} style={[styles.panelBtn, { backgroundColor: colors.brand.primary }]}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Mở ca làm việc mới</AppText>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderMobileShiftCard = ({ item: s }: { item: any }) => {
    const isOpen = !s.ended_at;
    return (
      <View style={styles.itemMobile}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.avatarCircle, { backgroundColor: isOpen ? '#ECFDF5' : '#EEF2FF' }]}>
            <Icon name={isOpen ? "clock-fast" : "clock-check"} size={20} color={isOpen ? colors.status.success : colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="md" weight="bold" color="#050505">Ca mở: {fmtDate(s.started_at)}</AppText>
              <View style={[styles.statusBadge, { backgroundColor: isOpen ? '#ECFDF5' : colors.surface.app }]}>
                <AppText variant="sm" weight="bold" color={isOpen ? colors.status.success : colors.text.muted}>
                  {isOpen ? 'Đang mở' : 'Đã kết ca'}
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <AppText variant="sm" color="#65676B">Mở ca: {formatVND(s.initial_cash)}</AppText>
              {s.ended_at ? <AppText variant="sm" color="#65676B">· Chốt: {fmtDate(s.ended_at)}</AppText> : null}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 8 }}>
          <AppText variant="sm" color="#65676B">Tiền thực tế: <AppText variant="sm" weight="bold" color={colors.text.primary}>{formatVND(s.actual_cash || 0)}</AppText></AppText>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>Doanh thu: {formatVND(s.total_revenue || s.revenue || 0)}</AppText>
        </View>

        <View style={styles.cardActionDivider} />

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
          {isOpen ? (
            <TouchableOpacity style={styles.panelBtnDanger} onPress={() => setShowCloseModal(true)}>
              <Icon name="lock" size={14} color={colors.status.danger} />
              <AppText variant="sm" weight="bold" color={colors.status.danger}>Chốt ca làm việc</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => { Alert.alert('Thông tin ca', `Mở: ${fmtDate(s.started_at)}\nĐóng: ${fmtDate(s.ended_at)}\nDoanh thu: ${formatVND(s.total_revenue || s.revenue)}`); }}>
              <Icon name="eye-outline" size={14} color={colors.brand.primary} />
              <AppText variant="sm" color={colors.brand.primary}>Xem chi tiết</AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'started_at' ? 'desc' : 'asc'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{shifts.length} ca làm việc</AppText>
          {active?.id ? (
            <TouchableOpacity onPress={() => setShowCloseModal(true)} style={[styles.addBtn, { backgroundColor: colors.status.danger }]}>
              <Icon name="lock" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Chốt ca</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setShowOpenModal(true)} style={styles.addBtn}>
              <Icon name="plus" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Mở ca</AppText>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="timer-check" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{totalClosed}</AppText>
            <AppText variant="sm" color="#65676B">Ca đã đóng</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="currency-usd" size={18} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(closedRevenue)}</AppText>
            <AppText variant="sm" color="#65676B">Doanh thu ca</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: active?.id ? '#ECFDF5' : colors.surface.app }]}>
            <Icon name={active?.id ? 'check-circle' : 'timer-off'} size={18} color={active?.id ? colors.status.success : colors.text.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={active?.id ? colors.status.success : colors.text.muted}>{active?.id ? 'Đang mở' : 'Tắt'}</AppText>
            <AppText variant="sm" color="#65676B">Trạng thái ca</AppText>
          </View>
        </View>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
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
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={(item) => item.id}
          renderItem={renderMobileShiftCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="timer-off"
                title="Chưa có ca làm việc nào"
                subtitle="Nhấn + Mở ca để bắt đầu"
              />
            )
          }
        />
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
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

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
    paddingVertical: 12,
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
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },
  panelBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
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
  panelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999 },
  fieldInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});

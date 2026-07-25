import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';

function fmtDate(d: string) { try { return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return d; } }

export default function ShiftsScreen() {
  const { isWide } = useResponsive();
  const [shifts, setShifts] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [cashEnd, setCashEnd] = useState('0');
  const [expenseTotal, setExpenseTotal] = useState('0');
  const [endNote, setEndNote] = useState('');
  const [sortKey, setSortKey] = useState<string>('started_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    try { setLoading(true); const [s, a] = await Promise.all([request<any>(API + '/shifts/active'), request<any[]>(API + '/shifts?limit=30')]); setActive(s); setShifts(Array.isArray(a) ? a : []); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const startShift = async () => {
    try { await request(API + '/shifts/start', { method: 'POST', body: JSON.stringify({ opening_balance: parseFloat(openingBalance) || 0 }) }); setShowStart(false); load(); }
    catch { Alert.alert('Lỗi', 'Không thể mở ca làm việc'); }
  };
  const endShift = async () => {
    try { await request(API + '/shifts/end', { method: 'POST', body: JSON.stringify({ cash_end: parseFloat(cashEnd) || 0, expense_total: parseFloat(expenseTotal) || 0, note: endNote }) }); setShowEnd(false); load(); }
    catch { Alert.alert('Lỗi', 'Không thể đóng ca làm việc'); }
  };

  const closedShifts = shifts.filter(s => s.ended_at);
  const closedRevenue = closedShifts.reduce((sum, s) => sum + (s.total_revenue || 0), 0);
  const totalClosed = closedShifts.length;
  const disc = active?.id ? (active.opening_balance || 0) + (active.total_revenue || 0) - (parseFloat(cashEnd || '0') || 0) - (parseFloat(expenseTotal || '0') || 0) : 0;

  const columns: Column<any>[] = [
    {
      key: 'started_at',
      title: 'Thời gian bắt đầu',
      flex: 1,
      sortable: true,
      sortValue: (s) => s.started_at || '',
      render: (s) => {
        const ended = !!s.ended_at;
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name={ended ? 'clock-outline' : 'check-circle'} size={14} color={ended ? colors.text.muted : colors.status.success} />
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{fmtDate(s.started_at)}</AppText>
          </View>
        );
      },
    },
    {
      key: 'total_revenue',
      title: 'Doanh thu ca',
      width: 120,
      align: 'right',
      sortable: true,
      sortValue: (s) => s.total_revenue || 0,
      render: (s) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(s.total_revenue || 0)}</AppText>,
    },
    {
      key: 'diff',
      title: 'Chênh lệch',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (s) => (s.total_revenue || 0) - (s.opening_balance || 0),
      render: (s) => {
        const diff = (s.total_revenue || 0) - (s.opening_balance || 0);
        return <AppText variant="sm" weight="bold" color={diff >= 0 ? colors.status.success : colors.status.danger}>{diff >= 0 ? `+${formatVND(diff)}` : formatVND(diff)}</AppText>;
      },
    },
  ];

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="timer-check-outline" size={18} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>Thông tin ca hiện tại</AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <AppText variant="md" weight="bold" color={colors.text.primary}>{totalClosed}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Ca đã đóng</AppText>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(closedRevenue)}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Tổng doanh thu</AppText>
        </View>
      </View>
      <View style={styles.panelDivider} />
      {active && active.id ? (
        <>
          <View style={[styles.activeBanner, { backgroundColor: colors.brand.primaryBg }]}>
            <Icon name="check-circle" size={16} color={colors.status.success} />
            <AppText variant="sm" weight="bold" color={colors.status.success}>Ca làm việc đang mở</AppText>
          </View>
          <DetailRow label="Tiền đầu ca" value={formatVND(active.opening_balance || 0)} />
          <DetailRow label="Doanh thu ca" value={formatVND(active.total_revenue || 0)} />
          <DetailRow label="Thời gian mở" value={fmtDate(active.started_at)} />
          
          {disc !== 0 && (
            <View style={[styles.activeBanner, { backgroundColor: disc > 0 ? '#FEF3C7' : colors.status.dangerBg }]}>
              <Icon name="alert" size={16} color={disc > 0 ? '#D97706' : colors.status.danger} />
              <AppText variant="sm" weight="bold" color={disc > 0 ? '#D97706' : colors.status.danger}>
                Chênh lệch: {formatVND(Math.abs(disc))} {disc > 0 ? 'dư' : 'thiếu'}
              </AppText>
            </View>
          )}

          <TouchableOpacity style={[styles.panelCta, { backgroundColor: colors.status.danger }]} onPress={() => { setCashEnd('0'); setExpenseTotal('0'); setEndNote(''); setShowEnd(true); }}>
            <Icon name="stop" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Đóng ca làm việc</AppText>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={[styles.activeBanner, { backgroundColor: colors.surface.app }]}>
            <Icon name="timer-off" size={16} color={colors.icon.muted} />
            <AppText variant="sm" color={colors.text.muted}>Chưa có ca nào đang mở</AppText>
          </View>
          <TouchableOpacity style={styles.panelCta} onPress={() => { setOpeningBalance('0'); setShowStart(true); }}>
            <Icon name="play" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Mở ca làm việc mới</AppText>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'started_at' ? 'desc' : 'asc'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="timer-check" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{totalClosed}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đã đóng</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="currency-usd" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(closedRevenue)}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Doanh thu</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name={active?.id ? 'check-circle' : 'timer-off'} size={16} color={active?.id ? colors.status.success : colors.icon.muted} />
          <View>
            <AppText variant="sm" weight="bold" color={active?.id ? colors.status.success : colors.text.muted}>{active?.id ? 'Đang mở' : 'Chưa mở'}</AppText>
            <AppText variant="sm" color={colors.text.muted}>{active?.id ? fmtDate(active.started_at) : '-'}</AppText>
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
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          {active && active.id && (
            <View style={styles.mobileActiveBanner}>
              <Icon name="check-circle" size={16} color={colors.status.success} />
              <AppText variant="sm" weight="bold" color={colors.status.success} style={{ flex: 1 }}>
                Ca mở · Doanh thu: {formatVND(active.total_revenue || 0)}
              </AppText>
              <TouchableOpacity onPress={() => { setCashEnd('0'); setExpenseTotal('0'); setEndNote(''); setShowEnd(true); }} style={styles.mobileCloseBtn}>
                <AppText variant="sm" weight="bold" color={colors.text.inverse}>Đóng ca</AppText>
              </TouchableOpacity>
            </View>
          )}
          {!active?.id && (
            <TouchableOpacity style={styles.mobileStartBtn} onPress={() => { setOpeningBalance('0'); setShowStart(true); }}>
              <Icon name="play" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Mở ca mới ngay</AppText>
            </TouchableOpacity>
          )}
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
      )}

      <FormModal visible={showStart} title="Mở ca làm việc mới" onClose={() => setShowStart(false)} onSave={startShift} saveLabel="Mở ca ngay">
        <View style={{ gap: 10, paddingTop: 4 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tiền mặt bàn giao đầu ca (VNĐ)</AppText>
          <TextInput value={openingBalance} onChangeText={setOpeningBalance} keyboardType="decimal-pad" style={styles.fieldInput} placeholder="0" placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>

      <FormModal visible={showEnd} title="Đóng ca làm việc" onClose={() => setShowEnd(false)} onSave={endShift} saveLabel="Xác nhận đóng ca">
        <View style={{ gap: 10, paddingTop: 4 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tiền mặt thực tế trong két (VNĐ)</AppText>
          <TextInput value={cashEnd} onChangeText={setCashEnd} keyboardType="decimal-pad" style={styles.fieldInput} placeholder="0" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tổng tiền chi ra trong ca</AppText>
          <TextInput value={expenseTotal} onChangeText={setExpenseTotal} keyboardType="decimal-pad" style={styles.fieldInput} placeholder="0" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Ghi chú đóng ca</AppText>
          <TextInput value={endNote} onChangeText={setEndNote} style={[styles.fieldInput, { minHeight: 60 }]} multiline placeholder="Ghi chú chênh lệch hoặc bàn giao..." placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText variant="sm" color={colors.text.muted}>{label}</AppText>
      <AppText variant="sm" weight="bold" color={colors.text.primary}>{value}</AppText>
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
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: shape.radius.md, height: 42, backgroundColor: colors.brand.primary },
  activeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: shape.radius.md },
  mobileActiveBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.brand.primaryBg, borderRadius: shape.radius.md, marginBottom: 8 },
  mobileCloseBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: shape.radius.sm, backgroundColor: colors.status.danger },
  mobileStartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, marginBottom: 8 },
  fieldInput: { borderRadius: shape.radius.md, paddingHorizontal: 10, paddingVertical: 8, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});

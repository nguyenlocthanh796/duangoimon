import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';

const API = '/api/v1/quan-ly';

function fmtDate(d: string) { try { return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return d; } }

export default function ShiftsScreen() {
  const { openSidebar } = useSidebar();
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
    catch { Alert.alert('Lỗi', 'Không thể mở ca'); }
  };
  const endShift = async () => {
    try { await request(API + '/shifts/end', { method: 'POST', body: JSON.stringify({ cash_end: parseFloat(cashEnd) || 0, expense_total: parseFloat(expenseTotal) || 0, note: endNote }) }); setShowEnd(false); load(); }
    catch { Alert.alert('Lỗi', 'Không thể đóng ca'); }
  };

  const closedShifts = shifts.filter(s => s.ended_at);
  const closedRevenue = closedShifts.reduce((sum, s) => sum + (s.total_revenue || 0), 0);
  const totalClosed = closedShifts.length;
  const disc = active?.id ? (active.opening_balance || 0) + (active.total_revenue || 0) - (parseFloat(cashEnd || '0') || 0) - (parseFloat(expenseTotal || '0') || 0) : 0;

  const columns: Column<any>[] = [
    {
      key: 'started_at',
      title: 'Thời gian',
      flex: 1,
      sortable: true,
      sortValue: (s) => s.started_at || '',
      render: (s) => {
        const ended = !!s.ended_at;
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name={ended ? 'clock-outline' : 'check-circle'} size={14} color={ended ? '#737373' : '#16A34A'} />
            <Text style={styles.cellPrimary}>{fmtDate(s.started_at)}</Text>
          </View>
        );
      },
    },
    {
      key: 'total_revenue',
      title: 'Doanh thu',
      width: 100,
      align: 'right',
      sortable: true,
      sortValue: (s) => s.total_revenue || 0,
      render: (s) => <Text style={styles.cellAmount}>{formatVND(s.total_revenue || 0)}</Text>,
    },
    {
      key: 'diff',
      title: 'Chênh lệch',
      width: 90,
      align: 'right',
      sortable: true,
      sortValue: (s) => (s.total_revenue || 0) - (s.opening_balance || 0),
      render: (s) => {
        const diff = (s.total_revenue || 0) - (s.opening_balance || 0);
        return <Text style={[styles.cellDiff, { color: diff >= 0 ? '#16A34A' : '#DC2626' }]}>{diff >= 0 ? `+${formatVND(diff)}` : formatVND(diff)}</Text>;
      },
    },
  ];

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="timer-check-outline" size={18} color={'#F97316'} />
        <Text style={styles.panelHeaderText}>Ca làm việc</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12}}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="timer" size={14} color={'#737373'} /><Text style={styles.statValue}>{totalClosed}</Text>
          </View>
          <Text style={styles.statLabel}>Đã đóng</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="currency-usd" size={14} color={'#737373'} /><Text style={styles.statValue}>{formatVND(closedRevenue)}</Text>
          </View>
          <Text style={styles.statLabel}>Doanh thu</Text>
        </View>
      </View>
      <View style={styles.panelDivider} />
      {active && active.id ? (
        <>
          <View style={[styles.activeBanner, { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }]}>
            <Icon name="check-circle" size={14} color={'#16A34A'} />
            <Text style={[styles.activeBannerText, { color: '#16A34A' }]}>Ca đang mở</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.panelLabel}>Tiền đầu</Text><Text style={styles.panelValue}>{formatVND(active.opening_balance || 0)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.panelLabel}>Doanh thu</Text><Text style={[styles.panelValue, { color: '#16A34A' }]}>{formatVND(active.total_revenue || 0)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.panelLabel}>Mở lúc</Text><Text style={styles.panelValue}>{fmtDate(active.started_at)}</Text>
          </View>
          {disc !== 0 && (
            <View style={[styles.activeBanner, { backgroundColor: disc > 0 ? '#FEF3C7' : '#FEE2E2', borderColor: disc > 0 ? '#D97706' : '#DC2626' }]}>
              <Icon name="alert" size={14} color={disc > 0 ? '#D97706' : '#DC2626'} />
              <Text style={[styles.activeBannerText, { color: disc > 0 ? '#D97706' : '#DC2626' }]}>Chênh lệch: {formatVND(Math.abs(disc))} {disc > 0 ? 'dư' : 'thiếu'}</Text>
            </View>
          )}
          <TouchableOpacity style={[styles.panelCta, { backgroundColor: '#DC2626' }]} onPress={() => { setCashEnd('0'); setExpenseTotal('0'); setEndNote(''); setShowEnd(true); }}>
            <Icon name="stop" size={14} color="#fff" /><Text style={styles.panelCtaText}>Đóng ca</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={[styles.activeBanner, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
            <Icon name="timer-off" size={14} color={'#737373'} />
            <Text style={[styles.activeBannerText, { color: '#737373' }]}>Chưa mở ca</Text>
          </View>
          <TouchableOpacity style={styles.panelCta} onPress={() => { setOpeningBalance('0'); setShowStart(true); }}>
            <Icon name="play" size={14} color="#fff" /><Text style={styles.panelCtaText}>Mở ca mới</Text>
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
    <ScreenContainer compact>
      <ScreenHeader title="Ca làm việc" subtitle={active && active.id ? 'Đang mở' : 'Chưa mở ca'}
        onMenuPress={openSidebar} compact />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="timer-check" size={14} color={'#737373'} /><Text style={styles.statValue}>{totalClosed}</Text>
          </View>
          <Text style={styles.statLabel}>Đã đóng</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="currency-usd" size={14} color={'#737373'} /><Text style={styles.statValue}>{formatVND(closedRevenue)}</Text>
          </View>
          <Text style={styles.statLabel}>Doanh thu</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name={active?.id ? 'check-circle' : 'timer-off'} size={14} color={'#737373'} />
            <Text style={styles.statValue}>{active?.id ? 'Đang mở' : 'Chưa mở'}</Text>
          </View>
          <Text style={styles.statLabel}>{active?.id ? fmtDate(active.started_at) : '-'}</Text>
        </View>
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
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
              emptyTitle="Chưa có ca"
              emptySubtitle="Bắt đầu ca làm việc"
            />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {active && active.id && (
            <View style={styles.mobileActiveBanner}>
              <Icon name="check-circle" size={14} color={'#16A34A'} />
              <Text style={styles.mobileActiveText}>Ca đang mở · Doanh thu: {formatVND(active.total_revenue || 0)}</Text>
              <TouchableOpacity onPress={() => { setCashEnd('0'); setExpenseTotal('0'); setEndNote(''); setShowEnd(true); }} style={styles.mobileCloseBtn}>
                <Text style={styles.mobileCloseBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          )}
          {!active?.id && (
            <TouchableOpacity style={styles.mobileStartBtn} onPress={() => { setOpeningBalance('0'); setShowStart(true); }}>
              <Icon name="play" size={16} color="#fff" /><Text style={styles.mobileStartBtnText}>Mở ca mới</Text>
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
            emptyTitle="Chưa có ca"
            emptySubtitle="Bắt đầu ca làm việc"
          />
        </View>
      )}

      <FormModal visible={showStart} title="Mở ca" onClose={() => setShowStart(false)} onSave={startShift} saveLabel="Mở ca">
        <View style={{ gap: 12, paddingTop: 4 }}>
          <Text style={styles.fieldLabel}>Tiền đầu ca</Text>
          <TextInput value={openingBalance} onChangeText={setOpeningBalance} keyboardType="decimal-pad" style={styles.fieldInput} placeholder="0" />
        </View>
      </FormModal>
      <FormModal visible={showEnd} title="Đóng ca" onClose={() => setShowEnd(false)} onSave={endShift} saveLabel="Đóng ca">
        <View style={{ gap: 12, paddingTop: 4 }}>
          <Text style={styles.fieldLabel}>Tiền cuối ca</Text>
          <TextInput value={cashEnd} onChangeText={setCashEnd} keyboardType="decimal-pad" style={styles.fieldInput} placeholder="0" />
          <Text style={styles.fieldLabel}>Tổng chi</Text>
          <TextInput value={expenseTotal} onChangeText={setExpenseTotal} keyboardType="decimal-pad" style={styles.fieldInput} placeholder="0" />
          <Text style={styles.fieldLabel}>Ghi chú</Text>
          <TextInput value={endNote} onChangeText={setEndNote} style={[styles.fieldInput, { minHeight: 60 }]} multiline placeholder="Ghi chú đóng ca" />
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
  statValue: { ...font.mdBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.sm, color: '#737373', lineHeight: 12 },
  cellPrimary: { ...font.sm, fontWeight: '600', color: '#171717' },
  cellAmount: { ...font.sm, fontWeight: '600', color: '#171717' },
  cellDiff: { ...font.sm, fontWeight: '600' },
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.md, fontWeight: '600', color: '#171717' },
  panelLabel: { ...font.sm, color: '#737373' },
  panelValue: { ...font.sm, fontWeight: '600', color: '#171717' },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, borderRadius: 8, paddingVertical: 12, minHeight: 44, backgroundColor: '#F97316' },
  panelCtaText: { ...font.mdBold, color: '#fff' },
  activeBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  activeBannerText: { ...font.sm, fontWeight: '600' },
  mobileActiveBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#DCFCE7', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  mobileActiveText: { flex: 1, ...font.sm, color: '#16A34A', fontWeight: '600' },
  mobileCloseBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#DC2626' },
  mobileCloseBtnText: { ...font.smBold, color: '#fff', fontWeight: '600' },
  mobileStartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: '#F97316', marginHorizontal: 4, borderRadius: 8, marginTop: 4 },
  mobileStartBtnText: { ...font.smBold, color: '#fff', fontWeight: '600' },
  fieldLabel: { ...font.smBold, color: '#404040', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 8, padding: 12, ...font.md, color: '#171717', backgroundColor: '#FAFAFA' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },
});

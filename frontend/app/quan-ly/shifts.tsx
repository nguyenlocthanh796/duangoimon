import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';
function formatVND(v: number) { return (v || 0).toLocaleString('vi-VN') + 'đ'; }
function fmtDate(d: string) { try { return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return d; } }

type SortKey = 'started_at' | 'total_revenue' | 'diff';

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
  const [sortKey, setSortKey] = useState<SortKey>('started_at');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); const [s, a] = await Promise.all([request<any>(API + '/shifts/active'), request<any[]>(API + '/shifts?limit=30')]); setActive(s); setShifts(Array.isArray(a) ? a : []); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

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

  const sorted = useMemo(() => {
    const arr = [...shifts];
    return arr.sort((a, b) => {
      if (sortKey === 'total_revenue') return sortAsc ? (a.total_revenue || 0) - (b.total_revenue || 0) : (b.total_revenue || 0) - (a.total_revenue || 0);
      if (sortKey === 'diff') {
        const da = (a.total_revenue || 0) - (a.opening_balance || 0), db = (b.total_revenue || 0) - (b.opening_balance || 0);
        return sortAsc ? da - db : db - da;
      }
      return sortAsc ? (a.started_at || '').localeCompare(b.started_at || '') : (b.started_at || '').localeCompare(a.started_at || '');
    });
  }, [shifts, sortKey, sortAsc]);

  const StatItem = ({ icon, value, label }: { icon: string; value: string | number; label: string }) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon as any} size={14} color={colors.text.muted} />
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  const SortHeader = ({ label, sort, w }: { label: string; sort: SortKey; w?: number | string }) => (
    <TouchableOpacity onPress={() => toggleSort(sort)} style={{ width: w as any, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={[s.thText, sortKey === sort && { color: colors.brand.primary }]}>{label}</Text>
      {sortKey === sort ? <Icon name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color={colors.brand.primary} /> : null}
    </TouchableOpacity>
  );

  const renderPanel = () => (
    <View style={s.panelBox}>
      <View style={s.panelHeader}>
        <Icon name="timer-check-outline" size={18} color={colors.brand.primary} />
        <Text style={s.panelHeaderText}>Ca làm việc</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatItem icon="timer" value={totalClosed} label="Đã đóng" />
        <View style={s.panelDividerV} />
        <StatItem icon="currency-usd" value={formatVND(closedRevenue)} label="Doanh thu" />
      </View>
      <View style={s.panelDivider} />
      {active && active.id ? (
        <>
          <View style={[s.activeBanner, { backgroundColor: '#DCFCE7', borderColor: '#16A34A' }]}>
            <Icon name="check-circle" size={14} color="#16A34A" />
            <Text style={[s.activeBannerText, { color: '#16A34A' }]}>Ca đang mở</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.panelLabel}>Tiền đầu</Text><Text style={s.panelValue}>{formatVND(active.opening_balance || 0)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.panelLabel}>Doanh thu</Text><Text style={[s.panelValue, { color: colors.status.success }]}>{formatVND(active.total_revenue || 0)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.panelLabel}>Mở lúc</Text><Text style={s.panelValue}>{fmtDate(active.started_at)}</Text>
          </View>
          {disc !== 0 && (
            <View style={[s.activeBanner, { backgroundColor: disc > 0 ? '#FEF3C7' : '#FEE2E2', borderColor: disc > 0 ? '#D97706' : '#DC2626' }]}>
              <Icon name="alert" size={14} color={disc > 0 ? '#D97706' : '#DC2626'} />
              <Text style={[s.activeBannerText, { color: disc > 0 ? '#D97706' : '#DC2626' }]}>Chênh lệch: {formatVND(Math.abs(disc))} {disc > 0 ? 'dư' : 'thiếu'}</Text>
            </View>
          )}
          <TouchableOpacity style={[s.panelCta, { backgroundColor: colors.status.danger }]} onPress={() => { setCashEnd('0'); setExpenseTotal('0'); setEndNote(''); setShowEnd(true); }}>
            <Icon name="stop" size={14} color="#fff" /><Text style={s.panelCtaText}>Đóng ca</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={[s.activeBanner, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }]}>
            <Icon name="timer-off" size={14} color="#94A3B8" />
            <Text style={[s.activeBannerText, { color: '#94A3B8' }]}>Chưa mở ca</Text>
          </View>
          <TouchableOpacity style={s.panelCta} onPress={() => { setOpeningBalance('0'); setShowStart(true); }}>
            <Icon name="play" size={14} color="#fff" /><Text style={s.panelCtaText}>Mở ca mới</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const TableRow = ({ item }: { item: any }) => {
    const ended = !!item.ended_at;
    const diff = (item.total_revenue || 0) - (item.opening_balance || 0);
    return (
      <View style={s.tr}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={ended ? 'clock-outline' : 'check-circle'} size={14} color={ended ? colors.text.muted : colors.status.success} />
          <Text style={[s.td, { fontWeight: '600' }]} numberOfLines={1}>{fmtDate(item.started_at)}</Text>
        </View>
        <Text style={[s.td, { width: 75, textAlign: 'right' }]}>{formatVND(item.total_revenue || 0)}</Text>
        <Text style={[s.td, { width: 65, textAlign: 'right', color: diff >= 0 ? '#16A34A' : '#DC2626', fontWeight: '700' }]}>{diff >= 0 ? `+${formatVND(diff)}` : formatVND(diff)}</Text>
      </View>
    );
  };

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={sorted} keyExtractor={item => item.id} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 100 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="timer-off" title="Chưa có ca" subtitle="Bắt đầu ca làm việc" />}
        ListHeaderComponent={
          <View style={s.thead}>
            <SortHeader label="Thời gian" sort="started_at" w={1} />
            <SortHeader label="Doanh thu" sort="total_revenue" w={75} />
            <SortHeader label="Chênh lệch" sort="diff" w={65} />
          </View>
        }
      />
    );
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Ca làm việc" subtitle={active && active.id ? 'Đang mở' : 'Chưa mở ca'}
        onMenuPress={openSidebar} compact />
      <View style={s.statsBar}>
        <StatItem icon="timer-check" value={totalClosed} label="Đã đóng" />
        <View style={s.barDivider} />
        <StatItem icon="currency-usd" value={formatVND(closedRevenue)} label="Doanh thu" />
        <View style={s.barDivider} />
        <StatItem icon={active?.id ? 'check-circle' : 'timer-off'} value={active?.id ? 'Đang mở' : 'Chưa mở'} label={active?.id ? fmtDate(active.started_at) : '-'} />
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {active && active.id && (
            <View style={s.mobileActiveBanner}>
              <Icon name="check-circle" size={14} color="#16A34A" />
              <Text style={s.mobileActiveText}>Ca đang mở · Doanh thu: {formatVND(active.total_revenue || 0)}</Text>
              <TouchableOpacity onPress={() => { setCashEnd('0'); setExpenseTotal('0'); setEndNote(''); setShowEnd(true); }} style={s.mobileCloseBtn}>
                <Text style={s.mobileCloseBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          )}
          {!active?.id && (
            <TouchableOpacity style={s.mobileStartBtn} onPress={() => { setOpeningBalance('0'); setShowStart(true); }}>
              <Icon name="play" size={16} color="#fff" /><Text style={s.mobileStartBtnText}>Mở ca mới</Text>
            </TouchableOpacity>
          )}
          {renderList()}
        </View>
      )}

      <FormModal visible={showStart} title="Mở ca" onClose={() => setShowStart(false)} onSave={startShift} saveLabel="Mở ca">
        <View style={{ gap: 10, paddingTop: 4 }}>
          <Text style={s.fieldLabel}>Tiền đầu ca</Text>
          <TextInput value={openingBalance} onChangeText={setOpeningBalance} keyboardType="decimal-pad" style={s.fieldInput} placeholder="0" />
        </View>
      </FormModal>
      <FormModal visible={showEnd} title="Đóng ca" onClose={() => setShowEnd(false)} onSave={endShift} saveLabel="Đóng ca">
        <View style={{ gap: 10, paddingTop: 4 }}>
          <Text style={s.fieldLabel}>Tiền cuối ca</Text>
          <TextInput value={cashEnd} onChangeText={setCashEnd} keyboardType="decimal-pad" style={s.fieldInput} placeholder="0" />
          <Text style={s.fieldLabel}>Tổng chi</Text>
          <TextInput value={expenseTotal} onChangeText={setExpenseTotal} keyboardType="decimal-pad" style={s.fieldInput} placeholder="0" />
          <Text style={s.fieldLabel}>Ghi chú</Text>
          <TextInput value={endNote} onChangeText={setEndNote} style={[s.fieldInput, { minHeight: 60 }]} multiline placeholder="Ghi chú đóng ca" />
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '900', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },

  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: colors.border.default, marginBottom: 4 },
  thText: { ...font.caption, fontWeight: '700', color: colors.text.muted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  td: { ...font.bodySmall, color: colors.text.primary },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelLabel: { ...font.caption, color: colors.text.muted },
  panelValue: { ...font.bodySmall, fontWeight: '700', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: shape.radius.md, paddingVertical: 12, minHeight: 44, backgroundColor: colors.brand.primary },
  panelCtaText: { ...font.button, color: '#fff' },
  activeBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: shape.radius.md, borderWidth: 1 },
  activeBannerText: { ...font.caption, fontWeight: '600' },

  mobileActiveBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#DCFCE7', marginHorizontal: 12, marginTop: 8, borderRadius: shape.radius.md },
  mobileActiveText: { flex: 1, ...font.caption, color: '#16A34A', fontWeight: '600' },
  mobileCloseBtn: { backgroundColor: colors.status.danger, paddingHorizontal: 12, paddingVertical: 6, borderRadius: shape.radius.full },
  mobileCloseBtnText: { ...font.micro, fontWeight: '700', color: '#fff' },
  mobileStartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingVertical: 12, marginHorizontal: 12, marginTop: 8 },
  mobileStartBtnText: { ...font.button, fontWeight: '700', color: '#fff' },

  fieldLabel: { ...font.label, color: colors.text.secondary, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border.default, borderRadius: shape.radius.md, padding: 12, ...font.body, color: colors.text.primary, backgroundColor: colors.surface.app },

  separator: { width: 1, backgroundColor: colors.border.light },
});

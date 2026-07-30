import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND, ss } from '../../lib/theme';
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
  try { const d = new Date(s); return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`; }
  catch { return s; }
}

export default function ShiftsScreen(_props?: { isSearchOpen?: boolean }) {
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
  const selectedShift = useMemo(() => shifts.find(s => s.id === selectedId), [shifts, selectedId]);

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
    try { await request(`${API}/shifts/open`, { method: 'POST', body: JSON.stringify({ initial_cash: parseFloat(initialCash) || 0, note }) }); setShowOpenModal(false); load(); }
    catch { Alert.alert('Lỗi', 'Không thể mở ca'); }
  };

  const handleCloseShift = async () => {
    if (!active?.id) return;
    try { await request(`${API}/shifts/${active.id}/close`, { method: 'POST', body: JSON.stringify({ actual_cash: parseFloat(actualCash) || 0, note }) }); setShowCloseModal(false); load(); }
    catch { Alert.alert('Lỗi', 'Không thể chốt ca'); }
  };

  const columns: Column<any>[] = [
    { key: 'started_at', title: 'Thời gian ca', flex: 1,
      render: (s) => (<View><AppText variant="md" color={colors.text.primary}>{fmtDate(s.started_at)}</AppText><AppText variant="md" color={colors.text.muted}>Đóng: {s.ended_at ? fmtDate(s.ended_at) : 'Đang mở'}</AppText></View>) },
    { key: 'initial_cash', title: 'Tiền mở', width: 100, align: 'right' as const,
      render: (s) => <AppText variant="md" color={colors.text.secondary}>{formatVND(s.initial_cash)}</AppText> },
    { key: 'revenue', title: 'Doanh thu', width: 110, align: 'right' as const,
      render: (s) => <AppText variant="md" color={colors.brand.primary}>{formatVND(s.total_revenue || s.revenue)}</AppText> },
  ];

  const totalClosed = shifts.filter(s => s.ended_at).length;
  const closedRevenue = shifts.reduce((acc, s) => acc + (s.total_revenue || s.revenue || 0), 0);

  const renderPanel = () => (
    <View style={ss.sectionWrap}>
      <View style={ss.sectionHeader}><AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>QUẢN LÝ CA</AppText></View>
      <View style={{ padding: 10, gap: 10 }}>
        {active?.id ? (
          <>
            <View style={{ backgroundColor: '#ECFDF5', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#A7F3D0', gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.status.success }} /><AppText variant="md" color={colors.status.success}>CA ĐANG MỞ</AppText></View>
              <AppText variant="md" color="#64748B">Mở: {fmtDate(active.started_at)}</AppText>
              <AppText variant="md" color="#64748B">Tiền: <AppText variant="md" color={colors.brand.primary}>{formatVND(active.initial_cash)}</AppText></AppText>
            </View>
            <TouchableOpacity onPress={() => setShowCloseModal(true)} style={[s.panelBtn, { backgroundColor: colors.status.danger }]}><Icon name="lock" size={16} color={colors.text.inverse} /><AppText variant="md" color={colors.text.inverse}>Chốt ca</AppText></TouchableOpacity>
          </>
        ) : (
          <>
            <AppText variant="md" color="#64748B">Không có ca nào đang mở.</AppText>
            <TouchableOpacity onPress={() => setShowOpenModal(true)} style={[s.panelBtn, { backgroundColor: colors.brand.primary }]}><Icon name="plus" size={16} color={colors.text.inverse} /><AppText variant="md" color={colors.text.inverse}>Mở ca mới</AppText></TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  const renderMobileShiftCard = (s: any) => {
    const isOpen = !s.ended_at;
    const statusColor = isOpen ? colors.status.success : colors.text.muted;
    return (
      <View style={ss.listRow} key={s.id}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isOpen ? '#ECFDF5' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <AppText variant="md" color={statusColor}>{isOpen ? '●' : '✓'}</AppText>
        </View>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedId(s.id)}>
          <AppText variant="md" color="#0F172A">Ca mở: {fmtDate(s.started_at)}</AppText>
          <AppText variant="md" color="#64748B">Tiền: {formatVND(s.initial_cash || 0)} · {isOpen ? 'Đang mở' : 'Đã kết ca'}</AppText>
        </TouchableOpacity>
        <View style={{ alignItems: 'flex-end', marginHorizontal: 10 }}>
          <AppText variant="md" color={colors.brand.primary}>{formatVND(s.total_revenue || s.revenue || 0)}</AppText>
        </View>
        <TouchableOpacity onPress={() => setSelectedId(s.id)} style={ss.miniActionBtn}><Icon name={isOpen ? 'lock' : 'eye-outline'} size={16} color={isOpen ? colors.status.danger : colors.brand.primary} /></TouchableOpacity>
      </View>
    );
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'started_at' ? 'desc' : 'asc'); }
  };

  const renderHeader = () => (
    <View style={ss.metricContainer}>
      <View style={ss.metricCard}><View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}><Icon name="clock-outline" size={14} color={colors.brand.primary} /></View><View><AppText variant="md" color="#0F172A">{totalClosed}</AppText><AppText variant="md" color="#64748B">Ca đã đóng</AppText></View></View>
      <View style={ss.metricCard}><View style={[ss.iconCircleSm, { backgroundColor: '#ECFDF5' }]}><Icon name="cash-register" size={14} color={colors.status.success} /></View><View><AppText variant="md" color={colors.status.success}>{formatVND(closedRevenue)}</AppText><AppText variant="md" color="#64748B">Doanh thu</AppText></View></View>
      <View style={ss.metricCard}><View style={[ss.iconCircleSm, { backgroundColor: active?.id ? '#ECFDF5' : '#F1F5F9' }]}><Icon name={active?.id ? 'play-circle' : 'stop-circle-outline'} size={14} color={active?.id ? colors.status.success : colors.text.muted} /></View><View><AppText variant="md" color={active?.id ? colors.status.success : colors.text.muted}>{active?.id ? 'Mở' : 'Đóng'}</AppText><AppText variant="md" color="#64748B">Trạng thái</AppText></View></View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {isWide ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
            <View style={{ flex: 0.55 }}>
              <DataTable<any> columns={columns} data={shifts} getRowId={(s: any) => s.id} loading={loading}
                sortKey={sortKey} sortDir={sortDir} onSortChange={handleSortChange} onRefresh={load} compact
                emptyIcon="timer-off" emptyTitle="Chưa có ca" emptySubtitle="" />
            </View>
            <View style={{ flex: 0.45 }}>{renderPanel()}</View>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          {renderHeader()}
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}><AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>LỊCH SỬ CA ({shifts.length})</AppText></View>
            <View style={{ paddingHorizontal: 10, paddingVertical: shifts.length ? 4 : 16 }}>
              {loading ? <TableSkeleton rowCount={5} /> : shifts.length === 0 ? <EmptyState icon="timer-off" title="Chưa có ca" subtitle="Mở ca để tạo mới" /> : shifts.map(renderMobileShiftCard)}
            </View>
          </View>
          {renderPanel()}
        </ScrollView>
      )}

      <FormModal visible={showOpenModal} title="Mở ca mới" onClose={() => setShowOpenModal(false)} onSave={handleOpenShift} saveLabel="Mở ca">
        <View style={{ gap: 10 }}>
          <AppText variant="md" color={colors.text.primary}>Tiền mặt bàn giao (VNĐ)</AppText>
          <TextInput value={initialCash} onChangeText={setInitialCash} style={s.inp} keyboardType="numeric" placeholder="1000000" placeholderTextColor={colors.text.muted} />
          <AppText variant="md" color={colors.text.primary}>Ghi chú</AppText>
          <TextInput value={note} onChangeText={setNote} style={s.inp} placeholder="Tình trạng..." placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>

      <FormModal visible={showCloseModal} title="Chốt ca" onClose={() => setShowCloseModal(false)} onSave={handleCloseShift} saveLabel="Chốt">
        <View style={{ gap: 10 }}>
          <AppText variant="md" color={colors.text.primary}>Tiền mặt thực tế (VNĐ)</AppText>
          <TextInput value={actualCash} onChangeText={setActualCash} style={s.inp} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.text.muted} />
          <AppText variant="md" color={colors.text.primary}>Ghi chú bàn giao</AppText>
          <TextInput value={note} onChangeText={setNote} style={s.inp} placeholder="Chênh lệch..." placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>

      {!isWide && (
        <DetailModal visible={!!selectedShift} title={selectedShift ? `Ca mở: ${fmtDate(selectedShift.started_at)}` : ''}
          subtitle={selectedShift ? `Trạng thái: ${selectedShift.ended_at ? 'Đã kết ca' : 'Đang mở'}` : undefined}
          onClose={() => setSelectedId(null)}
          actions={selectedShift && !selectedShift.ended_at ? [{ label: 'Chốt ca', icon: 'lock', variant: 'danger', onPress: () => { setSelectedId(null); setShowCloseModal(true); } }] : []}>
          {selectedShift && (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Mở ca</AppText><AppText variant="md" color="#0F172A">{fmtDate(selectedShift.started_at)}</AppText></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Đóng ca</AppText><AppText variant="md" color="#0F172A">{selectedShift.ended_at ? fmtDate(selectedShift.ended_at) : '—'}</AppText></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Tiền mở</AppText><AppText variant="md" color="#0F172A">{formatVND(selectedShift.initial_cash || 0)}</AppText></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AppText variant="md" color="#64748B">Doanh thu</AppText><AppText variant="md" color={colors.brand.primary}>{formatVND(selectedShift.total_revenue || selectedShift.revenue || 0)}</AppText></View>
              {selectedShift.note ? <><AppText variant="md" color="#64748B">Ghi chú</AppText><AppText variant="md" color="#334155">{selectedShift.note}</AppText></> : null}
            </View>
          )}
        </DetailModal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  panelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 999 },
  inp: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});

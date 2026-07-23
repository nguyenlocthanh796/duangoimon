import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Booking } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';

const API = '/api/v1/quan-ly';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Chờ XN', color: '#D97706', bg: '#FEF3C7', icon: 'clock-outline' },
  confirmed: { label: 'Đã XN',  color: '#16A34A', bg: '#DCFCE7', icon: 'check-circle-outline' },
  cancelled: { label: 'Đã Huỷ', color: '#DC2626', bg: '#FEE2E2', icon: 'cancel' },
  arrived:   { label: 'Đã đến', color: '#2563EB', bg: '#EFF6FF', icon: 'door-open' },
};

export default function BookingScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [form, setForm] = useState({ customer_name: '', phone: '', email: '', guest_count: '2', note: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    try { setLoading(true); const params = statusFilter ? `?status=${statusFilter}` : ''; const data: any = await request(`${API}/booking${params}`); setItems(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setSelected(null); setForm({ customer_name: '', phone: '', email: '', guest_count: '2', note: '' }); setShowForm(true); };

  const handleStatusChange = async (id: string, status: string) => {
    try { await request(`${API}/booking/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }); load(); }
    catch { Alert.alert('Lỗi', 'Không thể cập nhật'); }
  };

  const statuses = ['', 'pending', 'confirmed', 'arrived', 'cancelled'];
  const stats = { total: items.length, pending: items.filter(i => i.status === 'pending').length, confirmed: items.filter(i => i.status === 'confirmed').length, arrived: items.filter(i => i.status === 'arrived').length, cancelled: items.filter(i => i.status === 'cancelled').length };

  const columns: Column<Booking>[] = [
    {
      key: 'customer_name',
      title: 'Khách hàng',
      flex: 1,
      sortable: true,
      sortValue: (b) => b.customer_name || '',
      render: (b) => {
        const st = STATUS_MAP[b.status] ?? { label: b.status, color: '#737373', bg: '#F1F5F9', icon: 'help-circle' };
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.avatar, { backgroundColor: st.bg }]}>
              <Icon name="account" size={14} color={st.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cellPrimary} numberOfLines={1}>{b.customer_name}</Text>
              <Text style={styles.cellSub}>{b.phone}</Text>
            </View>
          </View>
        );
      },
    },
    {
      key: 'guest_count',
      title: 'Khách',
      width: 65,
      align: 'center',
      sortable: true,
      sortValue: (b) => b.guest_count || 0,
      render: (b) => <Text style={styles.cellNumber}>{b.guest_count}</Text>,
    },
    {
      key: 'created_at',
      title: 'Ngày',
      width: 100,
      sortable: true,
      sortValue: (b) => b.created_at || '',
      render: (b) => <Text style={styles.cellMuted}>{b.created_at?.slice(0, 10) || '-'}</Text>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: 100,
      align: 'center',
      sortable: true,
      sortValue: (b) => b.status || '',
      render: (b) => {
        const st = STATUS_MAP[b.status] ?? { label: b.status, color: '#737373', bg: '#F1F5F9', icon: 'help-circle' };
        return (
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Icon name={st.icon as any} size={10} color={st.color} />
            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
        );
      },
    },
  ];

  const renderPanel = () => {
    const counts: Record<string, number> = { pending: 0, confirmed: 0, arrived: 0, cancelled: 0 };
    items.forEach(b => { if (counts[b.status] !== undefined) counts[b.status]++; });
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="calendar-check" size={18} color={'#F97316'} />
          <Text style={styles.panelHeaderText}>Đặt bàn</Text>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 8}}>
          <Text style={[styles.panelStatValue, { fontSize: 32 }]}>{items.length}</Text>
          <Text style={styles.panelStatLabel}>Tổng lượt đặt</Text>
        </View>
        <View style={styles.panelDivider} />
        {Object.entries(STATUS_MAP).map(([k, v]) => {
          const c = counts[k] || 0;
          return (
            <TouchableOpacity key={k} style={[styles.panelRow, statusFilter === k && { backgroundColor: v.bg, borderRadius: 8, paddingHorizontal: 8 }]} onPress={() => setStatusFilter(statusFilter === k ? '' : k)}>
              <View style={{ width: 8, height: 8, borderRadius: 12, backgroundColor: v.color }} />
              <Text style={{ flex: 1, ...font.sm, color: '#171717' }}>{v.label}</Text>
              <Text style={{ ...font.sm, fontWeight: '600', color: v.color }}>{c}</Text>
            </TouchableOpacity>
          );
        })}
        {statusFilter ? <TouchableOpacity onPress={() => setStatusFilter('')} style={{ paddingVertical: 6}}><Text style={{ ...font.sm, color: '#F97316' }}>Xoá bộ lọc</Text></TouchableOpacity> : null}
        <View style={styles.panelDivider} />
        {selected ? (
          <View style={{ gap: 12}}>
            <Text style={{ ...font.md, fontWeight: '600', color: '#171717' }}>{selected.customer_name}</Text>
            <Text style={{ ...font.sm, color: '#737373' }}>{selected.phone}</Text>
            <Text style={{ ...font.sm, color: '#737373' }}>{selected.guest_count} khách</Text>
            {selected.note ? <Text style={{ ...font.sm, color: '#404040', fontStyle: 'italic' }}>{selected.note}</Text> : null}
            {selected.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'confirmed')} style={[styles.panelBtn, { backgroundColor: '#16A34A' }]}><Icon name="check" size={14} color="#fff" /><Text style={styles.panelBtnText}>Xác nhận</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'arrived')} style={[styles.panelBtn, { backgroundColor: '#2563EB' }]}><Icon name="door-open" size={14} color="#fff" /><Text style={styles.panelBtnText}>Check-in</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'cancelled')} style={[styles.panelBtn, { backgroundColor: '#DC2626' }]}><Icon name="cancel" size={14} color="#fff" /><Text style={styles.panelBtnText}>Huỷ</Text></TouchableOpacity>
              </View>
            )}
            {selected.status === 'confirmed' && (
              <View style={{ flexDirection: 'row', gap: 8}}>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'arrived')} style={[styles.panelBtn, { backgroundColor: '#2563EB' }]}><Icon name="door-open" size={14} color="#fff" /><Text style={styles.panelBtnText}>Check-in</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'cancelled')} style={[styles.panelBtn, { backgroundColor: '#DC2626' }]}><Icon name="cancel" size={14} color="#fff" /><Text style={styles.panelBtnText}>Huỷ</Text></TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.panelCta} onPress={openNew}><Icon name="plus" size={14} color="#fff" /><Text style={styles.panelCtaText}>Đặt bàn mới</Text></TouchableOpacity>
        )}
      </View>
    );
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'created_at' ? 'desc' : 'asc'); }
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Đặt bàn" subtitle={`${items.length} lượt đặt`}
        showBack onMenuPress={openSidebar} onBackPress={() => router.back()}
        right={isWide ? undefined : <TouchableOpacity onPress={openNew} style={styles.addBtn}><Icon name="plus" size={18} color="#fff" /><Text style={styles.addBtnText}>Thêm</Text></TouchableOpacity>}
      />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="calendar-check" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <Text style={styles.statLabel}>Tổng</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="clock-outline" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.pending}</Text>
          </View>
          <Text style={styles.statLabel}>Chờ</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="check-circle-outline" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.confirmed}</Text>
          </View>
          <Text style={styles.statLabel}>Đã XN</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="door-open" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.arrived}</Text>
          </View>
          <Text style={styles.statLabel}>Đã đến</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="cancel" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.cancelled}</Text>
          </View>
          <Text style={styles.statLabel}>Huỷ</Text>
        </View>
      </View>
      <View style={styles.filterRow}>
        {statuses.map(st => (
          <TouchableOpacity key={st} onPress={() => setStatusFilter(st)}
            style={[styles.chip, statusFilter === st && styles.chipActive]}>
            <Text style={[styles.chipText, statusFilter === st && styles.chipTextActive]}>{st ? (STATUS_MAP[st]?.label || st) : 'Tất cả'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
            <DataTable<Booking>
              columns={columns}
              data={items}
              getRowId={(b) => b.id}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onRowPress={setSelected}
              selectedRowId={selected?.id ?? null}
              onRefresh={load}
              compact
              emptyIcon="calendar-plus"
              emptyTitle="Chưa có đặt bàn"
              emptySubtitle="Nhấn + để thêm lượt đặt mới"
            />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
        <DataTable<Booking>
          columns={columns}
          data={items}
          getRowId={(b) => b.id}
          loading={loading}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          onRowPress={setSelected}
          selectedRowId={selected?.id ?? null}
          onRefresh={load}
          compact
          emptyIcon="calendar-plus"
          emptyTitle="Chưa có đặt bàn"
          emptySubtitle="Nhấn + để thêm lượt đặt mới"
        />
      )}
      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title="Đặt bàn mới" onClose={() => setShowForm(false)} onSave={async () => { if (form.phone) { try { await request(`${API}/booking`, { method: 'POST', body: JSON.stringify(form) }); setShowForm(false); load(); } catch { Alert.alert('Lỗi', 'Không thể tạo'); } } else Alert.alert('Lỗi', 'Nhập SĐT'); }} saveLabel="Đặt">
        <View style={{ gap: 12, paddingTop: 4 }}>
          <Text style={styles.fieldLabel}>Tên khách *</Text>
          <TextInput value={form.customer_name} onChangeText={v => setForm(p => ({ ...p, customer_name: v }))} style={styles.fieldInput} placeholder="Tên khách" />
          <Text style={styles.fieldLabel}>SĐT *</Text>
          <TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} style={styles.fieldInput} keyboardType="phone-pad" placeholder="090..." />
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} style={styles.fieldInput} keyboardType="email-address" placeholder="email@example.com" />
          <View style={{ flexDirection: 'row', gap: 12}}>
            <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Số khách</Text><TextInput value={form.guest_count} onChangeText={v => setForm(p => ({ ...p, guest_count: v }))} keyboardType="number-pad" style={styles.fieldInput} /></View>
          </View>
          <Text style={styles.fieldLabel}>Ghi chú</Text>
          <TextInput value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} style={[styles.fieldInput, { minHeight: 80 }]} multiline placeholder="Ghi chú..." />
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 44, borderRadius: 8, backgroundColor: '#F97316' },
  addBtnText: { ...font.smBold, fontWeight: '600', color: '#fff' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
  statValue: { ...font.mdBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.sm, color: '#737373', lineHeight: 12 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5' },
  chipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  chipText: { ...font.smBold, color: '#737373' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  cellPrimary: { ...font.sm, fontWeight: '600', color: '#171717' },
  cellSub: { ...font.sm, color: '#737373' },
  cellNumber: { ...font.sm, color: '#171717', textAlign: 'center' },
  cellMuted: { ...font.sm, color: '#737373', textAlign: 'center' },
  avatar: { width: 30, height: 30, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999},
  statusText: { ...font.sm, fontWeight: '600' },
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12},
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.md, fontWeight: '600', color: '#171717' },
  panelStatValue: { ...font.lg, fontWeight: '600', color: '#171717' },
  panelStatLabel: { ...font.sm, color: '#737373', marginTop: 2 },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8},
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8},
  panelBtnText: { ...font.smBold, fontWeight: '600', color: '#fff' },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F97316', borderRadius: 8, paddingVertical: 12, minHeight: 44 },
  panelCtaText: { ...font.mdBold, color: '#fff' },
  fieldLabel: { ...font.smBold, color: '#404040', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 8, padding: 12, ...font.md, color: '#171717', backgroundColor: '#FAFAFA' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },
});

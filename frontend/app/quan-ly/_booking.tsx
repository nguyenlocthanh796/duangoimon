import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Booking } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Chờ XN', color: colors.status.warning, bg: '#FEF3C7', icon: 'clock-outline' },
  confirmed: { label: 'Đã XN',  color: colors.status.success, bg: colors.brand.primaryBg, icon: 'check-circle-outline' },
  cancelled: { label: 'Đã Huỷ', color: colors.status.danger, bg: colors.status.dangerBg, icon: 'cancel' },
  arrived:   { label: 'Đã đến', color: '#2563EB', bg: '#EFF6FF', icon: 'door-open' },
};

export default function BookingScreen() {
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
    catch { Alert.alert('Lỗi', 'Không thể cập nhật trạng thái'); }
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
        const st = STATUS_MAP[b.status] ?? { label: b.status, color: colors.text.muted, bg: colors.surface.app, icon: 'help-circle' };
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.avatar, { backgroundColor: st.bg }]}>
              <Icon name="account" size={14} color={st.color} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{b.customer_name}</AppText>
              <AppText variant="sm" color={colors.text.muted}>{b.phone}</AppText>
            </View>
          </View>
        );
      },
    },
    {
      key: 'guest_count',
      title: 'Số khách',
      width: 70,
      align: 'center',
      sortable: true,
      sortValue: (b) => b.guest_count || 0,
      render: (b) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{b.guest_count} khách</AppText>,
    },
    {
      key: 'created_at',
      title: 'Ngày đặt',
      width: 95,
      sortable: true,
      sortValue: (b) => b.created_at || '',
      render: (b) => <AppText variant="sm" color={colors.text.muted}>{b.created_at?.slice(0, 10) || '-'}</AppText>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: 90,
      align: 'center',
      sortable: true,
      sortValue: (b) => b.status || '',
      render: (b) => {
        const st = STATUS_MAP[b.status] ?? { label: b.status, color: colors.text.muted, bg: colors.surface.app, icon: 'help-circle' };
        return (
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Icon name={st.icon as any} size={10} color={st.color} />
            <AppText variant="sm" weight="bold" color={st.color}>{st.label}</AppText>
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
          <Icon name="calendar-check" size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tổng quan lịch đặt bàn</AppText>
        </View>
        <View style={{ alignItems: 'center', paddingVertical: 4 }}>
          <AppText variant="lg" weight="bold" color={colors.brand.primary}>{items.length}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Tổng lượt đặt bàn</AppText>
        </View>
        <View style={styles.panelDivider} />
        {Object.entries(STATUS_MAP).map(([k, v]) => {
          const c = counts[k] || 0;
          return (
            <TouchableOpacity key={k} style={[styles.panelRow, statusFilter === k && { backgroundColor: v.bg, borderRadius: shape.radius.sm, paddingHorizontal: 8 }]} onPress={() => setStatusFilter(statusFilter === k ? '' : k)}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: v.color }} />
              <AppText variant="sm" color={colors.text.primary} style={{ flex: 1 }}>{v.label}</AppText>
              <AppText variant="sm" weight="bold" color={v.color}>{c}</AppText>
            </TouchableOpacity>
          );
        })}
        {statusFilter ? (
          <TouchableOpacity onPress={() => setStatusFilter('')} style={{ paddingVertical: 4 }}>
            <AppText variant="sm" color={colors.brand.primary}>Xoá bộ lọc trạng thái</AppText>
          </TouchableOpacity>
        ) : null}
        <View style={styles.panelDivider} />
        {selected ? (
          <View style={{ gap: 8 }}>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{selected.customer_name}</AppText>
            <AppText variant="sm" color={colors.text.muted}>📞 {selected.phone} · 👤 {selected.guest_count} khách</AppText>
            {selected.note ? <AppText variant="sm" color={colors.text.secondary} style={{ fontStyle: 'italic' }}>Ghi chú: {selected.note}</AppText> : null}
            {selected.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'confirmed')} style={[styles.panelBtn, { backgroundColor: colors.status.success }]}>
                  <Icon name="check" size={14} color={colors.text.inverse} />
                  <AppText variant="sm" weight="bold" color={colors.text.inverse}>Xác nhận</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'arrived')} style={[styles.panelBtn, { backgroundColor: '#2563EB' }]}>
                  <Icon name="door-open" size={14} color={colors.text.inverse} />
                  <AppText variant="sm" weight="bold" color={colors.text.inverse}>Check-in</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'cancelled')} style={[styles.panelBtn, { backgroundColor: colors.status.dangerBg }]}>
                  <Icon name="cancel" size={14} color={colors.status.danger} />
                  <AppText variant="sm" weight="bold" color={colors.status.danger}>Huỷ</AppText>
                </TouchableOpacity>
              </View>
            )}
            {selected.status === 'confirmed' && (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'arrived')} style={[styles.panelBtn, { backgroundColor: '#2563EB' }]}>
                  <Icon name="door-open" size={14} color={colors.text.inverse} />
                  <AppText variant="sm" weight="bold" color={colors.text.inverse}>Check-in đón khách</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleStatusChange(selected.id, 'cancelled')} style={[styles.panelBtn, { backgroundColor: colors.status.dangerBg }]}>
                  <Icon name="cancel" size={14} color={colors.status.danger} />
                  <AppText variant="sm" weight="bold" color={colors.status.danger}>Huỷ</AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.panelCta} onPress={openNew}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Đặt bàn mới</AppText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'created_at' ? 'desc' : 'asc'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="calendar-check" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{stats.total}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tổng</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="clock-outline" size={16} color={colors.status.warning} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.status.warning}>{stats.pending}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Chờ XN</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="check-circle-outline" size={16} color={colors.status.success} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.status.success}>{stats.confirmed}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đã XN</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="door-open" size={16} color="#2563EB" />
          <View>
            <AppText variant="sm" weight="bold" color="#2563EB">{stats.arrived}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đã đến</AppText>
          </View>
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {statuses.map(st => (
          <TouchableOpacity key={st} onPress={() => setStatusFilter(st)}
            style={[styles.chip, statusFilter === st && styles.chipActive]}>
            <AppText variant="sm" color={statusFilter === st ? colors.brand.primary : colors.text.secondary} weight={statusFilter === st ? 'bold' : 'normal'}>
              {st ? (STATUS_MAP[st]?.label || st) : 'Tất cả'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
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
              emptyTitle="Chưa có lượt đặt bàn"
              emptySubtitle="Nhấn + để tạo lượt đặt bàn mới"
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
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
            emptyTitle="Chưa có lượt đặt bàn"
            emptySubtitle="Nhấn + để tạo lượt đặt bàn mới"
          />
        </View>
      )}

      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title="Đặt bàn mới" onClose={() => setShowForm(false)} onSave={async () => {
        if (form.phone) {
          try { await request(`${API}/booking`, { method: 'POST', body: JSON.stringify(form) }); setShowForm(false); load(); }
          catch { Alert.alert('Lỗi', 'Không thể tạo đơn đặt bàn'); }
        } else Alert.alert('Lỗi', 'Vui lòng nhập SĐT khách');
      }} saveLabel="Tạo đơn">
        <View style={{ gap: 10, paddingTop: 4 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên khách hàng *</AppText>
          <TextInput value={form.customer_name} onChangeText={v => setForm(p => ({ ...p, customer_name: v }))} style={styles.fieldInput} placeholder="VD: Anh Minh" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Số điện thoại *</AppText>
          <TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} style={styles.fieldInput} keyboardType="phone-pad" placeholder="090..." placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Email</AppText>
          <TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} style={styles.fieldInput} keyboardType="email-address" placeholder="email@example.com" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Số lượng khách</AppText>
          <TextInput value={form.guest_count} onChangeText={v => setForm(p => ({ ...p, guest_count: v }))} keyboardType="number-pad" style={styles.fieldInput} placeholder="2" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Ghi chú thêm</AppText>
          <TextInput value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} style={[styles.fieldInput, { minHeight: 60 }]} multiline placeholder="VD: Bàn gần cửa sổ, ăn sinh nhật..." placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>
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
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, marginBottom: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand.primaryBg },
  avatar: { width: 28, height: 28, borderRadius: shape.radius.sm, alignItems: 'center', justifyContent: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 8, borderRadius: shape.radius.sm },
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: shape.radius.md },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, height: 44 },
  fieldInput: { borderRadius: shape.radius.md, paddingHorizontal: 10, paddingVertical: 8, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});

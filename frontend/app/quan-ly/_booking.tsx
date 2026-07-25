import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, FlatList } from 'react-native';
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
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  cho_xac_nhan: { label: 'Chờ xác nhận', color: colors.status.warning, bg: '#FEF3C7' },
  da_xac_nhan: { label: 'Đã xác nhận', color: colors.status.success, bg: '#ECFDF5' },
  da_den: { label: 'Đã đến', color: '#2563EB', bg: '#EFF6FF' },
  da_huy: { label: 'Đã hủy', color: colors.status.danger, bg: '#FEE2E2' },
  hoan_thanh: { label: 'Hoàn thành', color: colors.text.muted, bg: colors.surface.app },
};

export default function BookingScreen() {
  const { isWide } = useResponsive();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    booking_time: '',
    party_size: '2',
    table_name: '',
    note: '',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `${API}/bookings?status=${statusFilter}` : `${API}/bookings`;
      const data: any = await request(url);
      const list = Array.isArray(data) ? data : (data?.items || []);
      setItems(list);
      if (list.length > 0 && !selected) setSelected(list[0]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter(i => i.status === 'cho_xac_nhan').length;
    const confirmed = items.filter(i => i.status === 'da_xac_nhan').length;
    const arrived = items.filter(i => i.status === 'da_den').length;
    return { total, pending, confirmed, arrived };
  }, [items]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await request(`${API}/bookings/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
      load();
    } catch { Alert.alert('Lỗi', 'Không thể cập nhật trạng thái đặt bàn'); }
  };

  const openNew = () => {
    const now = new Date();
    now.setHours(now.getHours() + 2);
    const timeStr = now.toISOString().slice(0, 16).replace('T', ' ');
    setForm({ customer_name: '', customer_phone: '', booking_time: timeStr, party_size: '2', table_name: '', note: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.customer_phone || !form.booking_time) {
      Alert.alert('Lỗi', 'Tên, SĐT và thời gian là bắt buộc'); return;
    }
    try {
      setSaving(true);
      await request(`${API}/bookings`, {
        method: 'POST',
        body: JSON.stringify({ ...form, party_size: parseInt(form.party_size) || 2 }),
      });
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể tạo đơn đặt bàn'); } finally { setSaving(false); }
  };

  const columns: Column<Booking>[] = [
    {
      key: 'customer_name',
      title: 'Khách hàng',
      flex: 1,
      render: (b) => (
        <View>
          <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{b.customer_name}</AppText>
          <AppText variant="sm" color={colors.text.muted}>📱 {b.customer_phone} · 👥 {b.party_size} người</AppText>
        </View>
      ),
    },
    {
      key: 'booking_time',
      title: 'Giờ đặt',
      width: 120,
      sortable: true,
      sortValue: (b) => b.booking_time || '',
      render: (b) => <AppText variant="sm" color={colors.text.secondary}>{b.booking_time?.slice(5, 16) || b.booking_time}</AppText>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: 110,
      render: (b) => {
        const st = STATUS_MAP[b.status] || { label: b.status, color: colors.text.muted, bg: colors.surface.app };
        return (
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <AppText variant="sm" weight="bold" color={st.color}>{st.label}</AppText>
          </View>
        );
      },
    },
  ];

  const statuses = ['', 'cho_xac_nhan', 'da_xac_nhan', 'da_den', 'hoan_thanh', 'da_huy'];

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="calendar-clock" size={20} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>Chi tiết đặt bàn</AppText>
      </View>
      {selected ? (
        <View style={{ gap: 10 }}>
          <View>
            <AppText variant="md" weight="bold" color="#050505">{selected.customer_name}</AppText>
            <AppText variant="sm" color={colors.text.muted}>📱 SĐT: {selected.customer_phone}</AppText>
          </View>
          <View style={styles.panelDivider} />
          <View style={{ gap: 4 }}>
            <AppText variant="sm" color={colors.text.secondary}>🕒 Thời gian: <AppText variant="sm" weight="bold" color={colors.text.primary}>{selected.booking_time}</AppText></AppText>
            <AppText variant="sm" color={colors.text.secondary}>👥 Số lượng: <AppText variant="sm" weight="bold" color={colors.text.primary}>{selected.party_size} khách</AppText></AppText>
            {selected.table_name ? <AppText variant="sm" color={colors.text.secondary}>🪑 Bàn: <AppText variant="sm" weight="bold" color={colors.brand.primary}>{selected.table_name}</AppText></AppText> : null}
            {selected.note ? <AppText variant="sm" color={colors.text.secondary}>📝 Ghi chú: {selected.note}</AppText> : null}
          </View>
          <View style={styles.panelDivider} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Cập nhật trạng thái</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {selected.status === 'cho_xac_nhan' && (
              <TouchableOpacity onPress={() => handleUpdateStatus(selected.id, 'da_xac_nhan')} style={[styles.panelBtn, { backgroundColor: '#ECFDF5', flex: 1 }]}>
                <Icon name="check" size={14} color={colors.status.success} />
                <AppText variant="sm" weight="bold" color={colors.status.success}>Xác nhận</AppText>
              </TouchableOpacity>
            )}
            {selected.status === 'da_xac_nhan' && (
              <TouchableOpacity onPress={() => handleUpdateStatus(selected.id, 'da_den')} style={[styles.panelBtn, { backgroundColor: '#EFF6FF', flex: 1 }]}>
                <Icon name="door-open" size={14} color="#2563EB" />
                <AppText variant="sm" weight="bold" color="#2563EB">Đã đến</AppText>
              </TouchableOpacity>
            )}
            {(selected.status === 'da_den' || selected.status === 'da_xac_nhan') && (
              <TouchableOpacity onPress={() => handleUpdateStatus(selected.id, 'hoan_thanh')} style={[styles.panelBtn, { backgroundColor: colors.surface.app, flex: 1 }]}>
                <Icon name="check-all" size={14} color={colors.text.primary} />
                <AppText variant="sm" weight="bold" color={colors.text.primary}>Hoàn thành</AppText>
              </TouchableOpacity>
            )}
            {selected.status !== 'da_huy' && selected.status !== 'hoan_thanh' && (
              <TouchableOpacity onPress={() => handleUpdateStatus(selected.id, 'da_huy')} style={[styles.panelBtn, { backgroundColor: '#FEE2E2', flex: 1 }]}>
                <Icon name="close" size={14} color={colors.status.danger} />
                <AppText variant="sm" weight="bold" color={colors.status.danger}>Hủy đơn</AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.panelCta} onPress={openNew}>
          <Icon name="plus" size={16} color={colors.text.inverse} />
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>Đặt bàn mới</AppText>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMobileBookingCard = ({ item: b }: { item: Booking }) => {
    const st = STATUS_MAP[b.status] || { label: b.status, color: colors.text.muted, bg: colors.surface.app };
    return (
      <View style={styles.itemMobile}>
        <TouchableOpacity style={styles.cardHeaderRow} onPress={() => setSelected(b)} activeOpacity={0.8}>
          <View style={[styles.avatarCircle, { backgroundColor: st.bg }]}>
            <Icon name="calendar-text" size={20} color={st.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{b.customer_name}</AppText>
              <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                <AppText variant="sm" weight="bold" color={st.color}>{st.label}</AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <AppText variant="sm" color="#65676B">📱 {b.customer_phone}</AppText>
              <AppText variant="sm" color="#65676B">· 🕒 {b.booking_time?.slice(5, 16) || b.booking_time}</AppText>
              <AppText variant="sm" color="#65676B">· 👥 {b.party_size} người</AppText>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.cardActionDivider} />

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
          {b.status === 'cho_xac_nhan' ? (
            <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => handleUpdateStatus(b.id, 'da_xac_nhan')}>
              <Icon name="check" size={14} color={colors.status.success} />
              <AppText variant="sm" weight="bold" color={colors.status.success}>Xác nhận đặt bàn</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => setSelected(b)}>
              <Icon name="eye-outline" size={14} color={colors.brand.primary} />
              <AppText variant="sm" weight="bold" color={colors.brand.primary}>Xem chi tiết</AppText>
            </TouchableOpacity>
          )}

          {b.status !== 'da_huy' && (
            <TouchableOpacity style={styles.panelBtnDanger} onPress={() => handleUpdateStatus(b.id, 'da_huy')}>
              <Icon name="close" size={14} color={colors.status.danger} />
              <AppText variant="sm" weight="bold" color={colors.status.danger}>Hủy</AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'created_at' ? 'desc' : 'asc'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{stats.total} lượt đặt bàn</AppText>
          <TouchableOpacity onPress={openNew} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Đặt bàn</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="clock-outline" size={18} color={colors.status.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.warning}>{stats.pending}</AppText>
            <AppText variant="sm" color="#65676B">Chờ xác nhận</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="check-circle-outline" size={18} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{stats.confirmed}</AppText>
            <AppText variant="sm" color="#65676B">Đã xác nhận</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EFF6FF' }]}>
            <Icon name="door-open" size={18} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#2563EB">{stats.arrived}</AppText>
            <AppText variant="sm" color="#65676B">Khách đã đến</AppText>
          </View>
        </View>
      </View>

      {/* Sub-filter chips */}
      <View style={{ marginVertical: 4, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {statuses.map(st => {
            const active = statusFilter === st;
            const label = st ? (STATUS_MAP[st]?.label || st) : 'Tất cả';
            return (
              <TouchableOpacity
                key={st}
                onPress={() => setStatusFilter(st)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                  {label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
              emptyIcon="calendar-blank"
              emptyTitle="Chưa có lượt đặt bàn"
              emptySubtitle="Nhấn + Đặt bàn mới để bắt đầu"
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderMobileBookingCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="calendar-blank"
                title="Chưa có lượt đặt bàn"
                subtitle="Nhấn + Đặt bàn mới để bắt đầu"
              />
            )
          }
        />
      )}

      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title="Đặt bàn mới" onClose={() => setShowForm(false)} onSave={handleSave} saveLabel="Đặt bàn" saving={saving}>
        <View style={{ gap: 10, paddingTop: 4 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên khách hàng *</AppText>
          <TextInput value={form.customer_name} onChangeText={v => setForm(p => ({ ...p, customer_name: v }))} style={styles.fieldInput} placeholder="VD: Anh Minh" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Số điện thoại *</AppText>
          <TextInput value={form.customer_phone} onChangeText={v => setForm(p => ({ ...p, customer_phone: v }))} style={styles.fieldInput} placeholder="090..." keyboardType="phone-pad" placeholderTextColor={colors.text.muted} />
          
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Số lượng khách</AppText>
              <TextInput value={form.party_size} onChangeText={v => setForm(p => ({ ...p, party_size: v }))} style={styles.fieldInput} keyboardType="numeric" placeholder="2" placeholderTextColor={colors.text.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Bàn dự kiến</AppText>
              <TextInput value={form.table_name} onChangeText={v => setForm(p => ({ ...p, table_name: v }))} style={styles.fieldInput} placeholder="VD: Bàn 05" placeholderTextColor={colors.text.muted} />
            </View>
          </View>

          <AppText variant="sm" weight="bold" color={colors.text.primary}>Thời gian đến *</AppText>
          <TextInput value={form.booking_time} onChangeText={v => setForm(p => ({ ...p, booking_time: v }))} style={styles.fieldInput} placeholder="YYYY-MM-DD HH:mm" placeholderTextColor={colors.text.muted} />

          <AppText variant="sm" weight="bold" color={colors.text.primary}>Ghi chú</AppText>
          <TextInput value={form.note} onChangeText={v => setForm(p => ({ ...p, note: v }))} style={styles.fieldInput} placeholder="Yêu cầu đặc biệt..." placeholderTextColor={colors.text.muted} />
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

  /* Filter chips */
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.brand.primaryBg,
    borderWidth: 1,
    borderColor: '#FFEDD5',
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
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
  },
  panelCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brand.primary,
    borderRadius: 999,
    height: 44,
  },
  fieldInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});

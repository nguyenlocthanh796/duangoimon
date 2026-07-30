import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, ss } from '../../lib/theme';
import { request } from '../../lib/api/client';
import FormModal from '../../lib/components/ui/FormModal';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';
import DetailModal from '../../lib/components/ui/DetailModal';
import { useCrud } from '../../lib/hooks/useCrud';

const API = '/api/v1/quan-ly';

export interface BookingItem {
  id: string;
  customer_name: string;
  phone: string;
  booking_time: string;
  guest_count: number;
  table_number?: string;
  status: string;
  note?: string;
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Chờ XN', color: '#D97706', bg: '#FEF3C7' },
  confirmed: { label: 'Đã XN', color: '#2563EB', bg: '#EFF6FF' },
  arrived: { label: 'Đã đến', color: '#16A34A', bg: '#ECFDF5' },
  completed: { label: 'Xong', color: '#64748B', bg: '#F1F5F9' },
  cancelled: { label: 'Hủy', color: '#DC2626', bg: '#FEE2E2' },
};

type FormState = {
  customer_name: string;
  phone: string;
  booking_time: string;
  guest_count: string;
  table_number: string;
  note: string;
  status: string;
};

const getCurrentTimeStr = () => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

export default function BookingScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();

  const {
    data: items,
    loading,
    showForm,
    setShowForm,
    editingId,
    form,
    setForm,
    selectedItem,
    setSelectedId,
    handleSave,
    handleDelete,
    openAdd,
    openEdit,
    loadData,
  } = useCrud<BookingItem, FormState>({
    fetchFn: () => request(`${API}/bookings`) as Promise<BookingItem[]>,
    createFn: (p) => request(`${API}/bookings`, { method: 'POST', body: JSON.stringify(p) }),
    updateFn: (id, p) => request(`${API}/bookings/${id}`, { method: 'PUT', body: JSON.stringify(p) }),
    deleteFn: (id) => request(`${API}/bookings/${id}`, { method: 'DELETE' }),
    formState: {
      customer_name: '',
      phone: '',
      booking_time: getCurrentTimeStr(),
      guest_count: '2',
      table_number: '',
      note: '',
      status: 'pending',
    },
    formFromItem: (b) => ({
      customer_name: b.customer_name,
      phone: b.phone || '',
      booking_time: b.booking_time || getCurrentTimeStr(),
      guest_count: String(b.guest_count || 1),
      table_number: b.table_number || '',
      note: b.note || '',
      status: b.status || 'pending',
    }),
    buildPayload: (f) => ({
      customer_name: f.customer_name,
      phone: f.phone,
      booking_time: f.booking_time || getCurrentTimeStr(),
      guest_count: parseInt(f.guest_count) || 1,
      table_number: f.table_number || undefined,
      note: f.note || undefined,
      status: f.status,
    }),
    nameLabel: 'đặt bàn',
  });

  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (b) =>
        (b.customer_name || '').toLowerCase().includes(q) ||
        (b.phone || '').includes(q)
    );
  }, [items, search]);

  const stats = {
    total: filtered.length,
    pending: filtered.filter((b) => b.status === 'pending').length,
    arrived: filtered.filter((b) => b.status === 'arrived').length,
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await request(`${API}/bookings/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData({ quiet: true });
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const renderMobileCard = (b: BookingItem, idx: number) => {
    const st = STATUS_STYLE[b.status] || { label: b.status, color: '#64748B', bg: '#F1F5F9' };
    const isLast = idx === filtered.length - 1;

    return (
      <View style={[ss.listRow, isLast && { borderBottomWidth: 0 }]} key={b.id}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: st.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            name={
              b.status === 'arrived'
                ? 'table-furniture'
                : b.status === 'completed'
                ? 'check'
                : 'calendar-clock'
            }
            size={18}
            color={st.color}
          />
        </View>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelectedId(b.id)}>
          <AppText variant="md" color="#0F172A">
            {b.customer_name}
            {b.table_number ? ` · Bàn ${b.table_number}` : ''}
          </AppText>
          <AppText variant="md" color="#64748B">
            {b.guest_count} khách · {b.booking_time || 'Giờ hẹn --:--'}
          </AppText>
        </TouchableOpacity>
        <View
          style={{
            backgroundColor: st.bg,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
          }}
        >
          <AppText variant="md" color={st.color}>
            {st.label}
          </AppText>
        </View>
        <TouchableOpacity style={ss.miniActionBtn} onPress={() => setSelectedId(b.id)}>
          <Icon name="eye-outline" size={16} color={colors.brand.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const content = () => {
    if (loading)
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <TableSkeleton rowCount={5} />
        </View>
      );
    if (!items.length)
      return (
        <EmptyState
          icon="calendar-text"
          title="Chưa có đặt bàn"
          subtitle="Thêm đặt bàn mới"
        />
      );

    return (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
        <View style={ss.sectionWrap}>
          <View style={ss.sectionHeader}>
            <AppText variant="md" weight="bold" color="#1E293B">
              Danh Sách Đặt Bàn ({filtered.length})
            </AppText>
          </View>
          {filtered.map(renderMobileCard)}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, position: 'relative' }}>
      <View style={ss.topActionBar}>
        <View style={ss.searchInputWrap}>
          <Icon name="magnify" size={20} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tên KH, SĐT..."
            placeholderTextColor="#94A3B8"
            style={ss.searchTextInput}
          />
        </View>
        <TouchableOpacity style={ss.addBtn} onPress={openAdd}>
          <Icon name="plus" size={18} color="#FFF" />
          <AppText variant="md" color="#FFF">
            Đặt bàn
          </AppText>
        </TouchableOpacity>
      </View>

      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.iconCircleSm, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="calendar-clock" size={14} color="#D97706" />
            </View>
            <View>
              <AppText variant="md" color="#0F172A">
                {stats.pending}
              </AppText>
              <AppText variant="md" color="#64748B">
                Chờ XN
              </AppText>
            </View>
          </View>
          <View style={ss.metricCard}>
            <View style={[ss.iconCircleSm, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="table-furniture" size={14} color="#16A34A" />
            </View>
            <View>
              <AppText variant="md" color="#16A34A">
                {stats.arrived}
              </AppText>
              <AppText variant="md" color="#64748B">
                Đã đến
              </AppText>
            </View>
          </View>
          <View style={ss.metricCard}>
            <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
              <Icon name="calendar-text" size={14} color="#2563EB" />
            </View>
            <View>
              <AppText variant="md" color="#2563EB">
                {stats.total}
              </AppText>
              <AppText variant="md" color="#64748B">
                Tổng
              </AppText>
            </View>
          </View>
        </View>
      )}

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>{content()}</View>
          <View style={{ flex: 0.45 }}>
            {selectedItem ? (
              <View style={s.panel}>
                <View style={s.panelHdr}>
                  <AppText variant="md" weight="bold" color="#050505">
                    {selectedItem.customer_name}
                  </AppText>
                </View>
                <View style={{ gap: 8 }}>
                  <Row label="SĐT" value={selectedItem.phone} />
                  <Row label="Giờ hẹn" value={selectedItem.booking_time} />
                  <Row label="Số khách" value={String(selectedItem.guest_count)} />
                  <Row label="Bàn" value={selectedItem.table_number || '—'} />
                  <Row label="Ghi chú" value={selectedItem.note || '—'} />
                  
                  {/* Status quick switcher */}
                  <AppText variant="md" color="#64748B" style={{ marginTop: 8 }}>
                    Cập nhật trạng thái:
                  </AppText>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(STATUS_STYLE).map(([stKey, stVal]) => (
                      <TouchableOpacity
                        key={stKey}
                        onPress={() => handleUpdateStatus(selectedItem.id, stKey)}
                        style={{
                          backgroundColor: selectedItem.status === stKey ? stVal.color : stVal.bg,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                        }}
                      >
                        <AppText
                          variant="md"
                          color={selectedItem.status === stKey ? '#FFFFFF' : stVal.color}
                        >
                          {stVal.label}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 6,
                        backgroundColor: colors.brand.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => openEdit(selectedItem)}
                    >
                      <AppText variant="md" color="#FFF">
                        Sửa
                      </AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 6,
                        backgroundColor: colors.status.danger,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => handleDelete(selectedItem.id, selectedItem.customer_name)}
                    >
                      <AppText variant="md" color="#FFF">
                        Xóa
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={s.panel}>
                <AppText variant="md" color="#64748B">
                  Chọn đặt bàn để xem chi tiết
                </AppText>
              </View>
            )}
          </View>
        </View>
      ) : (
        content()
      )}

      <FormModal
        visible={showForm}
        title={editingId ? 'Sửa đặt bàn' : 'Đặt bàn mới'}
        onClose={() => setShowForm(false)}
        onSave={() => handleSave(() => (!form.customer_name ? 'Tên KH bắt buộc' : null))}
      >
        <View style={{ gap: 12 }}>
          <TextInput
            style={s.inp}
            placeholder="Tên KH (*)"
            value={form.customer_name}
            onChangeText={(v: string) => setForm((f: any) => ({ ...f, customer_name: v }))}
          />
          <TextInput
            style={s.inp}
            placeholder="SĐT"
            value={form.phone}
            onChangeText={(v: string) => setForm((f: any) => ({ ...f, phone: v }))}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              style={[s.inp, { flex: 1 }]}
              placeholder="Giờ hẹn (VD: 18:30)"
              value={form.booking_time}
              onChangeText={(v: string) => setForm((f: any) => ({ ...f, booking_time: v }))}
            />
            <TextInput
              style={[s.inp, { flex: 1 }]}
              placeholder="Số khách"
              keyboardType="numeric"
              value={form.guest_count}
              onChangeText={(v: string) => setForm((f: any) => ({ ...f, guest_count: v }))}
            />
          </View>
          <TextInput
            style={s.inp}
            placeholder="Số bàn (nếu có)"
            value={form.table_number}
            onChangeText={(v: string) => setForm((f: any) => ({ ...f, table_number: v }))}
          />
          <TextInput
            style={[s.inp, { height: 64 }]}
            placeholder="Ghi chú"
            multiline
            value={form.note}
            onChangeText={(v: string) => setForm((f: any) => ({ ...f, note: v }))}
          />
        </View>
      </FormModal>

      {!isWide && (
        <DetailModal
          visible={!!selectedItem}
          title={selectedItem?.customer_name || 'Chi tiết đặt bàn'}
          subtitle={selectedItem ? `SĐT: ${selectedItem.phone || '—'} · Bàn: ${selectedItem.table_number || '—'}` : undefined}
          onClose={() => setSelectedId(null)}
          onEdit={
            selectedItem
              ? () => {
                  openEdit(selectedItem);
                  setSelectedId(null);
                }
              : undefined
          }
          onDelete={
            selectedItem
              ? () => handleDelete(selectedItem.id, selectedItem.customer_name)
              : undefined
          }
        >
          {selectedItem && (
            <View style={{ gap: 12 }}>
              <Row label="SĐT" value={selectedItem.phone || '—'} />
              <Row label="Giờ hẹn" value={selectedItem.booking_time || '—'} />
              <Row label="Số khách" value={String(selectedItem.guest_count)} />
              <Row label="Số bàn" value={selectedItem.table_number || '—'} />
              <Row label="Ghi chú" value={selectedItem.note || '—'} />

              {/* Status quick switcher in Mobile DetailModal */}
              <AppText variant="md" color="#64748B" style={{ marginTop: 6 }}>
                Đổi trạng thái:
              </AppText>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(STATUS_STYLE).map(([stKey, stVal]) => (
                  <TouchableOpacity
                    key={stKey}
                    onPress={() => {
                      handleUpdateStatus(selectedItem.id, stKey);
                      setSelectedId(null);
                    }}
                    style={{
                      backgroundColor: selectedItem.status === stKey ? stVal.color : stVal.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 6,
                    }}
                  >
                    <AppText
                      variant="md"
                      color={selectedItem.status === stKey ? '#FFFFFF' : stVal.color}
                    >
                      {stVal.label}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </DetailModal>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <AppText variant="md" color="#64748B">
        {label}
      </AppText>
      <AppText variant="md" color="#0F172A">
        {value}
      </AppText>
    </View>
  );
}

const s = StyleSheet.create({
  inp: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text.primary,
  },
  panel: {
    backgroundColor: colors.surface.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    padding: 16,
    gap: 12,
  },
  panelHdr: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
});

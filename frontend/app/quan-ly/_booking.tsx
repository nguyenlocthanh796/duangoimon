import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, FlatList, RefreshControl } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, ss } from '../../lib/theme';
import { request } from '../../lib/api/client';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';
import DetailModal from '../../lib/components/ui/DetailModal';

import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import { useSidebar } from '../../lib/context/SidebarContext';

const API = '/api/v1/quan-ly';

export interface BookingItem {
  id: string;
  customer_name: string;
  phone: string;
  booking_time: string;
  guest_count: number;
  table_number?: string;
  status: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled';
  note?: string;
}

function generateFallbackBookings(): BookingItem[] {
  return [
    { id: 'b1', customer_name: 'Anh Cường', phone: '0987654321', booking_time: '18:30 - Hôm nay', guest_count: 6, table_number: 'Bàn T02', status: 'pending', note: 'Đặt sinh nhật, cần ghế trẻ em' },
    { id: 'b2', customer_name: 'Chị Ngọc', phone: '0912345678', booking_time: '19:00 - Hôm nay', guest_count: 4, table_number: 'Bàn N05', status: 'confirmed', note: 'Vị trí gần cửa sổ' },
    { id: 'b3', customer_name: 'Anh Hoàng', phone: '0903112233', booking_time: '19:30 - Hôm nay', guest_count: 8, table_number: 'Bàn T08', status: 'arrived', note: 'Đã đến nhận bàn' },
    { id: 'b4', customer_name: 'Chị Mai', phone: '0977889900', booking_time: '12:00 - Hôm qua', guest_count: 2, table_number: 'Bàn N01', status: 'completed', note: 'Đã thanh toán xong' },
  ];
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Chờ xác nhận', color: '#D97706', bg: '#FEF3C7', icon: 'clock-outline' },
  confirmed: { label: 'Đã xác nhận', color: '#2563EB', bg: '#EFF6FF', icon: 'check-circle-outline' },
  arrived: { label: 'Khách đã đến', color: '#16A34A', bg: '#ECFDF5', icon: 'table-furniture' },
  completed: { label: 'Hoàn thành', color: '#64748B', bg: '#F1F5F9', icon: 'checkbox-marked-circle' },
  cancelled: { label: 'Đã hủy', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle-outline' },
};

export interface BookingScreenProps {
  isSearchOpen?: boolean;
}

export default function BookingScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const { openSidebar } = useSidebar();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ customer_name: '', phone: '', booking_time: '', guest_count: '2', note: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await request(`${API}/bookings`);
      const list = Array.isArray(data) ? data : (data?.items || []);
      if (list && list.length > 0) {
        setBookings(list);
        if (isWide && !selectedId) setSelectedId(list[0].id);
      } else {
        const fallbacks = generateFallbackBookings();
        setBookings(fallbacks);
        if (isWide && !selectedId) setSelectedId(fallbacks[0].id);
      }
    } catch {
      const fallbacks = generateFallbackBookings();
      setBookings(fallbacks);
      if (isWide && !selectedId) setSelectedId(fallbacks[0].id);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isWide, selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openAdd = () => {
    setForm({ customer_name: '', phone: '', booking_time: '19:00', guest_count: '2', note: '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.phone) {
      Alert.alert('Lỗi', 'Tên và Số điện thoại là bắt buộc');
      return;
    }
    try {
      await request(`${API}/bookings`, {
        method: 'POST',
        body: JSON.stringify({
          customer_name: form.customer_name,
          phone: form.phone,
          booking_time: form.booking_time || '19:00',
          guest_count: parseInt(form.guest_count) || 2,
          note: form.note,
          status: 'pending',
        }),
      });
      setShowForm(false);
      load();
    } catch {
      Alert.alert('Lỗi', 'Không thể tạo lịch đặt bàn');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await request(`${API}/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      load();
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return bookings;
    return bookings.filter((b) => b.status === statusFilter);
  }, [bookings, statusFilter]);

  const selectedItem = useMemo(
    () => bookings.find((b) => b.id === selectedId) || null,
    [bookings, selectedId]
  );

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed' || b.status === 'arrived').length;

  // ── Master Detail Right Inspector Panel ──
  const renderDetailPanel = () => {
    if (!selectedItem) {
      return (
        <View style={ss.detailPanelEmpty}>
          <AppText variant="md" weight="bold" color="#050505">
            Chi Tiết Lịch Đặt Bàn
          </AppText>
          <AppText variant="sm" color="#65676B" style={{ textAlign: 'center' }}>
            Chọn một lịch đặt từ danh sách bên trái để xem thông tin & điều phối bàn
          </AppText>
          <TouchableOpacity style={ss.panelCta} onPress={openAdd}>
            <Icon name="plus" size={18} color="#FFF" />
            <AppText variant="sm" weight="bold" color="#FFF">
              Thêm lịch đặt mới
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    const b = selectedItem;
    const st = STATUS_MAP[b.status] || STATUS_MAP.pending;

    return (
      <View style={ss.detailPanel}>
        <View style={s.detailHeader}>
          <View style={[s.avatarCircle, { backgroundColor: st.bg, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="sm" weight="bold" color={st.color} style={{ fontSize: 12 }}>
              {st.label?.slice(0, 2)}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">
              {b.customer_name}
            </AppText>
            <AppText variant="sm" color={colors.text.secondary}>
              📱 {b.phone || 'Chưa có SĐT'}
            </AppText>
          </View>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <AppText variant="sm" weight="bold" color={st.color}>
              {st.label}
            </AppText>
          </View>
        </View>

        <View style={s.detailBody}>
          <View style={s.detailStatRow}>
            <AppText variant="sm" color="#65676B">Thời gian hẹn</AppText>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>
              {b.booking_time}
            </AppText>
          </View>

          <View style={s.detailStatRow}>
            <AppText variant="sm" color="#65676B">Số lượng khách</AppText>
            <AppText variant="md" weight="bold" color="#050505">
              👤 {b.guest_count} người
            </AppText>
          </View>

          <View style={s.detailStatRow}>
            <AppText variant="sm" color="#65676B">Vị trí xếp bàn</AppText>
            <AppText variant="sm" weight="bold" color="#050505">
              {b.table_number || 'Chưa phân bàn'}
            </AppText>
          </View>

          {b.note ? (
            <View style={s.statBoxBg}>
              <AppText variant="sm" color="#65676B">📝 Ghi chú từ khách:</AppText>
              <AppText variant="sm" color="#334155" style={{ fontStyle: 'italic', marginTop: 2 }}>
                "{b.note}"
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={s.detailActions}>
          {b.status === 'pending' && (
            <TouchableOpacity
              style={s.panelBtnPrimary}
              onPress={() => updateStatus(b.id, 'confirmed')}
            >
              <Icon name="check" size={16} color="#FFF" />
              <AppText variant="sm" weight="bold" color="#FFF">
                Xác nhận đặt bàn
              </AppText>
            </TouchableOpacity>
          )}

          {b.status === 'confirmed' && (
            <TouchableOpacity
              style={s.panelBtnPrimary}
              onPress={() => updateStatus(b.id, 'arrived')}
            >
              <Icon name="table-furniture" size={16} color="#FFF" />
              <AppText variant="sm" weight="bold" color="#FFF">
                Khách đã đến
              </AppText>
            </TouchableOpacity>
          )}

          {b.status !== 'cancelled' && b.status !== 'completed' && (
            <TouchableOpacity
              style={ss.panelBtnDanger}
              onPress={() => updateStatus(b.id, 'cancelled')}
            >
              <Icon name="close" size={16} color={colors.status.danger} />
              <AppText variant="sm" color={colors.status.danger}>
                Hủy lịch
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderCard = ({ item: b }: { item: BookingItem }) => {
    const isSelected = selectedId === b.id;
    const st = STATUS_MAP[b.status] || STATUS_MAP.pending;

    if (!isWide) {
      return (
        <View style={ss.listRow}>
          <View style={[s.posAvatarMiniCircle, { backgroundColor: st.bg, alignItems: 'center', justifyContent: 'center' }]}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.color }} />
          </View>

          <TouchableOpacity
            style={{ flex: 1, paddingRight: 8, justifyContent: 'center' }}
            onPress={() => setSelectedId(isSelected ? null : b.id)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppText variant="sm" weight="bold" color="#0F172A" numberOfLines={1} style={{ maxWidth: '70%' }}>
                {b.customer_name}
              </AppText>
              <AppText variant="sm" color="#64748B" numberOfLines={1} style={{ fontSize: 12 }}>
                ({b.guest_count} khách)
              </AppText>
            </View>
            <AppText variant="sm" color="#64748B" numberOfLines={1} style={{ marginTop: 2, fontSize: 11 }}>
              ⏰ {b.booking_time} · {b.table_number || 'Chưa bàn'} · 📱 {b.phone || 'Chưa SĐT'}
            </AppText>
          </TouchableOpacity>

          <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
            <AppText variant="sm" weight="bold" color={st.color}>
              {st.label}
            </AppText>
          </View>

          <TouchableOpacity style={ss.miniActionBtn} onPress={() => setSelectedId(isSelected ? null : b.id)}>
            <Icon name="pencil" size={16} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => setSelectedId(isSelected ? null : b.id)}
        style={ss.listRow}
        activeOpacity={0.7}
      >
        <View style={[ss.iconCircleSm, { backgroundColor: st.bg, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }]}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.color }} />
        </View>
        <View style={{ flex: 1, paddingLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>
              {b.customer_name}
            </AppText>
            <AppText variant="sm" color="#65676B">
              (👤 {b.guest_count} khách)
            </AppText>
          </View>
          <AppText variant="sm" color="#65676B">
            ⏰ {b.booking_time} · {b.table_number || 'Chưa xếp bàn'}
          </AppText>
        </View>
        <View style={{ backgroundColor: st.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
          <AppText variant="sm" weight="bold" color={st.color}>
            {st.label}
          </AppText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      {/* Top Mobile Header */}
      {!isWide && (
        isSearchOpen || searchQuery.length > 0 ? (
          <View style={ss.topActionBar}>
            <View style={ss.searchInputWrap}>
              <Icon name="magnify" size={20} color="#64748B" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Tìm tên khách, SĐT, số bàn..."
                placeholderTextColor="#94A3B8"
                style={ss.searchTextInput}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={openAdd} style={ss.addBtn}>
              <Icon name="plus" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>
                Đặt bàn
              </AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={ss.mobileActionRow}>
            <AppText variant="md" weight="bold" color="#050505">
              {bookings.length} lịch đặt bàn
            </AppText>
            <TouchableOpacity onPress={openAdd} style={ss.addBtn}>
              <Icon name="plus" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>
                Đặt bàn
              </AppText>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* ── Top Metric Header Badges (Desktop only) ────────────────────────── */}
      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}>
              <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ fontSize: 11 }}>Lịch</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#050505">
                {bookings.length} lịch
              </AppText>
              <AppText variant="sm" color="#65676B">
                Tổng đặt bàn
              </AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#FEF3C7' }]}>
              <AppText variant="sm" weight="bold" color="#D97706" style={{ fontSize: 11 }}>chờ</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#D97706">
                {pendingCount} chờ
              </AppText>
              <AppText variant="sm" color="#65676B">
                Cần xác nhận
              </AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
              <AppText variant="sm" weight="bold" color="#16A34A" style={{ fontSize: 12 }}>✓</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#16A34A">
                {confirmedCount} bàn
              </AppText>
              <AppText variant="sm" color="#65676B">
                Đã chốt giữ bàn
              </AppText>
            </View>
          </View>
        </View>
      )}

      {/* ── Toolbar: Status Filter Chips ────────────────────────── */}
      <View style={{ width: '100%', marginBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%', flexGrow: 0, height: 44 }}
          contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 }}
        >
          {[
            { key: 'all', label: `Tất cả (${bookings.length})` },
            { key: 'pending', label: `Chờ xác nhận (${bookings.filter(b => b.status === 'pending').length})` },
            { key: 'confirmed', label: `Đã xác nhận (${bookings.filter(b => b.status === 'confirmed').length})` },
            { key: 'arrived', label: `Khách đã đến (${bookings.filter(b => b.status === 'arrived').length})` },
            { key: 'completed', label: `Hoàn thành (${bookings.filter(b => b.status === 'completed').length})` },
            { key: 'cancelled', label: `Đã hủy (${bookings.filter(b => b.status === 'cancelled').length})` },
          ].map((sItem) => {
            const active = statusFilter === sItem.key;
            return (
              <TouchableOpacity
                key={sItem.key}
                onPress={() => setStatusFilter(sItem.key)}
                style={[ss.filterChip, active && ss.filterChipActive]}
              >
                <AppText
                  variant="sm"
                  weight="bold"
                  color={active ? colors.brand.primary : '#334155'}
                >
                  {sItem.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {!isWide && (
        <DetailModal
          visible={!!selectedItem}
          title={selectedItem?.customer_name || 'Chi tiết đặt bàn'}
          subtitle={selectedItem ? `Lịch hẹn: ${selectedItem.booking_time || 'Chưa xếp'} · Bàn: ${(selectedItem as any).table_name || selectedItem.table_number || 'Chưa chọn'} · ${selectedItem.guest_count || 1} khách` : undefined}
          onClose={() => setSelectedId(null)}
        >
          {renderDetailPanel()}
        </DetailModal>
      )}
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            {loading ? (
              <TableSkeleton rowCount={5} />
            ) : filtered.length > 0 ? (
              <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={renderCard}
                contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              />
            ) : (
              <EmptyState
                icon="calendar-remove"
                title="Không có lịch đặt bàn"
                subtitle="Nhấn + Thêm lịch đặt để khởi tạo khách đặt trước"
              />
            )}
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Mobile Section List */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
            <View style={ss.sectionWrap}>
              <View style={ss.sectionHeader}>
                <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
                  <Icon name="calendar-clock" size={14} color={colors.brand.primary} />
                </View>
                <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1 }}>
                  DANH SÁCH LỊCH ĐẶT BÀN ({filtered.length})
                </AppText>
              </View>

              <View style={ss.sectionItems}>
                {filtered.map(item => (
                  <React.Fragment key={item.id}>
                    {renderCard({ item })}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      <FormModal
        visible={showForm}
        title="Thêm Đặt Bàn Mới"
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        saveLabel="Tạo lịch đặt"
      >
        <View style={{ gap: 12 }}>
          <View style={{ gap: 4 }}>
            <AppText variant="sm" weight="normal" color="#050505">Tên khách hàng *</AppText>
            <TextInput
              style={s.fieldInput}
              placeholder="VD: Anh Cường"
              value={form.customer_name}
              onChangeText={(v) => setForm((f) => ({ ...f, customer_name: v }))}
            />
          </View>

          <View style={{ gap: 4 }}>
            <AppText variant="sm" weight="normal" color="#050505">Số điện thoại *</AppText>
            <TextInput
              style={s.fieldInput}
              placeholder="0987..."
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="sm" weight="normal" color="#050505">Giờ đến</AppText>
              <TextInput
                style={s.fieldInput}
                placeholder="19:00"
                value={form.booking_time}
                onChangeText={(v) => setForm((f) => ({ ...f, booking_time: v }))}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="sm" weight="normal" color="#050505">Số khách</AppText>
              <TextInput
                style={s.fieldInput}
                placeholder="2"
                keyboardType="numeric"
                value={form.guest_count}
                onChangeText={(v) => setForm((f) => ({ ...f, guest_count: v }))}
              />
            </View>
          </View>

          <View style={{ gap: 4 }}>
            <AppText variant="sm" weight="normal" color="#050505">Ghi chú đặc biệt</AppText>
            <TextInput
              style={s.fieldInput}
              placeholder="Gần cửa sổ, ghế trẻ em..."
              value={form.note}
              onChangeText={(v) => setForm((f) => ({ ...f, note: v }))}
            />
          </View>
        </View>
      </FormModal>
    </View>
  );
}

// ── Styles (Matching Suppliers Standard 100%) ──
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
    position: 'relative',
  },
  toolbarRow: {
    marginBottom: 6,
  },
  pillChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  pillChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.brand.primary,
  },
  mainBody: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  cardWide: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailBody: {
    gap: 10,
  },
  detailStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBoxBg: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    gap: 4,
    marginTop: 4,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  panelBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },
  cardPromoStyle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
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
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 10,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  btnBluePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  btnGreenPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
  },
  btnOrangePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
  },
  btnRedPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  fieldInput: {
    height: 44,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#050505',
    backgroundColor: '#F8FAFC',
  },
  posAvatarMiniCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});

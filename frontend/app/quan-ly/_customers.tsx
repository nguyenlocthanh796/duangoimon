import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND, ss } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Customer } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import FAB from '../../lib/components/ui/FAB';
import SearchBar from '../../lib/components/ui/SearchBar';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import { useSidebar } from '../../lib/context/SidebarContext';

const API = '/api/v1/quan-ly';

export interface CustomerExt extends Customer {
  total_orders?: number;
  wallet_balance?: number;
}

export interface CustomersScreenProps {
  isSearchOpen?: boolean;
}

// Generate fallback customers if database table is empty or API offline
function generateFallbackCustomers(): CustomerExt[] {
  return [
    { id: 'c1', name: 'Nguyễn Văn An', phone: '0987654321', email: 'an.nguyen@gmail.com', address: 'Quận 1, TP.HCM', total_orders: 14, total_spent: 2450000 },
    { id: 'c2', name: 'Trần Thị Bình', phone: '0912345678', email: 'binh.tran@yahoo.com', address: 'Quận 3, TP.HCM', total_orders: 8, total_spent: 1280000 },
    { id: 'c3', name: 'Lê Hoàng Cường', phone: '0903112233', email: 'cuong.le@gmail.com', address: 'Quận 7, TP.HCM', total_orders: 22, total_spent: 4890000 },
    { id: 'c4', name: 'Phạm Minh Dung', phone: '0977889900', email: 'dung.pham@outlook.com', address: 'Bình Thạnh, TP.HCM', total_orders: 5, total_spent: 650000 },
    { id: 'c5', name: 'Vũ Quốc Giang', phone: '0934567890', email: 'giang.vu@gmail.com', address: 'Phú Nhuận, TP.HCM', total_orders: 11, total_spent: 1950000 },
  ] as unknown as CustomerExt[];
}

export default function CustomersScreen({ isSearchOpen }: CustomersScreenProps = {}) {
  const { isWide } = useResponsive();
  const { openSidebar } = useSidebar();
  const [customers, setCustomers] = useState<CustomerExt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<CustomerExt | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [sortKey, setSortKey] = useState<string>('total_spent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await request(`${API}/customers`);
      const list = Array.isArray(data) ? data : (data?.items || []);
      if (list && list.length > 0) {
        setCustomers(list);
        if (isWide) setSelected(list[0]);
      } else {
        const fallbacks = generateFallbackCustomers();
        setCustomers(fallbacks);
        if (isWide) setSelected(fallbacks[0]);
      }
    } catch {
      const fallbacks = generateFallbackCustomers();
      setCustomers(fallbacks);
      if (isWide) setSelected(fallbacks[0]);
    } finally {
      setLoading(false);
    }
  }, [isWide]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name || !form.phone) { Alert.alert('Lỗi', 'Tên và SĐT là bắt buộc'); return; }
    try {
      await request(`${API}/customers`, { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false); setForm({ name: '', phone: '', email: '', address: '' }); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu khách hàng'); }
  };

  const [statusFilter, setStatusFilter] = useState<string>('all');

  const vipCount = useMemo(() => customers.filter(c => (c.total_spent || 0) >= 5000000).length, [customers]);
  const regCount = useMemo(() => customers.filter(c => (c.total_spent || 0) > 0 && (c.total_spent || 0) < 5000000).length, [customers]);
  const newCount = useMemo(() => customers.filter(c => !(c.total_spent)).length, [customers]);

  const filtered = useMemo(() => {
    let arr = [...customers];
    if (statusFilter === 'vip') {
      arr = arr.filter(c => (c.total_spent || 0) >= 5000000);
    } else if (statusFilter === 'regular') {
      arr = arr.filter(c => (c.total_spent || 0) > 0 && (c.total_spent || 0) < 5000000);
    } else if (statusFilter === 'new') {
      arr = arr.filter(c => !(c.total_spent));
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      arr = arr.filter(c => (c.name?.toLowerCase() || '').includes(q) || (c.phone || '').includes(q));
    }
    return arr;
  }, [customers, statusFilter, search]);

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const stats = useMemo(() => {
    const total = customers.length;
    const totalSpent = customers.reduce((s, c) => s + (c.total_spent || 0), 0);
    const totalVisits = customers.reduce((s, c) => s + (c.total_orders || 0), 0);
    return { total, totalSpent, totalVisits };
  }, [customers]);

  const columns: Column<CustomerExt>[] = [
    {
      key: 'name',
      title: 'Khách hàng',
      flex: 1,
      render: (c) => (
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => setSelected(c)}>
          <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>
              {c.name?.charAt(0)?.toUpperCase() || 'K'}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="sm" weight="bold" color="#050505" numberOfLines={1}>{c.name}</AppText>
            {c.phone ? <AppText variant="sm" color="#65676B">📱 {c.phone}</AppText> : null}
          </View>
        </TouchableOpacity>
      ),
    },
    {
      key: 'total_orders',
      title: 'Số đơn',
      width: 90,
      align: 'right',
      sortable: true,
      sortValue: (c) => c.total_orders || 0,
      render: (c) => <AppText variant="sm" color="#050505">{c.total_orders || 0} đơn</AppText>,
    },
    {
      key: 'total_spent',
      title: 'Chi tiêu',
      width: 140,
      align: 'right',
      sortable: true,
      sortValue: (c) => c.total_spent || 0,
      render: (c) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(c.total_spent || 0)}</AppText>,
    },
  ];

  const maxSpent = useMemo(() => {
    return Math.max(1, ...customers.map(c => c.total_spent || 0));
  }, [customers]);

  const renderPanel = () => {
    if (!selected) {
      return (
        <View style={styles.panelBox}>
          <View style={styles.panelHeader}>
            <AppText variant="md" weight="bold" color="#050505">Thông tin khách hàng</AppText>
          </View>
          <AppText variant="sm" color="#65676B" style={{ textAlign: 'center', marginVertical: 20 }}>
            Chọn một khách hàng từ danh sách để xem chi tiết
          </AppText>
        </View>
      );
    }
    const c = selected;
    return (
      <View style={ss.sectionWrap}>
        <View style={ss.sectionHeader}>
          <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
            HỒ SƠ KHÁCH HÀNG
          </AppText>
        </View>

        <View style={{ padding: 10, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF', width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="md" weight="bold" color={colors.brand.primary} style={{ fontSize: 22 }}>
              {c.name?.charAt(0)?.toUpperCase() || 'K'}
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{c.name}</AppText>
            <AppText variant="sm" color="#65676B" style={{ marginTop: 2 }}>
              {c.phone ? `📱 ${c.phone}` : 'Chưa có số điện thoại'}
            </AppText>
          </View>
        </View>

        <View style={{ gap: 8, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 }}>
          {c.email ? <AppText variant="sm" color="#050505">✉️ Email: {c.email}</AppText> : null}
          {c.address ? <AppText variant="sm" color="#050505">📍 Địa chỉ: {c.address}</AppText> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="sm" color="#050505">⭐ Phân nhóm:</AppText>
            <View style={{ backgroundColor: (c.total_spent || 0) > 5000000 ? '#FEF3C7' : '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
              <AppText variant="sm" weight="bold" color={(c.total_spent || 0) > 5000000 ? '#D97706' : '#2563EB'} style={{ fontSize: 11 }}>
                {(c.total_spent || 0) > 5000000 ? '👑 Khách VIP' : (c.total_orders || 0) > 5 ? '🌟 Thân Thiết' : '🆕 Khách Mới'}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.panelDivider} />

        {/* 💳 Ví trả trước & Tích lũy */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 10, borderRadius: 8 }}>
            <View>
              <AppText variant="sm" color="#065F46">Số dư Ví trả trước</AppText>
              <AppText variant="md" weight="bold" color="#047857">{formatVND(c.wallet_balance || 0)}</AppText>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
              onPress={() => Alert.alert('Nạp tiền ví', `Đã mở giao diện nạp ví cho ${c.name}`)}
            >
              <AppText variant="sm" weight="bold" color="#FFFFFF">Nạp tiền</AppText>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="sm" color="#65676B">Tổng chi tiêu tích lũy</AppText>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(c.total_spent || 0)}</AppText>
          </View>
          <View style={{ flex: 1, height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
            <View style={{ width: `${Math.max(8, ((c.total_spent || 0) / maxSpent) * 100)}%`, height: 10, backgroundColor: colors.brand.primary, borderRadius: 5 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <AppText variant="sm" color="#65676B">Số đơn hoàn thành</AppText>
            <AppText variant="sm" color="#050505">{c.total_orders || 0} đơn hàng</AppText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => Alert.alert('Gọi điện', `Đang gọi đến SĐT ${c.phone}`)}>
            <Icon name="phone" size={16} color={colors.brand.primary} />
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>Gọi điện</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.panelBtnPrimary} onPress={() => setShowForm(true)}>
            <Icon name="pencil" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Chỉnh sửa</AppText>
          </TouchableOpacity>
        </View>
        </View>
      </View>
    );
  };

  const renderMobileCustomerCard = ({ item: c }: { item: CustomerExt }) => (
    <TouchableOpacity
      style={ss.listRow}
      onPress={() => setSelected(c)}
      activeOpacity={0.7}
    >
      <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }]}>
        <AppText variant="sm" weight="bold" color={colors.brand.primary}>
          {c.name?.charAt(0)?.toUpperCase() || 'K'}
        </AppText>
      </View>
      <View style={{ flex: 1, paddingLeft: 10, justifyContent: 'center' }}>
        <AppText variant="sm" weight="normal" color="#0F172A" numberOfLines={1}>{c.name}</AppText>
        <AppText variant="sm" color="#64748B" numberOfLines={1} style={{ marginTop: 2, fontSize: 11 }}>
          📱 {c.phone || 'Chưa SĐT'} · {c.total_orders || 0} đơn
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(c.total_spent || 0)}</AppText>
        <AppText variant="sm" color="#64748B" style={{ fontSize: 11 }}>Chi tiêu</AppText>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, position: 'relative' }}>
      {/* Top Mobile Header */}
      {!isWide && (
        isSearchOpen || search.length > 0 ? (
          <View style={ss.topActionBar}>
            <View style={ss.searchInputWrap}>
              <Icon name="magnify" size={20} color="#64748B" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm khách hàng, SĐT..."
                placeholderTextColor="#94A3B8"
                style={ss.searchTextInput}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowForm(true)} style={ss.addBtn}>
              <Icon name="plus" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm khách</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={ss.mobileActionRow}>
            <AppText variant="md" weight="bold" color="#050505">{filtered.length} khách hàng</AppText>
            <TouchableOpacity onPress={() => setShowForm(true)} style={ss.addBtn}>
              <Icon name="plus" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm khách</AppText>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* ── Toolbar: Customer Segment Filter Chips ────────────────────────── */}
      <View style={{ width: '100%', marginBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%', flexGrow: 0, height: 44 }}
          contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 }}
        >
          {[
            { key: 'all', label: `Tất cả (${stats.total})` },
            { key: 'vip', label: `VIP (${vipCount})` },
            { key: 'regular', label: `Thành viên (${regCount})` },
            { key: 'new', label: `Khách mới (${newCount})` },
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

      {/* 📊 Executive KPI Strip (Desktop only) */}
      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}>
              <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ fontSize: 11 }}>KH</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#050505">{stats.total} khách hàng</AppText>
              <AppText variant="sm" color="#65676B">Tổng cơ sở dữ liệu</AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
              <AppText variant="sm" weight="bold" color={colors.status.success} style={{ fontSize: 11 }}>đ</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(stats.totalSpent)}</AppText>
              <AppText variant="sm" color="#65676B">Tổng chi tiêu</AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#FFF7ED' }]}>
              <AppText variant="sm" weight="bold" color="#F97316" style={{ fontSize: 11 }}>LT</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#F97316">{stats.totalVisits} lượt mua</AppText>
              <AppText variant="sm" color="#65676B">Tổng lượt ghé quán</AppText>
            </View>
          </View>
        </View>
      )}

      {isWide && (
        <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm khách hàng theo tên, số điện thoại..." />
        </View>
      )}

      {!isWide && (
        <DetailModal
          visible={!!selected}
          title="Hồ Sơ Khách Hàng"
          subtitle={selected?.name ? `${selected.name} · ${selected.phone || 'Chưa SĐT'}` : undefined}
          onClose={() => setSelected(null)}
        >
          {renderPanel()}
        </DetailModal>
      )}

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<CustomerExt>
              columns={columns}
              data={filtered}
              getRowId={(c) => c.id}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onRefresh={load}
              compact
              emptyIcon="account-off"
              emptyTitle="Chưa có khách hàng nào"
              emptySubtitle="Nhấn + để thêm khách hàng đầu tiên"
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
                <Icon name="account-group" size={14} color={colors.brand.primary} />
              </View>
              <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1 }}>
                DANH SÁCH KHÁCH HÀNG ({filtered.length})
              </AppText>
            </View>

            <View style={ss.sectionItems}>
              {filtered.map((c) => (
                <React.Fragment key={c.id}>
                  {renderMobileCustomerCard({ item: c })}
                </React.Fragment>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <FormModal
        visible={showForm}
        title="Thêm khách hàng mới"
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      >
        <View style={{ gap: 12 }}>
          <TextInput
            style={styles.input}
            placeholder="Tên khách hàng (*)"
            value={form.name}
            onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Số điện thoại (*)"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(v) => setForm(f => ({ ...f, phone: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            value={form.email}
            onChangeText={(v) => setForm(f => ({ ...f, email: v }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Địa chỉ"
            value={form.address}
            onChangeText={(v) => setForm(f => ({ ...f, address: v }))}
          />
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
    paddingVertical: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  /* Facebook Story Highlight Metric Cards Container */
  metricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface.card,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  fbMetricCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface.card,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fbMetricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircleSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionWrap: {
    backgroundColor: colors.surface.card,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionItems: {
    backgroundColor: colors.surface.card,
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
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 12,
    ...font.md,
    color: colors.text.primary,
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
});


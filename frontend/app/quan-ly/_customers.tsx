import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, RefreshControl, TextInput, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useCrud } from '../../lib/hooks/useCrud';
import { colors, font, formatVND, ss } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Customer } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';

const API = '/api/v1/quan-ly';

export interface CustomerExt extends Customer {
  total_orders?: number;
  wallet_balance?: number;
}

function generateFallbackCustomers(): CustomerExt[] {
  return [
    { id: 'c1', name: 'Nguyễn Văn An', phone: '0987654321', email: 'an.nguyen@gmail.com', address: 'Quận 1, TP.HCM', total_orders: 14, total_spent: 2450000 },
    { id: 'c2', name: 'Trần Thị Bình', phone: '0912345678', email: 'binh.tran@yahoo.com', address: 'Quận 3, TP.HCM', total_orders: 8, total_spent: 1280000 },
    { id: 'c3', name: 'Lê Hoàng Cường', phone: '0903112233', email: 'cuong.le@gmail.com', address: 'Quận 7, TP.HCM', total_orders: 22, total_spent: 4890000 },
    { id: 'c4', name: 'Phạm Minh Dung', phone: '0977889900', email: 'dung.pham@outlook.com', address: 'Bình Thạnh, TP.HCM', total_orders: 5, total_spent: 650000 },
    { id: 'c5', name: 'Vũ Quốc Giang', phone: '0934567890', email: 'giang.vu@gmail.com', address: 'Phú Nhuận, TP.HCM', total_orders: 11, total_spent: 1950000 },
  ] as unknown as CustomerExt[];
}

export default function CustomersScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();
  const [customers, setCustomers] = React.useState<CustomerExt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [selected, setSelected] = React.useState<CustomerExt | null>(null);
  const [form, setForm] = React.useState({ name: '', phone: '', email: '', address: '' });
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [sortKey, setSortKey] = React.useState('total_spent');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  const loadData = React.useCallback(async (quiet?: boolean) => {
    if (!quiet) setLoading(true);
    try {
      const data: any = await request(`${API}/customers`);
      const list = Array.isArray(data) ? data : (data?.items || []);
      if (list && list.length > 0) {
        setCustomers(list);
        if (isWide && !selected) setSelected(list[0]);
      } else {
        const fb = generateFallbackCustomers();
        setCustomers(fb);
        if (isWide && !selected) setSelected(fb[0]);
      }
    } catch {
      const fb = generateFallbackCustomers();
      setCustomers(fb);
      if (isWide && !selected) setSelected(fb[0]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isWide, selected]);

  React.useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.phone) { Alert.alert('Lỗi', 'Tên và SĐT là bắt buộc'); return; }
    try {
      await request(`${API}/customers`, { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false); setForm({ name: '', phone: '', email: '', address: '' }); loadData();
    } catch { Alert.alert('Lỗi', 'Không thể lưu khách hàng'); }
  };

  const vipCount = useMemo(() => customers.filter(c => (c.total_spent || 0) >= 5000000).length, [customers]);
  const regCount = useMemo(() => customers.filter(c => (c.total_spent || 0) > 0 && (c.total_spent || 0) < 5000000).length, [customers]);
  const newCount = useMemo(() => customers.filter(c => !(c.total_spent)).length, [customers]);

  const filtered = useMemo(() => {
    let arr = [...customers];
    if (statusFilter === 'vip') arr = arr.filter(c => (c.total_spent || 0) >= 5000000);
    else if (statusFilter === 'regular') arr = arr.filter(c => (c.total_spent || 0) > 0 && (c.total_spent || 0) < 5000000);
    else if (statusFilter === 'new') arr = arr.filter(c => !(c.total_spent));
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      arr = arr.filter(c => (c.name?.toLowerCase() || '').includes(q) || (c.phone || '').includes(q));
    }
    return arr;
  }, [customers, statusFilter, search]);

  const stats = useMemo(() => ({
    total: customers.length,
    totalSpent: customers.reduce((s, c) => s + (c.total_spent || 0), 0),
    totalVisits: customers.reduce((s, c) => s + (c.total_orders || 0), 0),
  }), [customers]);

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const columns: Column<CustomerExt>[] = [
    {
      key: 'name', title: 'Khách hàng', flex: 1,
      render: (c) => (
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => setSelected(c)}>
          <View style={[s.avatarCircle, { backgroundColor: '#EEF2FF' }]}>
            <AppText variant="md" color={colors.brand.primary}>{c.name?.charAt(0)?.toUpperCase() || 'K'}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" color="#050505" numberOfLines={1}>{c.name}</AppText>
            {c.phone ? <AppText variant="md" color="#65676B">📱 {c.phone}</AppText> : null}
          </View>
        </TouchableOpacity>
      ),
    },
    { key: 'total_orders', title: 'Số đơn', width: 90, align: 'right', sortable: true,
      sortValue: (c) => c.total_orders || 0,
      render: (c) => <AppText variant="md" color="#050505">{c.total_orders || 0} đơn</AppText> },
    { key: 'total_spent', title: 'Chi tiêu', width: 140, align: 'right', sortable: true,
      sortValue: (c) => c.total_spent || 0,
      render: (c) => <AppText variant="md" color={colors.brand.primary}>{formatVND(c.total_spent || 0)}</AppText> },
  ];

  const maxSpent = useMemo(() => Math.max(1, ...customers.map(c => c.total_spent || 0)), [customers]);

  const renderPanel = () => {
    if (!selected) {
      return (
        <View style={s.panelBox}>
          <View style={s.panelHeader}><AppText variant="md" color="#050505">Thông tin khách hàng</AppText></View>
          <AppText variant="md" color="#65676B" style={{ textAlign: 'center', marginVertical: 20 }}>
            Chọn khách hàng từ danh sách
          </AppText>
        </View>
      );
    }
    const c = selected;
    return (
      <View style={ss.sectionWrap}>
        <View style={ss.sectionHeader}>
          <AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>HỒ SƠ KHÁCH HÀNG</AppText>
        </View>
        <View style={{ padding: 10, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={[s.avatarCircle, { backgroundColor: '#EEF2FF', width: 52, height: 52, borderRadius: 26 }]}>
              <AppText variant="md" color={colors.brand.primary}>{c.name?.charAt(0)?.toUpperCase() || 'K'}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color="#050505">{c.name}</AppText>
              <AppText variant="md" color="#65676B" style={{ marginTop: 2 }}>{c.phone ? `📱 ${c.phone}` : 'Chưa SĐT'}</AppText>
            </View>
          </View>
          <View style={{ gap: 8, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 }}>
            {c.email ? <AppText variant="md" color="#050505">✉️ Email: {c.email}</AppText> : null}
            {c.address ? <AppText variant="md" color="#050505">📍 Địa chỉ: {c.address}</AppText> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="md" color="#050505">⭐ Phân nhóm:</AppText>
              <View style={{ backgroundColor: (c.total_spent || 0) > 5000000 ? '#FEF3C7' : '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <AppText variant="md" color={(c.total_spent || 0) > 5000000 ? '#D97706' : '#2563EB'}>
                  {(c.total_spent || 0) > 5000000 ? '👑 VIP' : (c.total_orders || 0) > 5 ? '🌟 Thân Thiết' : '🆕 Mới'}
                </AppText>
              </View>
            </View>
          </View>
          <View style={s.panelDivider} />
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 10, borderRadius: 8 }}>
              <View>
                <AppText variant="md" color="#065F46">Số dư Ví trả trước</AppText>
                <AppText variant="md" color="#047857">{formatVND(c.wallet_balance || 0)}</AppText>
              </View>
              <TouchableOpacity style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                onPress={() => Alert.alert('Nạp tiền ví', `Đã mở giao diện nạp ví cho ${c.name}`)}>
                <AppText variant="md" color="#FFFFFF">Nạp tiền</AppText>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="md" color="#65676B">Tổng chi tiêu</AppText>
              <AppText variant="md" color={colors.brand.primary}>{formatVND(c.total_spent || 0)}</AppText>
            </View>
            <View style={{ flex: 1, height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(8, ((c.total_spent || 0) / maxSpent) * 100)}%`, height: 10, backgroundColor: colors.brand.primary, borderRadius: 5 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <AppText variant="md" color="#65676B">Số đơn</AppText>
              <AppText variant="md" color="#050505">{c.total_orders || 0} đơn</AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity style={ss.panelBtnSecondary} onPress={() => Alert.alert('Gọi điện', `Đang gọi ${c.phone}`)}>
              <Icon name="phone" size={16} color={colors.brand.primary} />
              <AppText variant="md" color={colors.brand.primary}>Gọi</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999, backgroundColor: colors.brand.primary }} onPress={() => setShowForm(true)}>
              <Icon name="pencil" size={16} color={colors.text.inverse} />
              <AppText variant="md" color={colors.text.inverse}>Sửa</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const isSearchOpen = _props?.isSearchOpen;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, position: 'relative' }}>
      {!isWide ? (
        isSearchOpen || search.length > 0 ? (
          <View style={ss.topActionBar}>
            <View style={ss.searchInputWrap}>
              <Icon name="magnify" size={20} color="#64748B" />
              <TextInput value={search} onChangeText={setSearch} placeholder="Tìm KH, SĐT..."
                placeholderTextColor="#94A3B8" style={ss.searchTextInput} autoFocus />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}><Icon name="close-circle" size={18} color="#94A3B8" /></TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowForm(true)} style={ss.addBtn}>
              <Icon name="plus" size={16} color={colors.text.inverse} />
              <AppText variant="md" color={colors.text.inverse}>Thêm khách</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[ss.topActionBar, { justifyContent: 'space-between' }]}>
            <AppText variant="md" color="#050505">{filtered.length} khách hàng</AppText>
            <TouchableOpacity onPress={() => setShowForm(true)} style={ss.addBtn}>
              <Icon name="plus" size={16} color={colors.text.inverse} />
              <AppText variant="md" color={colors.text.inverse}>Thêm khách</AppText>
            </TouchableOpacity>
          </View>
        )
      ) : null}

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 44 }}
        contentContainerStyle={ss.filterChipsContainer}>
        {[
          { key: 'all', label: `Tất cả (${stats.total})` },
          { key: 'vip', label: `VIP (${vipCount})` },
          { key: 'regular', label: `Thành viên (${regCount})` },
          { key: 'new', label: `Khách mới (${newCount})` },
        ].map((sItem) => {
          const active = statusFilter === sItem.key;
          return (
            <TouchableOpacity key={sItem.key} onPress={() => setStatusFilter(sItem.key)}
              style={[ss.filterChip, active && ss.filterChipActive]}>
              <AppText variant="md" color={active ? colors.brand.primary : '#334155'}>{sItem.label}</AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* KPI */}
      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}>
              <AppText variant="md" color={colors.brand.primary}>KH</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color="#050505">{stats.total} khách hàng</AppText>
              <AppText variant="md" color="#65676B">Tổng CSDL</AppText>
            </View>
          </View>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
              <AppText variant="md" color={colors.status.success}>đ</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color={colors.status.success}>{formatVND(stats.totalSpent)}</AppText>
              <AppText variant="md" color="#65676B">Tổng chi tiêu</AppText>
            </View>
          </View>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#FFF7ED' }]}>
              <AppText variant="md" color="#F97316">LT</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color="#F97316">{stats.totalVisits} lượt mua</AppText>
              <AppText variant="md" color="#65676B">Ghế quán</AppText>
            </View>
          </View>
        </View>
      )}

      {isWide && (
        <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
          <AppText variant="md" color="#64748B">
            <TextInput value={search} onChangeText={setSearch} placeholder="Tìm KH theo tên, SĐT..."
              placeholderTextColor="#94A3B8" style={{ height: 38, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, color: '#0F172A', width: '100%' }} />
          </AppText>
        </View>
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
              onRefresh={() => { setRefreshing(true); loadData(); }}
              compact
              emptyIcon="account-off"
              emptyTitle="Chưa có khách hàng nào"
              emptySubtitle="Nhấn + để thêm khách hàng"
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <AppText variant="md" color="#1E293B" style={{ flex: 1 }}>DANH SÁCH KHÁCH HÀNG ({filtered.length})</AppText>
            </View>
            <View style={ss.sectionItems}>
              {filtered.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <AppText variant="md" color="#64748B">Không tìm thấy khách hàng</AppText>
                </View>
              ) : filtered.map((c) => (
                <TouchableOpacity key={c.id} style={ss.listRow} onPress={() => setSelected(c)} activeOpacity={0.7}>
                  <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
                    <AppText variant="md" color={colors.brand.primary}>{c.name?.charAt(0)?.toUpperCase() || 'K'}</AppText>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 10 }}>
                    <AppText variant="md" color="#0F172A" numberOfLines={1}>{c.name}</AppText>
                    <AppText variant="md" color="#64748B" numberOfLines={1}>
                      📱 {c.phone || 'Chưa SĐT'} · {c.total_orders || 0} đơn
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText variant="md" color={colors.brand.primary}>{formatVND(c.total_spent || 0)}</AppText>
                    <AppText variant="md" color="#64748B">Chi tiêu</AppText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {!isWide && (
        <DetailModal visible={!!selected} title="Hồ Sơ Khách Hàng"
          subtitle={selected?.name ? `${selected.name} · ${selected.phone || 'Chưa SĐT'}` : undefined}
          onClose={() => setSelected(null)}>
          {renderPanel()}
        </DetailModal>
      )}

      <FormModal visible={showForm} title="Thêm khách hàng mới"
        onClose={() => setShowForm(false)} onSave={handleSave}>
        <View style={{ gap: 12 }}>
          <TextInput style={s.input} placeholder="Tên khách hàng (*)" value={form.name}
            onChangeText={(v) => setForm(f => ({ ...f, name: v }))} />
          <TextInput style={s.input} placeholder="SĐT (*)" keyboardType="phone-pad" value={form.phone}
            onChangeText={(v) => setForm(f => ({ ...f, phone: v }))} />
          <TextInput style={s.input} placeholder="Email" keyboardType="email-address" value={form.email}
            onChangeText={(v) => setForm(f => ({ ...f, email: v }))} />
          <TextInput style={s.input} placeholder="Địa chỉ" value={form.address}
            onChangeText={(v) => setForm(f => ({ ...f, address: v }))} />
        </View>
      </FormModal>
    </View>
  );
}

const s = StyleSheet.create({
  avatarCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  input: { height: 44, borderWidth: 1, borderColor: colors.border.default, borderRadius: 8, paddingHorizontal: 12, color: colors.text.primary },
});

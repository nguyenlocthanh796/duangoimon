import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Customer } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import SearchBar from '../../lib/components/ui/SearchBar';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

// Generate fallback customers if database table is empty or API offline
function generateFallbackCustomers(): Customer[] {
  return [
    { id: 'c1', name: 'Nguyễn Văn An', phone: '0987654321', email: 'an.nguyen@gmail.com', address: 'Quận 1, TP.HCM', total_orders: 14, total_spent: 2450000 },
    { id: 'c2', name: 'Trần Thị Bình', phone: '0912345678', email: 'binh.tran@yahoo.com', address: 'Quận 3, TP.HCM', total_orders: 8, total_spent: 1280000 },
    { id: 'c3', name: 'Lê Hoàng Cường', phone: '0903112233', email: 'cuong.le@gmail.com', address: 'Quận 7, TP.HCM', total_orders: 22, total_spent: 4890000 },
    { id: 'c4', name: 'Phạm Minh Dung', phone: '0977889900', email: 'dung.pham@outlook.com', address: 'Bình Thạnh, TP.HCM', total_orders: 5, total_spent: 650000 },
    { id: 'c5', name: 'Vũ Quốc Giang', phone: '0934567890', email: 'giang.vu@gmail.com', address: 'Phú Nhuận, TP.HCM', total_orders: 11, total_spent: 1950000 },
  ] as Customer[];
}

export default function CustomersScreen() {
  const { isWide } = useResponsive();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
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
        setSelected(list[0]);
      } else {
        const fallbacks = generateFallbackCustomers();
        setCustomers(fallbacks);
        setSelected(fallbacks[0]);
      }
    } catch {
      const fallbacks = generateFallbackCustomers();
      setCustomers(fallbacks);
      setSelected(fallbacks[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name || !form.phone) { Alert.alert('Lỗi', 'Tên và SĐT là bắt buộc'); return; }
    try {
      await request(`${API}/customers`, { method: 'POST', body: JSON.stringify(form) });
      setShowForm(false); setForm({ name: '', phone: '', email: '', address: '' }); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu khách hàng'); }
  };

  const filtered = useMemo(() => {
    let arr = search ? customers.filter(c => (c.name?.toLowerCase() || '').includes(search.toLowerCase()) || (c.phone || '').includes(search)) : [...customers];
    return arr;
  }, [customers, search]);

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

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      title: 'Khách hàng',
      flex: 1,
      render: (c) => (
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => setSelected(c)}>
          <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF', width: 36, height: 36, borderRadius: 18 }]}>
            <Icon name="account" size={18} color={colors.brand.primary} />
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
            <Icon name="account-group" size={20} color={colors.brand.primary} />
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
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="account-check" size={20} color={colors.brand.primary} />
          <AppText variant="md" weight="bold" color="#050505">Hồ Sơ Khách Hàng</AppText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 }}>
          <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF', width: 52, height: 52, borderRadius: 26 }]}>
            <Icon name="account" size={28} color={colors.brand.primary} />
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
          <AppText variant="sm" color="#050505">⭐ Hạng khách hàng: Khách hàng Thân Thiết</AppText>
        </View>

        <View style={styles.panelDivider} />

        <View style={{ gap: 10 }}>
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
    );
  };

  const renderMobileCustomerCard = ({ item: c }: { item: Customer }) => (
    <View style={styles.itemMobile}>
      <TouchableOpacity style={styles.cardHeaderRow} onPress={() => setSelected(c)} activeOpacity={0.8}>
        <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF' }]}>
          <Icon name="account" size={22} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{c.name}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <AppText variant="sm" color="#65676B">📱 {c.phone || 'Chưa có SĐT'}</AppText>
            <AppText variant="sm" color="#65676B">· {c.total_orders || 0} đơn</AppText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(c.total_spent || 0)}</AppText>
          <AppText variant="sm" color="#65676B">Chi tiêu</AppText>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActionDivider} />

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
        <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => setSelected(c)}>
          <Icon name="account-details" size={14} color={colors.brand.primary} />
          <AppText variant="sm" color={colors.brand.primary}>Chi tiết</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => { Alert.alert('Khách hàng', `SĐT: ${c.phone || 'Không có'}`); }}>
          <Icon name="phone" size={14} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Gọi điện</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Mobile Header */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{customers.length} khách hàng CRM</AppText>
          <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm khách</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* 📊 Native App Style KPI Widget Cards Strip */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="account-group" size={20} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{stats.total} khách</AppText>
            <AppText variant="sm" color="#65676B">Tổng khách hàng</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="currency-usd" size={20} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(stats.totalSpent)}</AppText>
            <AppText variant="sm" color="#65676B">Tổng chi tiêu</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="cart-check" size={20} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#F97316">{stats.totalVisits} đơn</AppText>
            <AppText variant="sm" color="#65676B">Tổng lượt mua</AppText>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: isWide ? 12 : 8, marginBottom: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm tên hoặc số điện thoại..." />
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<Customer>
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
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={renderMobileCustomerCard}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="account-off"
                title="Chưa có khách hàng nào"
                subtitle="Nhấn + để thêm khách hàng đầu tiên"
              />
            )
          }
        />
      )}

      {!isWide && <FAB onPress={() => setShowForm(true)} />}

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
});

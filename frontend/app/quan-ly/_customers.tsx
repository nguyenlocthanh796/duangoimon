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
      setCustomers(Array.isArray(data) ? data : (data?.items || []));
    } catch { /* ignore */ } finally { setLoading(false); }
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
        <View>
          <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{c.name}</AppText>
          {c.phone ? <AppText variant="sm" color={colors.text.muted}>📱 {c.phone}</AppText> : null}
        </View>
      ),
    },
    {
      key: 'total_orders',
      title: 'Số đơn',
      width: 75,
      align: 'right',
      sortable: true,
      sortValue: (c) => c.total_orders || 0,
      render: (c) => <AppText variant="sm" color={colors.text.secondary}>{c.total_orders || 0}</AppText>,
    },
    {
      key: 'total_spent',
      title: 'Chi tiêu',
      width: 120,
      align: 'right',
      sortable: true,
      sortValue: (c) => c.total_spent || 0,
      render: (c) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(c.total_spent)}</AppText>,
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
            <AppText variant="sm" weight="bold" color={colors.text.primary}>Thông tin khách hàng</AppText>
          </View>
          <AppText variant="sm" color={colors.text.muted} style={{ textAlign: 'center', marginVertical: 20 }}>
            Chọn một khách hàng để xem chi tiết
          </AppText>
        </View>
      );
    }
    const c = selected;
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="account-check" size={20} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>{c.name}</AppText>
        </View>
        <View style={{ gap: 6 }}>
          {c.phone ? <AppText variant="sm" color={colors.text.secondary}>📱 SĐT: {c.phone}</AppText> : null}
          {c.email ? <AppText variant="sm" color={colors.text.secondary}>✉️ Email: {c.email}</AppText> : null}
          {c.address ? <AppText variant="sm" color={colors.text.secondary}>📍 Địa chỉ: {c.address}</AppText> : null}
        </View>
        <View style={styles.panelDivider} />
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="sm" color={colors.text.muted}>Tổng chi tiêu</AppText>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(c.total_spent)}</AppText>
          </View>
          <View style={{ flex: 1, height: 8, backgroundColor: colors.surface.app, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${Math.max(5, ((c.total_spent || 0) / maxSpent) * 100)}%`, height: 8, backgroundColor: colors.brand.primary, borderRadius: 4 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <AppText variant="sm" color={colors.text.muted}>Số đơn hàng</AppText>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{c.total_orders || 0} đơn</AppText>
          </View>
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
          <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(c.total_spent)}</AppText>
          <AppText variant="sm" color="#65676B">Chi tiêu</AppText>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActionDivider} />

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
        <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => setSelected(c)}>
          <Icon name="account-details" size={14} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Chi tiết</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelBtnDanger} onPress={() => { Alert.alert('Khách hàng', `SĐT: ${c.phone || 'Không có'}`); }}>
          <Icon name="phone" size={14} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Gọi điện</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{stats.total} khách hàng</AppText>
          <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm khách</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="account-group" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{stats.total}</AppText>
            <AppText variant="sm" color="#65676B">Tổng khách</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="currency-usd" size={18} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(stats.totalSpent)}</AppText>
            <AppText variant="sm" color="#65676B">Tổng chi tiêu</AppText>
          </View>
        </View>
      </View>

      <View style={styles.searchRow}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm tên hoặc số điện thoại..." />
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<Customer>
              columns={columns}
              data={filtered}
              getRowId={(c) => c.id}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onRowPress={setSelected}
              selectedRowId={selected?.id ?? null}
              onRefresh={load}
              compact
              emptyIcon="account-off"
              emptyTitle="Chưa có khách hàng"
              emptySubtitle="Nhấn + để thêm khách hàng đầu tiên"
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderMobileCustomerCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="account-off"
                title="Chưa có khách hàng"
                subtitle="Nhấn + để thêm khách hàng đầu tiên"
              />
            )
          }
        />
      )}

      {!isWide && <FAB onPress={() => setShowForm(true)} />}

      <FormModal visible={showForm} title="Thêm khách hàng mới" onClose={() => setShowForm(false)} onSave={handleSave} saveLabel="Thêm">
        <View style={{ gap: 10, paddingTop: 4 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên khách hàng *</AppText>
          <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="VD: Nguyễn Văn A" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Số điện thoại *</AppText>
          <TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} style={styles.fieldInput} placeholder="090..." keyboardType="phone-pad" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Email</AppText>
          <TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} style={styles.fieldInput} placeholder="email@example.com" keyboardType="email-address" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Địa chỉ</AppText>
          <TextInput value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} style={styles.fieldInput} placeholder="Địa chỉ giao hàng" placeholderTextColor={colors.text.muted} />
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

  searchRow: {
    paddingHorizontal: 12,
    marginBottom: 8,
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
    backgroundColor: colors.surface.app,
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
  panelDivider: { height: 1, backgroundColor: colors.border.light, marginVertical: 4 },
  fieldInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});

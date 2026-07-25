import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
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
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu khách hàng'); }
  };

  const filtered = useMemo(() => {
    let arr = search ? customers.filter(c => (c.name?.toLowerCase() || '').includes(search.toLowerCase()) || (c.phone || '').includes(search)) : [...customers];
    return arr;
  }, [customers, search]);

  const stats = {
    total: customers.length,
    totalSpent: customers.reduce((s, c) => s + (c.total_spent || 0), 0),
    totalVisits: customers.reduce((s, c) => s + (c.visit_count || 0), 0),
  };

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      title: 'Khách hàng',
      flex: 1,
      sortable: true,
      sortValue: (c) => c.name || '',
      render: (c) => (
        <View>
          <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{c.name}</AppText>
          <AppText variant="sm" color={colors.text.muted}>{c.phone}</AppText>
        </View>
      ),
    },
    {
      key: 'total_spent',
      title: 'Đã chi',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (c) => c.total_spent || 0,
      render: (c) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(c.total_spent || 0)}</AppText>,
    },
    {
      key: 'total_visits',
      title: 'Lượt',
      width: 60,
      align: 'right',
      sortable: true,
      sortValue: (c) => c.visit_count || 0,
      render: (c) => <AppText variant="sm" color={colors.text.primary}>{c.visit_count || 0}</AppText>,
    },
  ];

  const renderPanel = () => {
    const top = [...filtered].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0)).slice(0, 5);
    const maxSpent = Math.max(...top.map(c => c.total_spent || 0), 1);

    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="account-group" size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Thống kê tệp khách hàng</AppText>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { icon: 'account-group', value: stats.total, label: 'Tổng khách' },
            { icon: 'currency-usd', value: formatVND(stats.totalSpent), label: 'Tổng chi' },
            { icon: 'store', value: stats.totalVisits, label: 'Lượt ghé' },
          ].map((s, i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name={s.icon as any} size={14} color={colors.brand.primary} />
                <AppText variant="sm" weight="bold" color={colors.text.primary}>{s.value}</AppText>
              </View>
              <AppText variant="sm" color={colors.text.muted}>{s.label}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.panelDivider} />

        <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Top 5 khách hàng chi tiêu nhiều nhất</AppText>
        {top.map((c, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
            <AppText variant="sm" color={colors.text.primary} style={{ width: 80 }} numberOfLines={1}>{c.name}</AppText>
            <View style={{ flex: 1, height: 8, backgroundColor: colors.surface.app, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(5, ((c.total_spent || 0) / maxSpent) * 100)}%`, height: 8, backgroundColor: colors.brand.primary, borderRadius: 4 }} />
            </View>
            <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ width: 80, textAlign: 'right' }}>{formatVND(c.total_spent || 0)}</AppText>
          </View>
        ))}
      </View>
    );
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="account-group" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{stats.total}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tổng khách</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="currency-usd" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(stats.totalSpent)}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tổng chi tiêu</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="store" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{stats.totalVisits}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Lượt ghé</AppText>
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
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
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
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    marginHorizontal: 8,
    marginVertical: 8,
  },
  statItem: { flex: 1, alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  searchRow: {
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  panelBox: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
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
  fieldInput: { borderRadius: shape.radius.md, paddingHorizontal: 10, paddingVertical: 8, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});

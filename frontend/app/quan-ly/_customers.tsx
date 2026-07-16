import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Customer } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import SearchBar from '../../lib/components/ui/SearchBar';

const API = '/api/v1/quan-ly';
function formatVND(v: number) { return (v || 0).toLocaleString('vi-VN') + 'đ'; }

export default function CustomersScreen() {
  const { openSidebar } = useSidebar();
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
    try { setLoading(true); const data: any = await request(`${API}/customers`); setCustomers(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name || !form.phone) { Alert.alert('Lỗi', 'Tên và SĐT bắt buộc'); return; }
    try { await request(`${API}/customers`, { method: 'POST', body: JSON.stringify(form) }); setShowForm(false); load(); }
    catch { Alert.alert('Lỗi', 'Không thể lưu'); }
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
          <Text style={styles.cellPrimary} numberOfLines={1}>{c.name}</Text>
          <Text style={styles.cellSub}>{c.phone}</Text>
        </View>
      ),
    },
    {
      key: 'total_spent',
      title: 'Đã chi',
      width: 100,
      align: 'right',
      sortable: true,
      sortValue: (c) => c.total_spent || 0,
      render: (c) => <Text style={styles.cellAmount}>{formatVND(c.total_spent || 0)}</Text>,
    },
    {
      key: 'total_visits',
      title: 'Lượt',
      width: 60,
      align: 'right',
      sortable: true,
      sortValue: (c) => c.visit_count || 0,
      render: (c) => <Text style={styles.cellNumber}>{c.visit_count || 0}</Text>,
    },
  ];

  const renderPanel = () => {
    const top = [...filtered].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0)).slice(0, 5);
    const maxSpent = Math.max(...top.map(c => c.total_spent || 0), 1);
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}><Icon name="account-group" size={18} color={'#F97316'} /><Text style={styles.panelHeaderText}>Khách hàng</Text></View>
        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          {[{ icon: 'account-group', value: stats.total, label: 'Tổng' },
            { icon: 'currency-usd', value: formatVND(stats.totalSpent), label: 'Tổng chi' },
            { icon: 'store', value: stats.totalVisits, label: 'Lượt' },
          ].map((s, i) => (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Icon name={s.icon as any} size={14} color={'#737373'} />
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.panelDivider} />
        <Text style={{ ...font.caption, fontWeight: '600', color: '#171717', marginBottom: 4 }}>Top chi tiêu</Text>
        {top.map((c, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12}}>
            <Text style={{ width: 60, ...font.micro, color: '#171717' }} numberOfLines={1}>{c.name}</Text>
            <View style={{ flex: 1, height: 10, backgroundColor: '#F5F5F5', borderRadius: 3 }}>
              <View style={{ width: `${Math.max(5, ((c.total_spent || 0) / maxSpent) * 100)}%`, height: 10, backgroundColor: '#F97316', borderRadius: 3 }} />
            </View>
            <Text style={{ width: 70, textAlign: 'right', ...font.micro, fontWeight: '600', color: '#171717' }}>{formatVND(c.total_spent || 0)}</Text>
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
    <ScreenContainer compact>
      <ScreenHeader title="Khách hàng" subtitle={`${stats.total} khách`}
        onMenuPress={openSidebar} compact />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="account-group" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <Text style={styles.statLabel}>Tổng khách</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="currency-usd" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{formatVND(stats.totalSpent)}</Text>
          </View>
          <Text style={styles.statLabel}>Tổng chi</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="store" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{stats.totalVisits}</Text>
          </View>
          <Text style={styles.statLabel}>Lượt ghé</Text>
        </View>
      </View>
      <View style={styles.searchRow}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm tên hoặc SĐT..." />
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
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
              emptySubtitle="Thêm khách hàng mới"
            />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
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
          emptySubtitle="Thêm khách hàng mới"
        />
      )}
      <FAB onPress={() => setShowForm(true)} />

      <FormModal visible={showForm} title="Thêm khách hàng" onClose={() => setShowForm(false)} onSave={handleSave} saveLabel="Thêm">
        <View style={{ gap: 32, paddingTop: 4 }}>
          <Text style={styles.fieldLabel}>Tên *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="Nguyễn Văn A" />
          <Text style={styles.fieldLabel}>SĐT *</Text><TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} style={styles.fieldInput} placeholder="090..." keyboardType="phone-pad" />
          <Text style={styles.fieldLabel}>Email</Text><TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} style={styles.fieldInput} placeholder="email@example.com" keyboardType="email-address" />
          <Text style={styles.fieldLabel}>Địa chỉ</Text><TextInput value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} style={styles.fieldInput} placeholder="Địa chỉ" />
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
  statValue: { ...font.bodyBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.micro, color: '#737373', lineHeight: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  cellPrimary: { ...font.bodySmall, fontWeight: '600', color: '#171717' },
  cellSub: { ...font.micro, color: '#737373', marginTop: 2 },
  cellAmount: { ...font.bodySmall, fontWeight: '600', color: '#F97316' },
  cellNumber: { ...font.bodySmall, color: '#171717' },
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12},
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.body, fontWeight: '600', color: '#171717' },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  fieldLabel: { ...font.label, color: '#404040', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 8, padding: 12, ...font.body, color: '#171717', backgroundColor: '#FAFAFA' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },
});

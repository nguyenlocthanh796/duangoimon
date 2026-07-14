import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Branch } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import { StatsSkeleton, TableSkeleton } from '../../lib/components/ui/Skeleton';

const API = '/api/v1/quan-ly';

export default function BranchesScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [data, setData] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Branch | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '', is_active: true });
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    try { setLoading(true); const d: any = await request(`${API}/branches`); setData(Array.isArray(d) ? d : (d?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      let va: any = (a as any)[sortKey];
      let vb: any = (b as any)[sortKey];
      if (sortKey === 'is_active') { va = a.is_active ? 1 : 0; vb = b.is_active ? 1 : 0; }
      if (va == null) va = ''; if (vb == null) vb = '';
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const stats = {
    total: data.length,
    active: data.filter(b => b.is_active).length,
  };

  const columns: Column<Branch>[] = [
    {
      key: 'name',
      title: 'Tên chi nhánh',
      flex: 1,
      sortable: true,
      sortValue: (b) => b.name || '',
      render: (b) => <Text style={styles.cellPrimary} numberOfLines={1}>{b.name}</Text>,
    },
    {
      key: 'code',
      title: 'Mã',
      width: 70,
      sortable: true,
      sortValue: (b) => b.code || '',
      render: (b) => <Text style={styles.cellCode}>{b.code}</Text>,
    },
    {
      key: 'is_active',
      title: 'Trạng thái',
      width: 90,
      align: 'center',
      sortable: true,
      sortValue: (b) => b.is_active ? 1 : 0,
      render: (b) => (
        <View style={[styles.statusChip, { backgroundColor: b.is_active ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={{ ...font.micro, fontWeight: '600', color: b.is_active ? '#16A34A' : '#DC2626' }}>{b.is_active ? 'Bật' : 'Tắt'}</Text>
        </View>
      ),
    },
  ];

  const renderPanel = () => {
    if (!selected) return null;
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <View style={[styles.panelIcon, { backgroundColor: '#F97316' }]}>
            <Icon name="store" size={18} color={'#F97316'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle} numberOfLines={1}>{selected.name}</Text>
            <Text style={styles.panelSub}>{selected.code}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={styles.statValue}>{selected.is_active ? 'Hoạt động' : 'Ngừng'}</Text>
            <Text style={styles.statLabel}>Trạng thái</Text>
          </View>
          <View style={styles.barDivider} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={styles.statValue}>{selected.phone || '—'}</Text>
            <Text style={styles.statLabel}>SĐT</Text>
          </View>
        </View>
        {selected.address && (
          <>
            <View style={styles.panelDivider} />
            <Text style={styles.panelAddress}>{selected.address}</Text>
          </>
        )}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
          <TouchableOpacity onPress={() => { setEditing(selected); setForm({ name: selected.name, code: selected.code, address: selected.address || '', phone: selected.phone || '', is_active: selected.is_active }); setShowForm(true); }} style={[styles.panelBtn, { backgroundColor: '#F97316' }]}>
            <Icon name="pencil" size={14} color="#fff" /><Text style={styles.panelBtnText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => del(selected.id)} style={[styles.panelBtn, { backgroundColor: '#DC2626' }]}>
            <Icon name="delete" size={14} color="#fff" /><Text style={styles.panelBtnText}>Xoá</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const del = (id: string) => {
    Alert.alert('Xác nhận', 'Xoá chi nhánh này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => { try { await request(`${API}/branches`, { method: 'DELETE', body: JSON.stringify({ id }) }); setSelected(null); load(); } catch { Alert.alert('Lỗi', 'Xoá thất bại'); } } },
    ]);
  };

  const handleSave = async () => {
    if (!form.name || !form.code) { Alert.alert('Lỗi', 'Tên và mã bắt buộc'); return; }
    try {
      const body = JSON.stringify(form);
      if (editing) { await request(`${API}/branches`, { method: 'PUT', body: JSON.stringify({ ...JSON.parse(body), id: editing.id }) }); }
      else { await request(`${API}/branches`, { method: 'POST', body }); }
      setShowForm(false); setEditing(null); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu'); }
  };

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Chi nhánh" subtitle={`${stats.total} chi nhánh · ${stats.active} hoạt động`}
        onMenuPress={openSidebar} compact
        right={isWide ? undefined : <TouchableOpacity onPress={() => { setEditing(null); setForm({ name: '', code: '', address: '', phone: '', is_active: true }); setShowForm(true); }} style={styles.addBtn}><Icon name="plus" size={18} color="#fff" /></TouchableOpacity>}
      />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="store" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <Text style={styles.statLabel}>Tổng</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="check-circle" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{stats.active}</Text>
          </View>
          <Text style={styles.statLabel}>Hoạt động</Text>
        </View>
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
              <DataTable<Branch>
                columns={columns}
                data={sorted}
                getRowId={(b: Branch) => b.id}
                loading={loading}
                sortKey={sortKey}
                sortDir={sortDir}
                onSortChange={handleSortChange}
                onRowPress={setSelected}
                selectedRowId={selected?.id ?? null}
                onRefresh={load}
                compact
                emptyIcon="store-off"
                emptyTitle="Chưa có chi nhánh"
                emptySubtitle="Thêm chi nhánh đầu tiên"
              />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
          <DataTable<Branch>
            columns={columns}
            data={sorted}
            getRowId={(b: Branch) => b.id}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            onRowPress={setSelected}
            selectedRowId={selected?.id ?? null}
            onRefresh={load}
            compact
            emptyIcon="store-off"
            emptyTitle="Chưa có chi nhánh"
            emptySubtitle="Thêm chi nhánh đầu tiên"
          />

      )}
      {!isWide && <FAB onPress={() => { setEditing(null); setForm({ name: '', code: '', address: '', phone: '', is_active: true }); setShowForm(true); }} />}

      <FormModal visible={showForm} title={editing ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}
        onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 12, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 16}}>
            <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Tên *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="CN Hà Nội" /></View>
            <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Mã *</Text><TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={styles.fieldInput} placeholder="HN" /></View>
          </View>
          <Text style={styles.fieldLabel}>Địa chỉ</Text>
          <TextInput value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} style={styles.fieldInput} placeholder="Số nhà, đường, thành phố" />
          <Text style={styles.fieldLabel}>Số điện thoại</Text>
          <TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} style={styles.fieldInput} placeholder="090..." keyboardType="phone-pad" />
          <TouchableOpacity onPress={() => setForm(p => ({ ...p, is_active: !p.is_active }))} style={[styles.toggleChip, { alignSelf: 'flex-start' }]}>
            <Icon name={form.is_active ? 'toggle-switch' : 'toggle-switch-off'} size={20} color={form.is_active ? '#16A34A' : '#737373'} />
            <Text style={{ ...font.bodySmall, color: '#171717' }}>{form.is_active ? 'Đang hoạt động' : 'Tạm ngừng'}</Text>
          </TouchableOpacity>
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
  statValue: { ...font.bodyBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.micro, color: '#737373', lineHeight: 12 },
  cellPrimary: { ...font.bodySmall, fontWeight: '600', color: '#171717' },
  cellCode: { ...font.caption, color: '#737373' },
  statusChip: { paddingVertical: 3, paddingHorizontal: 12, borderRadius: 999 },
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12},
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  panelTitle: { ...font.body, fontWeight: '600', color: '#171717' },
  panelSub: { ...font.caption, color: '#737373' },
  panelAddress: { ...font.caption, color: '#737373' },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8},
  panelBtnText: { ...font.buttonSmall, fontWeight: '600', color: '#fff' },
  fieldLabel: { ...font.label, color: '#404040', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 8, padding: 12, ...font.body, color: '#171717', backgroundColor: '#FAFAFA' },
  toggleChip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F5F5F5' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },
});

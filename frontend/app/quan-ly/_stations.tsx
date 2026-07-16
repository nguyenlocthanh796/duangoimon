import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Station } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';

const API = '/api/v1/quan-ly';

export default function StationsScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [items, setItems] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [selected, setSelected] = useState<Station | null>(null);
  const [form, setForm] = useState({ name: '', code: '', categories: '', printer_name: '' });
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    try { setLoading(true); const data: any = await request(`${API}/stations`); setItems(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ name: '', code: '', categories: '', printer_name: '' }); setShowForm(true); };
  const openEdit = (s: Station) => { setEditing(s); setForm({ name: s.name, code: s.code, categories: (s.categories || []).join(', '), printer_name: s.printer_name || '' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !form.code) { Alert.alert('Lỗi', 'Tên và mã bắt buộc'); return; }
    try {
      const body = { name: form.name, code: form.code, categories: form.categories.split(',').map(s => s.trim()).filter(Boolean), printer_name: form.printer_name || undefined };
      if (editing) await request(`${API}/stations/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await request(`${API}/stations`, { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu'); }
  };

  const del = (id: string) => { Alert.alert('Xác nhận', 'Xoá trạm này?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { try { await request(`${API}/stations/${id}`, { method: 'DELETE' }); setSelected(null); load(); } catch {} } }]); };

  const stats = { total: items.length, hasPrinter: items.filter(i => i.printer_name).length };

  const columns: Column<Station>[] = [
    {
      key: 'name',
      title: 'Tên trạm',
      flex: 1,
      sortable: true,
      sortValue: (s) => s.name || '',
      render: (s) => <Text style={styles.cellPrimary} numberOfLines={1}>{s.name}</Text>,
    },
    {
      key: 'code',
      title: 'Mã',
      width: 65,
      sortable: true,
      sortValue: (s) => s.code || '',
      render: (s) => <Text style={styles.cellMuted}>{s.code}</Text>,
    },
    {
      key: 'printer',
      title: 'Máy in',
      width: 85,
      align: 'center',
      sortable: true,
      sortValue: (s) => s.printer_name ? 1 : 0,
      render: (s) => s.printer_name ? (
        <View style={[styles.chipSmall, { backgroundColor: '#DCFCE7' }]}>
          <Icon name="printer" size={10} color={'#16A34A'} /><Text style={{ ...font.micro, fontWeight: '600', color: '#16A34A' }}>Có</Text>
        </View>
      ) : <Text style={{ ...font.caption, color: '#737373' }}>—</Text>,
    },
  ];

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}><Icon name="stove" size={18} color={'#F97316'} /><Text style={styles.panelHeaderText}>Trạm bếp</Text></View>
      <View style={{ flexDirection: 'row', gap: 12}}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="stove" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <Text style={styles.statLabel}>Tổng</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="printer" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.hasPrinter}</Text>
          </View>
          <Text style={styles.statLabel}>Có máy in</Text>
        </View>
      </View>
      <View style={styles.panelDivider} />
      {selected ? (
        <View style={{ gap: 12}}>
          <Text style={{ ...font.body, fontWeight: '600', color: '#171717' }}>{selected.name}</Text>
          <Text style={{ ...font.caption, color: '#737373' }}>Mã: {selected.code}</Text>
          <Text style={{ ...font.caption, color: '#737373' }}>Danh mục: {(selected.categories || []).join(', ') || 'Tất cả'}</Text>
          {selected.printer_name && <Text style={{ ...font.caption, color: '#737373' }}>🖨️ {selected.printer_name}</Text>}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            <TouchableOpacity onPress={() => openEdit(selected)} style={[styles.panelBtn, { backgroundColor: '#F97316' }]}><Icon name="pencil" size={14} color="#fff" /><Text style={styles.panelBtnText}>Sửa</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => del(selected.id)} style={[styles.panelBtn, { backgroundColor: '#DC2626' }]}><Icon name="delete" size={14} color="#fff" /><Text style={styles.panelBtnText}>Xoá</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.panelCta} onPress={openNew}><Icon name="plus" size={14} color="#fff" /><Text style={styles.panelCtaText}>Thêm trạm</Text></TouchableOpacity>
      )}
    </View>
  );

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Trạm bếp" subtitle={`${stats.total} trạm · ${stats.hasPrinter} có máy in`}
        onMenuPress={openSidebar} compact
        right={isWide ? undefined : <TouchableOpacity onPress={openNew} style={styles.addBtn}><Icon name="plus" size={18} color="#fff" /></TouchableOpacity>}
      />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="stove" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <Text style={styles.statLabel}>Tổng</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="printer" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.hasPrinter}</Text>
          </View>
          <Text style={styles.statLabel}>Có máy in</Text>
        </View>
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
            <DataTable<Station>
              columns={columns}
              data={items}
              getRowId={(s) => s.id}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onRowPress={setSelected}
              selectedRowId={selected?.id ?? null}
              onRefresh={load}
              compact
              emptyIcon="stove"
              emptyTitle="Chưa có trạm"
              emptySubtitle="Thêm trạm bếp đầu tiên"
            />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
        <DataTable<Station>
          columns={columns}
          data={items}
          getRowId={(s) => s.id}
          loading={loading}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          onRowPress={setSelected}
          selectedRowId={selected?.id ?? null}
          onRefresh={load}
          compact
          emptyIcon="stove"
          emptyTitle="Chưa có trạm"
          emptySubtitle="Thêm trạm bếp đầu tiên"
        />
      )}
      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa trạm' : 'Thêm trạm'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 12, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 16}}>
            <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Tên *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="VD: Bếp chính" /></View>
            <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Mã *</Text><TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={styles.fieldInput} placeholder="B1" /></View>
          </View>
          <Text style={styles.fieldLabel}>Danh mục (phân cách bằng dấu phẩy)</Text>
          <TextInput value={form.categories} onChangeText={v => setForm(p => ({ ...p, categories: v }))} style={styles.fieldInput} placeholder="Món khai vị, Món chính" />
          <Text style={styles.fieldLabel}>Tên máy in</Text>
          <TextInput value={form.printer_name} onChangeText={v => setForm(p => ({ ...p, printer_name: v }))} style={styles.fieldInput} placeholder="Tên máy in" />
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
  statValue: { ...font.bodyBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.micro, color: '#737373', lineHeight: 12 },
  cellPrimary: { ...font.bodySmall, fontWeight: '600', color: '#171717' },
  cellMuted: { ...font.caption, color: '#737373' },
  chipSmall: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999},
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.body, fontWeight: '600', color: '#171717' },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8},
  panelBtnText: { ...font.buttonSmall, fontWeight: '600', color: '#fff' },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#F97316', borderRadius: 8, paddingVertical: 12, minHeight: 44 },
  panelCtaText: { ...font.button, color: '#fff' },
  fieldLabel: { ...font.label, color: '#404040', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 8, padding: 12, ...font.body, color: '#171717', backgroundColor: '#FAFAFA' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },
});

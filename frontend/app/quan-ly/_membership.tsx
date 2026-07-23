import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { MembershipTier } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';

const API = '/api/v1/quan-ly';


export default function MembershipScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MembershipTier | null>(null);
  const [selected, setSelected] = useState<MembershipTier | null>(null);
  const [form, setForm] = useState({ name: '', min_spent: '0', discount_rate: '0', multiplier: '1', color: '', is_active: true });
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    try { setLoading(true); const data: any = await request(`${API}/membership/tiers`); setTiers(Array.isArray(data) ? data : (data?.items || [])); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ name: '', min_spent: '0', discount_rate: '0', multiplier: '1', color: '', is_active: true }); setShowForm(true); };
  const openEdit = (t: MembershipTier) => { setEditing(t); setForm({ name: t.name, min_spent: String(t.min_spent), discount_rate: String(t.discount_rate), multiplier: String(t.multiplier), color: t.color || '', is_active: t.is_active ?? true }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) { Alert.alert('Lỗi', 'Tên hạng bắt buộc'); return; }
    try {
      const body = { ...form, min_spent: Number(form.min_spent), discount_rate: Number(form.discount_rate), multiplier: Number(form.multiplier) };
      if (editing) await request(`${API}/membership/tiers/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await request(`${API}/membership/tiers`, { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu'); }
  };

  const del = (id: string) => { Alert.alert('Xác nhận', 'Xoá hạng này?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { try { await request(`${API}/membership/tiers/${id}`, { method: 'DELETE' }); setSelected(null); load(); } catch {} } }]); };

  const stats = { total: tiers.length, maxDisc: Math.max(...tiers.map(t => t.discount_rate), 0), active: tiers.filter(t => t.is_active).length };

  const columns: Column<MembershipTier>[] = [
    {
      key: 'name',
      title: 'Hạng',
      flex: 1,
      sortable: true,
      sortValue: (t) => t.name || '',
      render: (t) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {t.color ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.color }} /> : null}
          <Text style={styles.cellPrimary} numberOfLines={1}>{t.name}</Text>
        </View>
      ),
    },
    {
      key: 'min_spent',
      title: 'Min chi',
      width: 90,
      align: 'right',
      sortable: true,
      sortValue: (t) => t.min_spent || 0,
      render: (t) => <Text style={styles.cellMuted}>{formatVND(t.min_spent || 0)}</Text>,
    },
    {
      key: 'discount_rate',
      title: 'Giảm',
      width: 65,
      align: 'right',
      sortable: true,
      sortValue: (t) => t.discount_rate || 0,
      render: (t) => <Text style={styles.cellHighlight}>{t.discount_rate}%</Text>,
    },
    {
      key: 'members',
      title: 'TV',
      width: 55,
      align: 'right',
      sortable: true,
      sortValue: (t) => t.member_count || 0,
      render: (t) => <Text style={styles.cellMuted}>{t.member_count || 0}</Text>,
    },
  ];

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}><Icon name="crown" size={18} color={'#F97316'} /><Text style={styles.panelHeaderText}>Hội viên</Text></View>
      <View style={{ flexDirection: 'row', gap: 12}}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="crown" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <Text style={styles.statLabel}>Hạng</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="check-circle" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{stats.active}</Text>
          </View>
          <Text style={styles.statLabel}>Đang dùng</Text>
        </View>
      </View>
      <View style={styles.panelDivider} />
      {selected ? (
        <View style={{ gap: 12}}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12}}>
            {selected.color ? <View style={{ width: 12, height: 12, borderRadius: 16, backgroundColor: selected.color }} /> : null}
            <Text style={{ ...font.md, fontWeight: '600', color: '#171717' }}>{selected.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={styles.panelLabel}>Min chi</Text><Text style={styles.panelValue}>{formatVND(selected.min_spent || 0)}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={styles.panelLabel}>Giảm</Text><Text style={styles.panelValue}>{selected.discount_rate}%</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={styles.panelLabel}>Nhân điểm</Text><Text style={styles.panelValue}>{selected.multiplier}x</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={styles.panelLabel}>Thành viên</Text><Text style={styles.panelValue}>{selected.member_count || 0}</Text></View>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            <TouchableOpacity onPress={() => openEdit(selected)} style={[styles.panelBtn, { backgroundColor: '#F97316' }]}><Icon name="pencil" size={14} color="#fff" /><Text style={styles.panelBtnText}>Sửa</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => del(selected.id)} style={[styles.panelBtn, { backgroundColor: '#DC2626' }]}><Icon name="delete" size={14} color="#fff" /><Text style={styles.panelBtnText}>Xoá</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.panelCta} onPress={openNew}><Icon name="plus" size={14} color="#fff" /><Text style={styles.panelCtaText}>Thêm hạng</Text></TouchableOpacity>
      )}
    </View>
  );

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Hội viên" subtitle={`${stats.active} hạng đang dùng`}
        onMenuPress={openSidebar} compact
        right={isWide ? undefined : <TouchableOpacity onPress={openNew} style={styles.addBtn}><Icon name="plus" size={18} color="#fff" /></TouchableOpacity>}
      />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="crown" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <Text style={styles.statLabel}>Hạng</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="percent" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{stats.maxDisc}%</Text>
          </View>
          <Text style={styles.statLabel}>Giảm tối đa</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="account-group" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{tiers.reduce((s, t) => s + (t.member_count || 0), 0)}</Text>
          </View>
          <Text style={styles.statLabel}>Thành viên</Text>
        </View>
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
            <DataTable<MembershipTier>
              columns={columns}
              data={tiers}
              getRowId={(t) => t.id}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onRowPress={setSelected}
              selectedRowId={selected?.id ?? null}
              onRefresh={load}
              compact
              emptyIcon="crown-outline"
              emptyTitle="Chưa có hạng"
              emptySubtitle="Tạo hạng thành viên đầu tiên"
            />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
        <DataTable<MembershipTier>
          columns={columns}
          data={tiers}
          getRowId={(t) => t.id}
          loading={loading}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          onRowPress={setSelected}
          selectedRowId={selected?.id ?? null}
          onRefresh={load}
          compact
          emptyIcon="crown-outline"
          emptyTitle="Chưa có hạng"
          emptySubtitle="Tạo hạng thành viên đầu tiên"
        />
      )}
      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa hạng' : 'Thêm hạng'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 12, paddingTop: 4 }}>
          <Text style={styles.fieldLabel}>Tên hạng *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="Vàng" />
          <View style={{ flexDirection: 'row', gap: 12}}>
            <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Min chi</Text><TextInput value={form.min_spent} onChangeText={v => setForm(p => ({ ...p, min_spent: v }))} style={styles.fieldInput} keyboardType="decimal-pad" placeholder="0" /></View>
            <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Giảm (%)</Text><TextInput value={form.discount_rate} onChangeText={v => setForm(p => ({ ...p, discount_rate: v }))} style={styles.fieldInput} keyboardType="decimal-pad" placeholder="0" /></View>
            <View style={{ flex: 1 }}><Text style={styles.fieldLabel}>Nhân điểm</Text><TextInput value={form.multiplier} onChangeText={v => setForm(p => ({ ...p, multiplier: v }))} style={styles.fieldInput} keyboardType="decimal-pad" placeholder="1" /></View>
          </View>
          <Text style={styles.fieldLabel}>Màu sắc</Text>
          <TextInput value={form.color} onChangeText={v => setForm(p => ({ ...p, color: v }))} style={styles.fieldInput} placeholder="#FFD700" />
          <TouchableOpacity onPress={() => setForm(p => ({ ...p, is_active: !p.is_active }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12}}>
            <Icon name={form.is_active ? 'toggle-switch' : 'toggle-switch-off'} size={20} color={form.is_active ? '#16A34A' : '#737373'} />
            <Text style={{ ...font.sm, color: '#171717' }}>{form.is_active ? 'Đang áp dụng' : 'Tạm ngừng'}</Text>
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
  statValue: { ...font.mdBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.sm, color: '#737373', lineHeight: 12 },
  cellPrimary: { ...font.sm, fontWeight: '600', color: '#171717' },
  cellMuted: { ...font.sm, color: '#737373' },
  cellHighlight: { ...font.sm, fontWeight: '600', color: '#F97316' },
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12},
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.md, fontWeight: '600', color: '#171717' },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8},
  panelBtnText: { ...font.smBold, fontWeight: '600', color: '#fff' },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#F97316', borderRadius: 8, paddingVertical: 12, minHeight: 44 },
  panelCtaText: { ...font.mdBold, color: '#fff' },
  panelLabel: { ...font.sm, color: '#737373' },
  panelValue: { ...font.sm, fontWeight: '600', color: '#171717' },
  fieldLabel: { ...font.smBold, color: '#404040', marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 8, padding: 12, ...font.md, color: '#171717', backgroundColor: '#FAFAFA' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },
});
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Branch } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';

export default function BranchesScreen() {
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
    catch { setData([]); } finally { setLoading(false); }
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
      render: (b) => <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{b.name}</AppText>,
    },
    {
      key: 'code',
      title: 'Mã',
      width: 70,
      sortable: true,
      sortValue: (b) => b.code || '',
      render: (b) => <AppText variant="sm" color={colors.text.muted}>{b.code}</AppText>,
    },
    {
      key: 'is_active',
      title: 'Trạng thái',
      width: 90,
      align: 'center',
      sortable: true,
      sortValue: (b) => b.is_active ? 1 : 0,
      render: (b) => (
        <View style={[styles.statusChip, { backgroundColor: b.is_active ? colors.brand.primaryBg : colors.surface.app }]}>
          <AppText variant="sm" weight="bold" color={b.is_active ? colors.status.success : colors.text.muted}>{b.is_active ? 'Hoạt động' : 'Tắt'}</AppText>
        </View>
      ),
    },
  ];

  const renderPanel = () => {
    if (!selected) return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="storefront" size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Thống kê chi nhánh</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.text.primary}>{stats.total}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tổng số</AppText>
          </View>
          <View style={styles.barDivider} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{stats.active}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đang mở</AppText>
          </View>
        </View>
        <View style={styles.panelDivider} />
        <TouchableOpacity style={styles.panelCta} onPress={() => { setEditing(null); setForm({ name: '', code: '', address: '', phone: '', is_active: true }); setShowForm(true); }}>
          <Icon name="plus" size={16} color={colors.text.inverse} />
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm chi nhánh</AppText>
        </TouchableOpacity>
      </View>
    );
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="storefront" size={18} color={colors.brand.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{selected.name}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Mã: {selected.code}</AppText>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <AppText variant="sm" weight="bold" color={selected.is_active ? colors.status.success : colors.status.danger}>{selected.is_active ? 'Hoạt động' : 'Tạm ngừng'}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Trạng thái</AppText>
          </View>
          <View style={styles.barDivider} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{selected.phone || '—'}</AppText>
            <AppText variant="sm" color={colors.text.muted}>SĐT</AppText>
          </View>
        </View>
        {selected.address && (
          <>
            <View style={styles.panelDivider} />
            <AppText variant="sm" color={colors.text.secondary}>📍 {selected.address}</AppText>
          </>
        )}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <TouchableOpacity onPress={() => { setEditing(selected); setForm({ name: selected.name, code: selected.code, address: selected.address || '', phone: selected.phone || '', is_active: selected.is_active }); setShowForm(true); }} style={[styles.panelBtn, { backgroundColor: colors.brand.primary }]}>
            <Icon name="pencil" size={14} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => del(selected.id)} style={[styles.panelBtn, { backgroundColor: colors.status.danger }]}>
            <Icon name="delete" size={14} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Xoá</AppText>
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
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="sm" color={colors.text.muted}>{stats.total} chi nhánh</AppText>
          <TouchableOpacity onPress={() => { setEditing(null); setForm({ name: '', code: '', address: '', phone: '', is_active: true }); setShowForm(true); }} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm chi nhánh</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="storefront" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{stats.total}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tổng số</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="check-circle" size={16} color={colors.status.success} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.status.success}>{stats.active}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đang hoạt động</AppText>
          </View>
        </View>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
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
              emptyIcon="storefront-outline"
              emptyTitle="Chưa có chi nhánh"
              emptySubtitle=""
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
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
            emptyIcon="storefront-outline"
            emptyTitle="Chưa có chi nhánh"
            emptySubtitle=""
          />
        </View>
      )}

      <FormModal visible={showForm} title={editing ? 'Sửa chi nhánh' : 'Thêm chi nhánh'}
        onClose={() => { setShowForm(false); setEditing(null); }} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 10, paddingTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên *</AppText>
              <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="CN Hà Nội" placeholderTextColor={colors.text.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Mã *</AppText>
              <TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={styles.fieldInput} placeholder="HN" placeholderTextColor={colors.text.muted} />
            </View>
          </View>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Địa chỉ</AppText>
          <TextInput value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} style={styles.fieldInput} placeholder="Số nhà, đường, thành phố" placeholderTextColor={colors.text.muted} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Số điện thoại</AppText>
          <TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} style={styles.fieldInput} placeholder="090..." keyboardType="phone-pad" placeholderTextColor={colors.text.muted} />
          <TouchableOpacity onPress={() => setForm(p => ({ ...p, is_active: !p.is_active }))} style={styles.toggleChip}>
            <Icon name={form.is_active ? 'toggle-switch' : 'toggle-switch-off'} size={20} color={form.is_active ? colors.status.success : colors.text.muted} />
            <AppText variant="sm" color={colors.text.primary}>{form.is_active ? 'Đang hoạt động' : 'Tạm ngừng'}</AppText>
          </TouchableOpacity>
        </View>
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },

  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  statItem: { flex: 1, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statusChip: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: shape.radius.sm },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: shape.radius.md },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, height: 42 },
  fieldInput: { borderRadius: shape.radius.md, paddingHorizontal: 10, paddingVertical: 8, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
  toggleChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: shape.radius.md, backgroundColor: colors.surface.app },
});

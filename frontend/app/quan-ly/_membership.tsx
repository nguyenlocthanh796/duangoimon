import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { MembershipTier } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';

export default function MembershipScreen() {
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
    if (!form.name) { Alert.alert('Lỗi', 'Tên hạng thành viên là bắt buộc'); return; }
    try {
      const body = { ...form, min_spent: Number(form.min_spent), discount_rate: Number(form.discount_rate), multiplier: Number(form.multiplier) };
      if (editing) await request(`${API}/membership/tiers/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await request(`${API}/membership/tiers`, { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu hạng thành viên'); }
  };

  const del = (id: string) => { Alert.alert('Xác nhận', 'Xoá hạng thành viên này?', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: async () => { try { await request(`${API}/membership/tiers/${id}`, { method: 'DELETE' }); setSelected(null); load(); } catch {} } }]); };

  const stats = { total: tiers.length, maxDisc: Math.max(...tiers.map(t => t.discount_rate), 0), active: tiers.filter(t => t.is_active).length };

  const columns: Column<MembershipTier>[] = [
    {
      key: 'name',
      title: 'Hạng thành viên',
      flex: 1,
      sortable: true,
      sortValue: (t) => t.name || '',
      render: (t) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {t.color ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.color }} /> : null}
          <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{t.name}</AppText>
        </View>
      ),
    },
    {
      key: 'min_spent',
      title: 'Tối thiểu chi',
      width: 100,
      align: 'right',
      sortable: true,
      sortValue: (t) => t.min_spent || 0,
      render: (t) => <AppText variant="sm" color={colors.text.secondary}>{formatVND(t.min_spent || 0)}</AppText>,
    },
    {
      key: 'discount_rate',
      title: 'Giảm (%)',
      width: 75,
      align: 'right',
      sortable: true,
      sortValue: (t) => t.discount_rate || 0,
      render: (t) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{t.discount_rate}%</AppText>,
    },
    {
      key: 'members',
      title: 'Thành viên',
      width: 80,
      align: 'right',
      sortable: true,
      sortValue: (t) => t.member_count || 0,
      render: (t) => <AppText variant="sm" color={colors.text.primary}>{t.member_count || 0}</AppText>,
    },
  ];

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="crown" size={18} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>Thống kê hạng hội viên</AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="crown" size={14} color={colors.brand.primary} />
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{stats.total}</AppText>
          </View>
          <AppText variant="sm" color={colors.text.muted}>Tổng hạng</AppText>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="check-circle" size={14} color={colors.status.success} />
            <AppText variant="sm" weight="bold" color={colors.status.success}>{stats.active}</AppText>
          </View>
          <AppText variant="sm" color={colors.text.muted}>Đang áp dụng</AppText>
        </View>
      </View>
      <View style={styles.panelDivider} />
      {selected ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {selected.color ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selected.color }} /> : null}
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{selected.name}</AppText>
          </View>
          <DetailRow label="Min chi tiêu" value={formatVND(selected.min_spent || 0)} />
          <DetailRow label="Tỷ lệ giảm giá" value={`${selected.discount_rate}%`} />
          <DetailRow label="Hệ số tích điểm" value={`${selected.multiplier}x`} />
          <DetailRow label="Số lượng thành viên" value={`${selected.member_count || 0} khách`} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity onPress={() => openEdit(selected)} style={[styles.panelBtn, { backgroundColor: colors.brand.primary }]}>
              <Icon name="pencil" size={14} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Sửa</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => del(selected.id)} style={[styles.panelBtn, { backgroundColor: colors.status.dangerBg }]}>
              <Icon name="delete" size={14} color={colors.status.danger} />
              <AppText variant="sm" weight="bold" color={colors.status.danger}>Xoá</AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.panelCta} onPress={openNew}>
          <Icon name="plus" size={16} color={colors.text.inverse} />
          <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm hạng mới</AppText>
        </TouchableOpacity>
      )}
    </View>
  );

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="crown" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{stats.total}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tổng hạng</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="percent" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>{stats.maxDisc}%</AppText>
            <AppText variant="sm" color={colors.text.muted}>Giảm tối đa</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="account-group" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{tiers.reduce((s, t) => s + (t.member_count || 0), 0)}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Thành viên</AppText>
          </View>
        </View>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
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
              emptyTitle="Chưa có hạng thành viên"
              emptySubtitle="Tạo hạng thành viên đầu tiên"
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
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
            emptyTitle="Chưa có hạng thành viên"
            emptySubtitle="Tạo hạng thành viên đầu tiên"
          />
        </View>
      )}
      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa hạng thành viên' : 'Thêm hạng thành viên'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 10, paddingTop: 4 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên hạng *</AppText>
          <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="VD: Kim Cương" placeholderTextColor={colors.text.muted} />
          
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Min chi (VNĐ)</AppText>
              <TextInput value={form.min_spent} onChangeText={v => setForm(p => ({ ...p, min_spent: v }))} style={styles.fieldInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.text.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Giảm (%)</AppText>
              <TextInput value={form.discount_rate} onChangeText={v => setForm(p => ({ ...p, discount_rate: v }))} style={styles.fieldInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.text.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Hệ số điểm</AppText>
              <TextInput value={form.multiplier} onChangeText={v => setForm(p => ({ ...p, multiplier: v }))} style={styles.fieldInput} keyboardType="decimal-pad" placeholder="1" placeholderTextColor={colors.text.muted} />
            </View>
          </View>

          <AppText variant="sm" weight="bold" color={colors.text.primary}>Màu đại diện (Hex Code)</AppText>
          <TextInput value={form.color} onChangeText={v => setForm(p => ({ ...p, color: v }))} style={styles.fieldInput} placeholder="#FFD700" placeholderTextColor={colors.text.muted} />

          <TouchableOpacity onPress={() => setForm(p => ({ ...p, is_active: !p.is_active }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Icon name={form.is_active ? 'toggle-switch' : 'toggle-switch-off'} size={24} color={form.is_active ? colors.status.success : colors.icon.muted} />
            <AppText variant="sm" color={colors.text.primary}>{form.is_active ? 'Đang áp dụng' : 'Tạm ngừng'}</AppText>
          </TouchableOpacity>
        </View>
      </FormModal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText variant="sm" color={colors.text.muted}>{label}</AppText>
      <AppText variant="sm" weight="bold" color={colors.text.primary}>{value}</AppText>
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
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: shape.radius.md },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, height: 44 },
  fieldInput: { borderRadius: shape.radius.md, paddingHorizontal: 10, paddingVertical: 8, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});
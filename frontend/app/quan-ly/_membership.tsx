import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, FlatList } from 'react-native';
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
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

export default function MembershipScreen() {
  const { isWide } = useResponsive();
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MembershipTier | null>(null);
  const [selected, setSelected] = useState<MembershipTier | null>(null);
  const [form, setForm] = useState({ name: '', min_spent: '0', discount_rate: '0', multiplier: '1', color: '#F97316', is_active: true });
  const [sortKey, setSortKey] = useState<string>('min_spent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await request(`${API}/membership-tiers`);
      const list = Array.isArray(data) ? data : (data?.items || []);
      setTiers(list);
      if (list.length > 0 && !selected) setSelected(list[0]);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = tiers.length;
    const maxDisc = Math.max(0, ...tiers.map(t => t.discount_rate || 0));
    const totalMembers = tiers.reduce((s, t) => s + (t.member_count || 0), 0);
    return { total, maxDisc, totalMembers };
  }, [tiers]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', min_spent: '0', discount_rate: '0', multiplier: '1', color: '#F97316', is_active: true });
    setShowForm(true);
  };

  const openEdit = (t: MembershipTier) => {
    setEditing(t);
    setForm({
      name: t.name,
      min_spent: String(t.min_spent || 0),
      discount_rate: String(t.discount_rate || 0),
      multiplier: String(t.multiplier || 1),
      color: t.color || '#F97316',
      is_active: t.is_active ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { Alert.alert('Lỗi', 'Tên hạng là bắt buộc'); return; }
    try {
      const payload = {
        name: form.name,
        min_spent: parseFloat(form.min_spent) || 0,
        discount_rate: parseFloat(form.discount_rate) || 0,
        multiplier: parseFloat(form.multiplier) || 1,
        color: form.color,
        is_active: form.is_active,
      };

      if (editing) {
        await request(`${API}/membership-tiers/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request(`${API}/membership-tiers`, { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu hạng thành viên'); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xóa hạng thành viên', `Bạn có chắc muốn xóa hạng "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await request(`${API}/membership-tiers/${id}`, { method: 'DELETE' });
            load();
          } catch { Alert.alert('Lỗi', 'Không thể xóa'); }
        },
      },
    ]);
  };

  const columns: Column<MembershipTier>[] = [
    {
      key: 'name',
      title: 'Hạng thành viên',
      flex: 1,
      render: (t) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {t.color ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.color }} /> : null}
          <AppText variant="sm" weight="bold" color={colors.text.primary}>{t.name}</AppText>
        </View>
      ),
    },
    {
      key: 'min_spent',
      title: 'Min chi tiêu',
      width: 120,
      align: 'right',
      sortable: true,
      sortValue: (t) => t.min_spent || 0,
      render: (t) => <AppText variant="sm" color={colors.text.secondary}>{formatVND(t.min_spent)}</AppText>,
    },
    {
      key: 'discount_rate',
      title: 'Giảm giá',
      width: 80,
      align: 'right',
      sortable: true,
      sortValue: (t) => t.discount_rate || 0,
      render: (t) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{t.discount_rate}%</AppText>,
    },
  ];

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const renderPanel = () => {
    if (!selected) return null;
    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="crown" size={20} color={selected.color || colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ flex: 1 }}>{selected.name}</AppText>
          <View style={[styles.statusBadge, { backgroundColor: selected.is_active ? '#ECFDF5' : colors.surface.app }]}>
            <AppText variant="sm" weight="bold" color={selected.is_active ? colors.status.success : colors.text.muted}>
              {selected.is_active ? 'Hoạt động' : 'Tạm dừng'}
            </AppText>
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <AppText variant="sm" color={colors.text.secondary}>Min chi tiêu: <AppText variant="sm" weight="bold" color={colors.text.primary}>{formatVND(selected.min_spent)}</AppText></AppText>
          <AppText variant="sm" color={colors.text.secondary}>Ưu đãi giảm giá: <AppText variant="sm" weight="bold" color={colors.brand.primary}>{selected.discount_rate}%</AppText></AppText>
          <AppText variant="sm" color={colors.text.secondary}>Hệ số tích điểm: <AppText variant="sm" weight="bold" color={colors.text.primary}>x{selected.multiplier || 1}</AppText></AppText>
          <AppText variant="sm" color={colors.text.secondary}>Số thành viên: <AppText variant="sm" weight="bold" color={colors.text.primary}>{selected.member_count || 0} người</AppText></AppText>
        </View>

        <View style={styles.panelDivider} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => openEdit(selected)} style={[styles.panelBtn, { backgroundColor: colors.brand.primary, flex: 1 }]}>
            <Icon name="pencil" size={14} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Chỉnh sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(selected.id, selected.name)} style={[styles.panelBtn, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="delete" size={14} color={colors.status.danger} />
            <AppText variant="sm" weight="bold" color={colors.status.danger}>Xoá</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMobileTierCard = ({ item: t }: { item: MembershipTier }) => (
    <View style={styles.itemMobile}>
      <TouchableOpacity style={styles.cardHeaderRow} onPress={() => setSelected(t)} activeOpacity={0.8}>
        <View style={[styles.avatarCircle, { backgroundColor: t.color ? `${t.color}20` : '#FFF7ED' }]}>
          <Icon name="crown" size={20} color={t.color || colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="md" weight="bold" color="#050505">{t.name}</AppText>
            <View style={[styles.statusBadge, { backgroundColor: t.is_active ? '#ECFDF5' : colors.surface.app }]}>
              <AppText variant="sm" weight="bold" color={t.is_active ? colors.status.success : colors.text.muted}>
                {t.is_active ? 'Hoạt động' : 'Tạm ẩn'}
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <AppText variant="sm" color="#65676B">Min: {formatVND(t.min_spent)}</AppText>
            <AppText variant="sm" color="#65676B">· Điểm x{t.multiplier || 1}</AppText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>-{t.discount_rate}%</AppText>
          <AppText variant="sm" color="#65676B">Giảm giá</AppText>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActionDivider} />

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
        <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => openEdit(t)}>
          <Icon name="pencil" size={14} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Chỉnh sửa</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelBtnDanger} onPress={() => handleDelete(t.id, t.name)}>
          <Icon name="trash-can-outline" size={14} color={colors.status.danger} />
          <AppText variant="sm" weight="bold" color={colors.status.danger}>Xóa</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{stats.total} hạng thành viên</AppText>
          <TouchableOpacity onPress={openNew} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm hạng</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="crown" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{stats.total}</AppText>
            <AppText variant="sm" color="#65676B">Tổng hạng VIP</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="percent" size={18} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{stats.maxDisc}%</AppText>
            <AppText variant="sm" color="#65676B">Giảm tối đa</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="account-group" size={18} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#2563EB">{stats.totalMembers}</AppText>
            <AppText variant="sm" color="#65676B">Thành viên</AppText>
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
        <FlatList
          data={tiers}
          keyExtractor={(item) => item.id}
          renderItem={renderMobileTierCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="crown-outline"
                title="Chưa có hạng thành viên"
                subtitle="Tạo hạng thành viên đầu tiên"
              />
            )
          }
        />
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
            <AppText variant="sm" color={colors.text.primary}>Đang hoạt động</AppText>
          </TouchableOpacity>
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

  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
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
    backgroundColor: '#FEE2E2',
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
  panelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, height: 44 },
  fieldInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});
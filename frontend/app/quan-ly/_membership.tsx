import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

export interface MembershipTier {
  id: string;
  name: string;
  min_spend: number;
  discount_pct: number;
  color?: string;
  icon?: string;
}

function generateFallbackTiers(): MembershipTier[] {
  return [
    { id: 't1', name: 'Thành Viên Bạc (Silver)', min_spend: 1000000, discount_pct: 5, color: '#64748B', icon: 'medal-outline' },
    { id: 't2', name: 'Thành Viên Vàng (Gold)', min_spend: 3000000, discount_pct: 10, color: '#D97706', icon: 'medal' },
    { id: 't3', name: 'Thành Viên Bạch Kim (Platinum)', min_spend: 5000000, discount_pct: 15, color: '#2563EB', icon: 'crown-outline' },
    { id: 't4', name: 'Thành Viên VIP Kim Cương (Diamond)', min_spend: 10000000, discount_pct: 20, color: '#9333EA', icon: 'crown' },
  ];
}

export default function MembershipScreen() {
  const { isWide } = useResponsive();
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);
  const [form, setForm] = useState({ name: '', min_spend: '', discount_pct: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await request(`${API}/membership-tiers`);
      const list = Array.isArray(data) ? data : (data?.items || []);
      if (list && list.length > 0) {
        setTiers(list);
      } else {
        setTiers(generateFallbackTiers());
      }
    } catch {
      setTiers(generateFallbackTiers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingTier(null); setForm({ name: '', min_spend: '', discount_pct: '' }); setShowForm(true); };
  const openEdit = (t: MembershipTier) => {
    setEditingTier(t);
    setForm({ name: t.name, min_spend: String(t.min_spend || 0), discount_pct: String(t.discount_pct || 0) });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.discount_pct) { Alert.alert('Lỗi', 'Tên và % giảm giá là bắt buộc'); return; }
    try {
      const payload = {
        name: form.name,
        min_spend: parseFloat(form.min_spend) || 0,
        discount_pct: parseFloat(form.discount_pct) || 0,
      };
      if (editingTier) {
        await request(`${API}/membership-tiers/${editingTier.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request(`${API}/membership-tiers`, { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu hạng thành viên'); }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xác nhận xóa', `Xóa hạng thành viên "${name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try { await request(`${API}/membership-tiers/${id}`, { method: 'DELETE' }); load(); }
        catch { Alert.alert('Lỗi', 'Không thể xóa hạng thành viên'); }
      }},
    ]);
  };

  const columns: Column<MembershipTier>[] = [
    {
      key: 'name',
      title: 'Hạng thành viên',
      flex: 1,
      render: (t) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.avatarCircle, { backgroundColor: '#FEF3C7', width: 36, height: 36, borderRadius: 18 }]}>
            <Icon name={(t.icon || 'crown') as any} size={20} color={t.color || colors.brand.primary} />
          </View>
          <AppText variant="sm" weight="bold" color="#050505" numberOfLines={1}>{t.name}</AppText>
        </View>
      ),
    },
    {
      key: 'min_spend',
      title: 'Mức chi tiêu tối thiểu',
      width: 160,
      align: 'right',
      sortable: true,
      sortValue: (t) => t.min_spend || 0,
      render: (t) => <AppText variant="sm" color="#050505">{formatVND(t.min_spend || 0)}</AppText>,
    },
    {
      key: 'discount_pct',
      title: 'Ưu đãi giảm giá',
      width: 130,
      align: 'right',
      sortable: true,
      sortValue: (t) => t.discount_pct || 0,
      render: (t) => (
        <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-end' }}>
          <AppText variant="sm" weight="bold" color={colors.status.success}>Giảm {t.discount_pct}%</AppText>
        </View>
      ),
    },
  ];

  const maxDiscount = useMemo(() => {
    return Math.max(0, ...tiers.map(t => t.discount_pct || 0));
  }, [tiers]);

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="crown" size={20} color={colors.brand.primary} />
        <AppText variant="md" weight="bold" color="#050505">Quy Tắc Tích Điểm & Hạng VIP</AppText>
      </View>

      <View style={{ gap: 10, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.brand.primaryBg, padding: 12, borderRadius: 12 }}>
          <AppText variant="sm" color="#65676B">Tổng số hạng hội viên</AppText>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>{tiers.length} hạng</AppText>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12 }}>
          <AppText variant="sm" color="#65676B">Mức giảm giá tối đa</AppText>
          <AppText variant="md" weight="bold" color={colors.status.success}>Giảm {maxDiscount}%</AppText>
        </View>
      </View>

      <View style={styles.panelDivider} />

      <AppText variant="sm" weight="bold" color="#050505">Danh Sách Quyền Lợi Hạng VIP</AppText>
      <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
        {tiers.map((t, i) => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name={(t.icon || 'crown') as any} size={18} color={t.color || colors.brand.primary} />
              <AppText variant="sm" weight="bold" color="#050505">{t.name}</AppText>
            </View>
            <AppText variant="sm" weight="bold" color={colors.status.success}>Giảm {t.discount_pct}%</AppText>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.panelCta} onPress={openAdd}>
        <Icon name="plus" size={16} color={colors.text.inverse} />
        <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm hạng thành viên</AppText>
      </TouchableOpacity>
    </View>
  );

  const renderMobileTierCard = ({ item: t }: { item: MembershipTier }) => (
    <View style={styles.itemMobile}>
      <View style={styles.cardHeaderRow}>
        <View style={[styles.avatarCircle, { backgroundColor: '#FEF3C7' }]}>
          <Icon name={(t.icon || 'crown') as any} size={22} color={t.color || colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{t.name}</AppText>
          <AppText variant="sm" color="#65676B" style={{ marginTop: 2 }}>
            Tối thiểu: {formatVND(t.min_spend || 0)}
          </AppText>
        </View>
        <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
          <AppText variant="md" weight="bold" color={colors.status.success}>Giảm {t.discount_pct}%</AppText>
        </View>
      </View>

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
      {/* Top Mobile Header */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{tiers.length} hạng thành viên</AppText>
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm hạng</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* 📊 Native App Style KPI Widget Cards Strip */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="crown" size={20} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{tiers.length} hạng</AppText>
            <AppText variant="sm" color="#65676B">Tổng hạng VIP</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="percent" size={20} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>Giảm {maxDiscount}%</AppText>
            <AppText variant="sm" color="#65676B">Giảm tối đa</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="account-group" size={20} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#2563EB">Tự động tích điểm</AppText>
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
              onRefresh={load}
              compact
              emptyIcon="crown-outline"
              emptyTitle="Chưa có hạng thành viên"
              emptySubtitle="Nhấn + để tạo hạng thành viên đầu tiên"
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <FlatList
          data={tiers}
          keyExtractor={(t) => t.id}
          renderItem={renderMobileTierCard}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="crown-outline"
                title="Chưa có hạng thành viên"
                subtitle="Nhấn + để tạo hạng thành viên đầu tiên"
              />
            )
          }
        />
      )}

      {!isWide && <FAB onPress={openAdd} />}

      <FormModal
        visible={showForm}
        title={editingTier ? 'Sửa hạng thành viên' : 'Thêm hạng thành viên'}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      >
        <View style={{ gap: 12 }}>
          <TextInput style={styles.input} placeholder="Tên hạng (VD: VIP Vàng) (*)" value={form.name} onChangeText={(v) => setForm(f => ({ ...f, name: v }))} />
          <TextInput style={styles.input} placeholder="Mức chi tiêu tối thiểu (VNĐ)" keyboardType="numeric" value={form.min_spend} onChangeText={(v) => setForm(f => ({ ...f, min_spend: v }))} />
          <TextInput style={styles.input} placeholder="Tỷ lệ giảm giá (%) (*)" keyboardType="numeric" value={form.discount_pct} onChangeText={(v) => setForm(f => ({ ...f, discount_pct: v }))} />
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
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: 999, height: 44, marginTop: 4 },
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
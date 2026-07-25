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
type TabType = 'voucher' | 'rule';

export default function PromoScreen() {
  const { isWide } = useResponsive();
  const [tab, setTab] = useState<TabType>('voucher');
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [sortKey, setSortKey] = useState<string>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [form, setForm] = useState({
    code: '', name: '', discount_type: 'percent', discount_value: '10', min_order: '0', max_discount: '0', is_active: true,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [vRes, rRes]: any[] = await Promise.all([
        request(`${API}/promotions/vouchers`).catch(() => []),
        request(`${API}/promotions/rules`).catch(() => []),
      ]);
      setVouchers(Array.isArray(vRes) ? vRes : (vRes?.items || []));
      setRules(Array.isArray(rRes) ? rRes : (rRes?.items || []));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = tab === 'voucher' ? vouchers : rules;

  const stats = useMemo(() => {
    const vCount = vouchers.length;
    const rCount = rules.length;
    const active = vouchers.filter(v => v.is_active).length + rules.filter(r => r.is_active).length;
    const used = vouchers.reduce((s, v) => s + (v.used_count || 0), 0);
    return { vouchers: vCount, rules: rCount, active, used };
  }, [vouchers, rules]);

  const openNew = () => {
    setEditing(null);
    setForm({ code: '', name: '', discount_type: 'percent', discount_value: '10', min_order: '0', max_discount: '0', is_active: true });
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      code: item.code || '',
      name: item.name || '',
      discount_type: item.discount_type || 'percent',
      discount_value: String(item.discount_value || 10),
      min_order: String(item.min_order || 0),
      max_discount: String(item.max_discount || 0),
      is_active: item.is_active ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const isV = tab === 'voucher';
    if (isV && !form.code) { Alert.alert('Lỗi', 'Mã voucher là bắt buộc'); return; }
    if (!isV && !form.name) { Alert.alert('Lỗi', 'Tên quy tắc là bắt buộc'); return; }

    const path = isV ? 'promotions/vouchers' : 'promotions/rules';
    const payload = {
      ...form,
      discount_value: parseFloat(form.discount_value) || 0,
      min_order: parseFloat(form.min_order) || 0,
      max_discount: parseFloat(form.max_discount) || 0,
    };

    try {
      if (editing) {
        await request(`${API}/${path}/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request(`${API}/${path}`, { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu chương trình khuyến mãi'); }
  };

  const handleDelete = (id: string, label: string) => {
    const path = tab === 'voucher' ? 'promotions/vouchers' : 'promotions/rules';
    Alert.alert('Xóa khuyến mãi', `Bạn có chắc muốn xóa "${label}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await request(`${API}/${path}/${id}`, { method: 'DELETE' });
            load();
          } catch { Alert.alert('Lỗi', 'Không thể xóa'); }
        },
      },
    ]);
  };

  const columns: Column<any>[] = [
    {
      key: 'code',
      title: tab === 'voucher' ? 'Mã Voucher' : 'Tên quy tắc',
      flex: 1,
      render: (i) => (
        <View>
          <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{i.code || i.name}</AppText>
          {i.name && i.code ? <AppText variant="sm" color={colors.text.muted}>{i.name}</AppText> : null}
        </View>
      ),
    },
    {
      key: 'discount_value',
      title: 'Mức giảm',
      width: 100,
      align: 'right',
      render: (i) => (
        <AppText variant="sm" weight="bold" color={colors.brand.primary}>
          {i.discount_type === 'percent' ? `${i.discount_value}%` : formatVND(i.discount_value)}
        </AppText>
      ),
    },
    {
      key: 'is_active',
      title: 'Trạng thái',
      width: 90,
      render: (i) => (
        <View style={[styles.statusBadge, { backgroundColor: i.is_active ? '#ECFDF5' : colors.surface.app }]}>
          <AppText variant="sm" weight="bold" color={i.is_active ? colors.status.success : colors.text.muted}>
            {i.is_active ? 'Bật' : 'Tắt'}
          </AppText>
        </View>
      ),
    },
  ];

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="ticket-percent-outline" size={20} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>Thống kê khuyến mãi</AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText variant="md" weight="bold" color={colors.text.primary}>{stats.vouchers}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Voucher</AppText>
        </View>
        <View style={styles.panelDividerV} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText variant="md" weight="bold" color={colors.status.success}>{stats.active}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Hoạt động</AppText>
        </View>
        <View style={styles.panelDividerV} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText variant="md" weight="bold" color={colors.text.primary}>{stats.rules}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Quy tắc</AppText>
        </View>
      </View>
      <View style={styles.panelDivider} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="history" size={16} color={colors.icon.muted} />
        <AppText variant="sm" color={colors.text.secondary}>Đã áp dụng {stats.used} lượt sử dụng</AppText>
      </View>
    </View>
  );

  const renderMobilePromoCard = ({ item: i }: { item: any }) => (
    <View style={styles.itemMobile}>
      <TouchableOpacity style={styles.cardHeaderRow} onPress={() => openEdit(i)} activeOpacity={0.8}>
        <View style={[styles.avatarCircle, { backgroundColor: '#FFF7ED' }]}>
          <Icon name="ticket-percent-outline" size={20} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="md" weight="bold" color="#050505">{i.code || i.name}</AppText>
            <View style={[styles.statusBadge, { backgroundColor: i.is_active ? '#ECFDF5' : colors.surface.app }]}>
              <AppText variant="sm" weight="bold" color={i.is_active ? colors.status.success : colors.text.muted}>
                {i.is_active ? 'Đang chạy' : 'Đã tạm dừng'}
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <AppText variant="sm" color="#65676B">{i.name || i.code}</AppText>
            {i.min_order > 0 ? <AppText variant="sm" color="#65676B">· Đơn từ {formatVND(i.min_order)}</AppText> : null}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>
            {i.discount_type === 'percent' ? `-${i.discount_value}%` : `-${formatVND(i.discount_value)}`}
          </AppText>
          <AppText variant="sm" color="#65676B">Giảm giá</AppText>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActionDivider} />

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
        <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => openEdit(i)}>
          <Icon name="pencil" size={14} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Chỉnh sửa</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.panelBtnDanger} onPress={() => handleDelete(i.id, i.code || i.name)}>
          <Icon name="trash-can-outline" size={14} color={colors.status.danger} />
          <AppText variant="sm" weight="bold" color={colors.status.danger}>Xóa</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{items.length} chương trình</AppText>
          <TouchableOpacity onPress={openNew} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm KM</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="ticket-outline" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{stats.vouchers}</AppText>
            <AppText variant="sm" color="#65676B">Tổng Voucher</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="check-circle-outline" size={18} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{stats.active}</AppText>
            <AppText variant="sm" color="#65676B">Hoạt động</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="history" size={18} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#2563EB">{stats.used}</AppText>
            <AppText variant="sm" color="#65676B">Đã sử dụng</AppText>
          </View>
        </View>
      </View>

      {/* Sub-filter tabs */}
      <View style={{ marginVertical: 4, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {(['voucher', 'rule'] as const).map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Icon name={t === 'voucher' ? 'ticket-outline' : 'sale'} size={14} color={active ? colors.brand.primary : '#65676B'} />
                <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                  {t === 'voucher' ? 'Voucher' : 'Quy tắc'} ({t === 'voucher' ? vouchers.length : rules.length})
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<any>
              columns={columns}
              data={items}
              getRowId={(i) => i.id}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onRefresh={load}
              compact
              emptyIcon="ticket-outline"
              emptyTitle="Chưa có khuyến mãi nào"
              emptySubtitle="Nhấn + để thêm khuyến mãi đầu tiên"
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderMobilePromoCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="ticket-outline"
                title="Chưa có khuyến mãi nào"
                subtitle="Nhấn + để thêm khuyến mãi đầu tiên"
              />
            )
          }
        />
      )}

      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi mới'}
        onClose={() => setShowForm(false)} onSave={handleSave} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 10, paddingTop: 4 }}>
          {tab === 'voucher' ? (
            <>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Mã Voucher *</AppText>
              <TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v.toUpperCase() }))} style={styles.fieldInput} placeholder="VD: KM50K" placeholderTextColor={colors.text.muted} />
            </>
          ) : null}

          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên chương trình *</AppText>
          <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="VD: Giảm 10% Hè Rực Rỡ" placeholderTextColor={colors.text.muted} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Mức giảm</AppText>
              <TextInput value={form.discount_value} onChangeText={v => setForm(p => ({ ...p, discount_value: v }))} style={styles.fieldInput} keyboardType="decimal-pad" placeholder="10" placeholderTextColor={colors.text.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Đơn tối thiểu</AppText>
              <TextInput value={form.min_order} onChangeText={v => setForm(p => ({ ...p, min_order: v }))} style={styles.fieldInput} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.text.muted} />
            </View>
          </View>

          <TouchableOpacity onPress={() => setForm(p => ({ ...p, is_active: !p.is_active }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <Icon name={form.is_active ? 'toggle-switch' : 'toggle-switch-off'} size={24} color={form.is_active ? colors.status.success : colors.icon.muted} />
            <AppText variant="sm" color={colors.text.primary}>Đang kích hoạt</AppText>
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
    justify: 'center',
  },

  /* Filter chips */
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
  },
  chipActive: {
    backgroundColor: colors.brand.primaryBg,
    borderWidth: 1,
    borderColor: '#FFEDD5',
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
    justify: 'center',
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
    justify: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },
  panelBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
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
  panelDividerV: { width: 1, backgroundColor: colors.border.light },
  fieldInput: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
});
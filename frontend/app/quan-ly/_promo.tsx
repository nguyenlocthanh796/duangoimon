import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { Voucher, PromoRule } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import AppText from '../../lib/components/ui/AppText';

export default function PromoScreen() {
  const { isWide } = useResponsive();
  const [tab, setTab] = useState<'voucher' | 'rule'>('voucher');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [rules, setRules] = useState<PromoRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: '', name: '', type: 'percent', value: '0', min_order: '0', valid_from: '', valid_until: '' });
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    try { setLoading(true); const [v, r] = await Promise.all([request<Voucher[]>('/api/v1/quan-ly/promo/vouchers'), request<PromoRule[]>('/api/v1/quan-ly/promo/rules')]); setVouchers(v); setRules(r); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const items: any[] = tab === 'voucher' ? vouchers : rules;
  const openNew = () => { setEditing(null); setForm({ code: '', name: '', type: 'percent', value: '0', min_order: '0', valid_from: '', valid_until: '' }); setShowForm(true); };

  const toggleActive = async (item: any) => {
    try {
      const isV = tab === 'voucher';
      await request(`/api/v1/quan-ly/promo/${isV ? 'vouchers' : 'rules'}/${item.id}`, { method: 'PUT', body: JSON.stringify({ is_active: !item.is_active }) });
      load();
    } catch {}
  };

  const stats = {
    vouchers: vouchers.length,
    rules: rules.length,
    active: vouchers.filter(v => v.is_active).length,
    used: vouchers.reduce((s, v) => s + (v.used_count || 0), 0),
  };

  const voucherColumns: Column<any>[] = [
    {
      key: 'name',
      title: 'Tên / Mã Voucher',
      flex: 1,
      sortable: true,
      sortValue: (i) => i.name || i.code || '',
      render: (i) => (
        <TouchableOpacity onPress={() => { setEditing(i); setForm({ code: i.code || '', name: i.name || '', type: i.type || 'percent', value: String(i.value || '0'), min_order: String(i.min_order || '0'), valid_from: i.valid_from || '', valid_until: i.valid_until || '' }); setShowForm(true); }} style={{ flex: 1 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{i.name || i.code}</AppText>
          <AppText variant="sm" color={colors.text.muted}>{i.code}</AppText>
        </TouchableOpacity>
      ),
    },
    {
      key: 'value',
      title: 'Giá trị',
      width: 100,
      align: 'center',
      sortable: true,
      sortValue: (i) => parseFloat(i.value || '0'),
      render: (i) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{tab === 'voucher' ? (i.type === 'percent' ? `${i.value}%` : `${Number(i.value).toLocaleString('vi-VN')}đ`) : (i.type || '-')}</AppText>,
    },
    {
      key: 'date',
      title: 'Hiệu lực',
      width: 95,
      align: 'center',
      sortable: true,
      sortValue: (i) => i.valid_from || '',
      render: (i) => {
        const expiresSoon = i.valid_until && new Date(i.valid_until) < new Date(Date.now() + 7 * 86400000);
        return <AppText variant="sm" color={expiresSoon ? colors.status.danger : colors.text.muted}>{i.valid_from?.slice(0, 10) || '—'}</AppText>;
      },
    },
    {
      key: 'active',
      title: 'Trạng thái',
      width: 80,
      align: 'center',
      sortable: false,
      render: (i) => {
        const active = i.is_active !== false;
        return (
          <TouchableOpacity onPress={() => toggleActive(i)} style={[styles.chipSmall, { backgroundColor: active ? colors.brand.primaryBg : colors.surface.app, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <View style={[styles.activeDot, { backgroundColor: active ? colors.status.success : colors.icon.muted }]} />
            <AppText variant="sm" weight="bold" color={active ? colors.status.success : colors.text.muted}>{active ? 'Bật' : 'Tắt'}</AppText>
          </TouchableOpacity>
        );
      },
    },
  ];

  const ruleColumns: Column<any>[] = [
    {
      key: 'name',
      title: 'Quy tắc',
      flex: 1,
      sortable: true,
      sortValue: (i) => i.name || '',
      render: (i) => (
        <TouchableOpacity onPress={() => { setEditing(i); setForm({ code: '', name: i.name || '', type: i.type || 'percent', value: '0', min_order: '0', valid_from: '', valid_until: '' }); setShowForm(true); }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{i.name}</AppText>
        </TouchableOpacity>
      ),
    },
    {
      key: 'value',
      title: 'Giá trị',
      width: 90,
      align: 'center',
      sortable: true,
      sortValue: (i) => i.value || 0,
      render: (i) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{i.type === 'percent' ? `${i.value}%` : `${Number(i.value).toLocaleString('vi-VN')}đ`}</AppText>,
    },
    {
      key: 'active',
      title: 'Trạng thái',
      width: 80,
      align: 'center',
      sortable: false,
      render: (i) => {
        const active = i.is_active !== false;
        return (
          <TouchableOpacity onPress={() => toggleActive(i)} style={[styles.chipSmall, { backgroundColor: active ? colors.brand.primaryBg : colors.surface.app, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
            <View style={[styles.activeDot, { backgroundColor: active ? colors.status.success : colors.icon.muted }]} />
            <AppText variant="sm" weight="bold" color={active ? colors.status.success : colors.text.muted}>{active ? 'Bật' : 'Tắt'}</AppText>
          </TouchableOpacity>
        );
      },
    },
  ];

  const columns = tab === 'voucher' ? voucherColumns : ruleColumns;

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="ticket-percent" size={18} color={colors.brand.primary} />
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

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="ticket-outline" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{stats.vouchers}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Voucher</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="sale" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{stats.rules}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Quy tắc</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="check-circle-outline" size={16} color={colors.status.success} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.status.success}>{stats.active}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Hoạt động</AppText>
          </View>
        </View>
      </View>

      <View style={styles.tabRow}>
        {(['voucher', 'rule'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Icon name={t === 'voucher' ? 'ticket-outline' : 'sale'} size={14} color={tab === t ? colors.brand.primary : colors.text.secondary} />
            <AppText variant="sm" color={tab === t ? colors.brand.primary : colors.text.secondary} weight={tab === t ? 'bold' : 'normal'}>
              {t === 'voucher' ? 'Voucher' : 'Quy tắc'} ({items.length})
            </AppText>
          </TouchableOpacity>
        ))}
        {isWide && (
          <TouchableOpacity onPress={openNew} style={styles.addBtnSm}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm mới</AppText>
          </TouchableOpacity>
        )}
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
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
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
      )}
      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi mới'} onClose={() => setShowForm(false)} onSave={async () => {
        try {
          const endpoint = tab === 'voucher' ? '/api/v1/quan-ly/promo/vouchers' : '/api/v1/quan-ly/promo/rules';
          const body = { ...form, value: parseFloat(form.value) || 0, min_order: parseFloat(form.min_order) || 0 };
          if (editing) await request(`${endpoint}/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
          else await request(endpoint, { method: 'POST', body: JSON.stringify(body) });
          setShowForm(false); load();
        } catch { Alert.alert('Lỗi', 'Không thể lưu khuyến mãi'); }
      }} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 10, paddingTop: 4 }}>
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Mã voucher *</AppText>
          <TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={styles.fieldInput} placeholder="VD: KM50K" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Tên khuyến mãi *</AppText>
          <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} placeholder="VD: Giảm 50k đơn từ 200k" placeholderTextColor={colors.text.muted} />
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setForm(p => ({ ...p, type: 'percent' }))} style={[styles.typeBtn, form.type === 'percent' && styles.typeBtnActive]}>
              <AppText variant="sm" color={form.type === 'percent' ? colors.brand.primary : colors.text.secondary} weight={form.type === 'percent' ? 'bold' : 'normal'}>Giảm %</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setForm(p => ({ ...p, type: 'fixed' }))} style={[styles.typeBtn, form.type === 'fixed' && styles.typeBtnActive]}>
              <AppText variant="sm" color={form.type === 'fixed' ? colors.brand.primary : colors.text.secondary} weight={form.type === 'fixed' ? 'bold' : 'normal'}>Tiền mặt</AppText>
            </TouchableOpacity>
          </View>
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Giá trị giảm</AppText>
          <TextInput value={form.value} onChangeText={v => setForm(p => ({ ...p, value: v }))} keyboardType="decimal-pad" style={styles.fieldInput} placeholder="0" placeholderTextColor={colors.text.muted} />
          
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Đơn hàng tối thiểu (VNĐ)</AppText>
          <TextInput value={form.min_order} onChangeText={v => setForm(p => ({ ...p, min_order: v }))} keyboardType="decimal-pad" style={styles.fieldInput} placeholder="0" placeholderTextColor={colors.text.muted} />
        </View>
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtnSm: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary, marginLeft: 'auto' },
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
  tabRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, marginBottom: 8, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.card },
  tabActive: { backgroundColor: colors.brand.primaryBg },
  chipSmall: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: shape.radius.sm },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },
  fieldInput: { borderRadius: shape.radius.md, paddingHorizontal: 10, paddingVertical: 8, ...font.md, color: colors.text.primary, backgroundColor: colors.surface.app },
  typeBtn: { flex: 1, height: 38, borderRadius: shape.radius.md, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' },
  typeBtnActive: { backgroundColor: colors.brand.primaryBg },
});
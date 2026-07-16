import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { Voucher, PromoRule } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';

export default function PromoScreen() {
  const { openSidebar } = useSidebar();
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
      title: 'Tên / Mã',
      flex: 1,
      sortable: true,
      sortValue: (i) => i.name || i.code || '',
      render: (i) => (
        <TouchableOpacity onPress={() => { setEditing(i); setForm({ code: i.code || '', name: i.name || '', type: i.type || 'percent', value: String(i.value || '0'), min_order: String(i.min_order || '0'), valid_from: i.valid_from || '', valid_until: i.valid_until || '' }); setShowForm(true); }} style={{ flex: 1 }}>
          <Text style={styles.cellPrimary} numberOfLines={1}>{i.name || i.code}</Text>
        </TouchableOpacity>
      ),
    },
    {
      key: 'value',
      title: 'Giá trị',
      width: 90,
      align: 'center',
      sortable: true,
      sortValue: (i) => parseFloat(i.value || '0'),
      render: (i) => <Text style={styles.cellMuted}>{tab === 'voucher' ? (i.type === 'percent' ? `${i.value}%` : `${Number(i.value).toLocaleString('vi-VN')}đ`) : (i.type || '-')}</Text>,
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
        return <Text style={[styles.cellMuted, { color: expiresSoon ? '#DC2626' : '#737373' }]}>{i.valid_from?.slice(0, 10)}</Text>;
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
          <TouchableOpacity onPress={() => toggleActive(i)} style={[styles.chipSmall, { backgroundColor: active ? '#DCFCE7' : '#F1F5F9', flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <View style={[styles.activeDot, { backgroundColor: active ? '#16A34A' : '#737373' }]} />
            <Text style={{ ...font.micro, fontWeight: '600', color: active ? '#16A34A' : '#737373' }}>{active ? 'Bật' : 'Tắt'}</Text>
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
          <Text style={styles.cellPrimary} numberOfLines={1}>{i.name}</Text>
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
      render: (i) => <Text style={styles.cellMuted}>{i.type === 'percent' ? `${i.value}%` : `${Number(i.value).toLocaleString('vi-VN')}đ`}</Text>,
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
          <TouchableOpacity onPress={() => toggleActive(i)} style={[styles.chipSmall, { backgroundColor: active ? '#DCFCE7' : '#F1F5F9', flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
            <View style={[styles.activeDot, { backgroundColor: active ? '#16A34A' : '#737373' }]} />
            <Text style={{ ...font.micro, fontWeight: '600', color: active ? '#16A34A' : '#737373' }}>{active ? 'Bật' : 'Tắt'}</Text>
          </TouchableOpacity>
        );
      },
    },
  ];

  const columns = tab === 'voucher' ? voucherColumns : ruleColumns;

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="ticket-percent" size={18} color={'#F97316'} />
        <Text style={styles.panelHeaderText}>Khuyến mãi</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8}}>
        <View style={{ flex: 1, alignItems: 'center' }}><Text style={styles.panelStatValue}>{stats.vouchers}</Text><Text style={styles.panelStatLabel}>Voucher</Text></View>
        <View style={styles.panelDividerV} />
        <View style={{ flex: 1, alignItems: 'center' }}><Text style={[styles.panelStatValue, { color: '#16A34A' }]}>{stats.active}</Text><Text style={styles.panelStatLabel}>Hoạt động</Text></View>
        <View style={styles.panelDividerV} />
        <View style={{ flex: 1, alignItems: 'center' }}><Text style={styles.panelStatValue}>{stats.rules}</Text><Text style={styles.panelStatLabel}>Quy tắc</Text></View>
      </View>
      <View style={styles.panelDivider} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <Icon name="history" size={14} color={'#737373'} />
        <Text style={styles.panelLabel}>Đã dùng {stats.used} lượt</Text>
      </View>
    </View>
  );

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Khuyến mãi" subtitle={`${stats.vouchers} voucher · ${stats.rules} quy tắc`}
        onMenuPress={openSidebar} compact
        right={isWide ? undefined : <TouchableOpacity onPress={openNew} style={styles.addBtn}><Icon name="plus" size={18} color="#fff" /><Text style={styles.addBtnText}>Thêm</Text></TouchableOpacity>}
      />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="ticket-outline" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.vouchers}</Text>
          </View>
          <Text style={styles.statLabel}>Voucher</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="sale" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.rules}</Text>
          </View>
          <Text style={styles.statLabel}>Quy tắc</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="check-circle-outline" size={14} color={'#737373'} /><Text style={styles.statValue}>{stats.active}</Text>
          </View>
          <Text style={styles.statLabel}>Hoạt động</Text>
        </View>
      </View>
      <View style={styles.tabRow}>
        {(['voucher', 'rule'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Icon name={t === 'voucher' ? 'ticket-outline' : 'sale'} size={14} color={tab === t ? '#fff' : '#737373'} />
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'voucher' ? 'Voucher' : 'Quy tắc'} ({items.length})</Text>
          </TouchableOpacity>
        ))}
        {isWide && <TouchableOpacity onPress={openNew} style={styles.addBtnSm}><Icon name="plus" size={14} color="#fff" /><Text style={styles.addBtnSmText}>Thêm</Text></TouchableOpacity>}
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
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
              emptyTitle="Chưa có"
              emptySubtitle="Thêm khuyến mãi đầu tiên"
            />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
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
          emptyTitle="Chưa có"
          emptySubtitle="Thêm khuyến mãi đầu tiên"
        />
      )}
      {!isWide && <FAB onPress={openNew} />}

      <FormModal visible={showForm} title={editing ? 'Sửa voucher' : 'Thêm voucher'} onClose={() => setShowForm(false)} onSave={async () => {
        try {
          const endpoint = tab === 'voucher' ? '/api/v1/quan-ly/promo/vouchers' : '/api/v1/quan-ly/promo/rules';
          const body = { ...form, value: parseFloat(form.value) || 0, min_order: parseFloat(form.min_order) || 0 };
          if (editing) await request(`${endpoint}/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) });
          else await request(endpoint, { method: 'POST', body: JSON.stringify(body) });
          setShowForm(false); load();
        } catch { Alert.alert('Lỗi', 'Không thể lưu'); }
      }} saveLabel={editing ? 'Cập nhật' : 'Thêm'}>
        <View style={{ gap: 8, paddingTop: 4 }}>
          <Text style={styles.fieldLabel}>Mã *</Text><TextInput value={form.code} onChangeText={v => setForm(p => ({ ...p, code: v }))} style={styles.fieldInput} />
          <Text style={styles.fieldLabel}>Tên *</Text><TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} style={styles.fieldInput} />
          <View style={{ flexDirection: 'row', gap: 8}}>
            <TouchableOpacity onPress={() => setForm(p => ({ ...p, type: 'percent' }))} style={[styles.typeBtn, form.type === 'percent' && styles.typeBtnActive]}>
              <Text style={{ ...font.button, color: form.type === 'percent' ? '#fff' : '#737373' }}>%</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setForm(p => ({ ...p, type: 'fixed' }))} style={[styles.typeBtn, form.type === 'fixed' && styles.typeBtnActive]}>
              <Text style={{ ...font.button, color: form.type === 'fixed' ? '#fff' : '#737373' }}>Tiền mặt</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldLabel}>Giá trị</Text><TextInput value={form.value} onChangeText={v => setForm(p => ({ ...p, value: v }))} keyboardType="decimal-pad" style={styles.fieldInput} />
          <Text style={styles.fieldLabel}>Đơn tối thiểu</Text><TextInput value={form.min_order} onChangeText={v => setForm(p => ({ ...p, min_order: v }))} keyboardType="decimal-pad" style={styles.fieldInput} />
        </View>
      </FormModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 44, borderRadius: 8, backgroundColor: '#F97316' },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: '#fff' },
  addBtnSm: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F97316', marginLeft: 'auto' },
  addBtnSmText: { ...font.label, color: '#fff' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
  statValue: { ...font.bodyBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.micro, color: '#737373', lineHeight: 12 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5' },
  tabActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  tabText: { ...font.micro, fontWeight: '600', color: '#737373' },
  tabTextActive: { color: '#fff' },
  cellPrimary: { ...font.bodySmall, fontWeight: '600', color: '#171717' },
  cellMuted: { ...font.caption, color: '#737373', textAlign: 'center' },
  chipSmall: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'center' },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.body, fontWeight: '600', color: '#171717' },
  panelStatLabel: { ...font.caption, color: '#737373', marginTop: 2 },
  panelStatValue: { ...font.sectionTitle, fontWeight: '600', color: '#171717' },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  panelDividerV: { width: 1, backgroundColor: '#F0F0F0' },
  panelLabel: { ...font.caption, color: '#737373' },
  fieldLabel: { ...font.label, color: '#404040', marginBottom: 4 },
  fieldInput: { borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 8, padding: 12, ...font.body, color: '#171717', backgroundColor: '#FAFAFA' },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E5E5', alignItems: 'center', backgroundColor: '#F5F5F5' },
  typeBtnActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },
});
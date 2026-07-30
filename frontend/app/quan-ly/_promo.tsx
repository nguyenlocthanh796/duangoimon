import React, { useMemo } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { useCrud } from '../../lib/hooks/useCrud';
import { colors, font, formatVND, ss } from '../../lib/theme';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';

function generateFallbackVouchers() {
  return [
    { id: 'v1', code: 'SUMMER20', name: 'Giảm 20k Đơn Hè', discount_val: 20000, discount_type: 'fixed', min_order: 100000, is_active: true },
    { id: 'v2', code: 'WELCOME50', name: 'Chào Bạn Mới Giảm 50%', discount_val: 50, discount_type: 'percent', min_order: 50000, is_active: true },
    { id: 'v3', code: 'VIPGIFT100', name: 'Voucher VIP Giảm 100k', discount_val: 100000, discount_type: 'fixed', min_order: 300000, is_active: true },
  ];
}
function generateFallbackRules() {
  return [
    { id: 'r1', name: 'Giảm 10% Đơn Từ 200k', min_order_val: 200000, discount_pct: 10, is_active: true },
    { id: 'r2', name: 'Tặng Nước Ngọt Đơn 150k', min_order_val: 150000, discount_pct: 5, is_active: true },
  ];
}

type TabKey = 'vouchers' | 'rules';

export default function PromoScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();
  const [tab, setTab] = React.useState<TabKey>('vouchers');
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const vouchersCrud = useCrud<any, any>({
    fetchFn: () => request(`${API}/promotions/vouchers`).then((d: any) => Array.isArray(d) ? d : (d?.items || [])),
    createFn: (p) => request(`${API}/promotions/vouchers`, { method: 'POST', body: JSON.stringify(p) }),
    fallbackData: generateFallbackVouchers(),
    formState: { code: '', name: '', discount_val: '', min_order: '' },
    formFromItem: (v: any) => ({ code: v.code, name: v.name || '', discount_val: String(v.discount_val || ''), min_order: String(v.min_order || '') }),
    buildPayload: (f) => ({ code: f.code, name: f.name || f.code, discount_val: parseFloat(f.discount_val) || 0, min_order: parseFloat(f.min_order) || 0 }),
    nameLabel: 'voucher',
  });

  const rulesCrud = useCrud<any, any>({
    fetchFn: () => request(`${API}/promotions/rules`).then((d: any) => Array.isArray(d) ? d : (d?.items || [])),
    createFn: (p) => request(`${API}/promotions/rules`, { method: 'POST', body: JSON.stringify(p) }),
    fallbackData: generateFallbackRules(),
    formState: { name: '', min_order_val: '', discount_pct: '' },
    formFromItem: (r: any) => ({ name: r.name, min_order_val: String(r.min_order_val || ''), discount_pct: String(r.discount_pct || '') }),
    buildPayload: (f) => ({ name: f.name, min_order_val: parseFloat(f.min_order_val) || 0, discount_pct: parseFloat(f.discount_pct) || 0 }),
    nameLabel: 'quy tắc',
  });

  const activeCrud = tab === 'vouchers' ? vouchersCrud : rulesCrud;
  const activeList = activeCrud.data;
  const loading = vouchersCrud.loading || rulesCrud.loading;

  const filteredList = useMemo(() => {
    let list = activeList;
    if (statusFilter === 'active') list = list.filter((item: any) => item.is_active !== false);
    if (statusFilter === 'paused') list = list.filter((item: any) => item.is_active === false);
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter((item: any) =>
      (item.code && item.code.toLowerCase().includes(q)) || (item.name && item.name.toLowerCase().includes(q))
    );
  }, [activeList, statusFilter, search]);

  const allCount = activeList.length;
  const activeCount = activeList.filter((item: any) => item.is_active !== false).length;
  const pausedCount = activeList.filter((item: any) => item.is_active === false).length;

  const voucherCols: Column<any>[] = [
    { key: 'code', title: 'Mã Voucher', flex: 1,
      render: (v) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[s.avatarCircle, { backgroundColor: '#FFF7ED' }]}><AppText variant="md" color="#F97316">VC</AppText></View>
          <View><AppText variant="md" color="#050505" numberOfLines={1}>{v.code}</AppText><AppText variant="md" color="#65676B">{v.name || ''}</AppText></View>
        </View>
      ) },
    { key: 'discount_val', title: 'Mức giảm', width: 130, align: 'right',
      render: (v) => <AppText variant="md" color={colors.status.success}>{v.discount_type === 'percent' ? `-${v.discount_val}%` : formatVND(v.discount_val || 0)}</AppText> },
    { key: 'min_order', title: 'Đơn tối thiểu', width: 140, align: 'right',
      render: (v) => <AppText variant="md" color="#050505">{formatVND(v.min_order || 0)}</AppText> },
  ];

  const ruleCols: Column<any>[] = [
    { key: 'name', title: 'Tên quy tắc', flex: 1,
      render: (r) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[s.avatarCircle, { backgroundColor: '#EEF2FF' }]}><AppText variant="md" color="#2563EB">QT</AppText></View>
          <AppText variant="md" color="#050505">{r.name}</AppText>
        </View>
      ) },
    { key: 'min_order_val', title: 'Đơn từ', width: 140, align: 'right',
      render: (r) => <AppText variant="md" color="#050505">{formatVND(r.min_order_val || 0)}</AppText> },
    { key: 'discount_pct', title: 'Giảm %', width: 100, align: 'right',
      render: (r) => <AppText variant="md" color={colors.status.success}>-{r.discount_pct}%</AppText> },
  ];

  const renderPanel = () => (
    <View style={s.panelBox}>
      <View style={s.panelHeader}><AppText variant="md" color="#050505">Thống Kê Khuyến Mãi</AppText></View>
      <View style={{ gap: 10, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF7ED', padding: 12, borderRadius: 12 }}>
          <AppText variant="md" color="#65676B">Voucher hoạt động</AppText>
          <AppText variant="md" color="#F97316">{vouchersCrud.data.length} mã</AppText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12 }}>
          <AppText variant="md" color="#65676B">Quy tắc tự động</AppText>
          <AppText variant="md" color="#2563EB">{rulesCrud.data.length} quy tắc</AppText>
        </View>
      </View>
      <View style={s.panelDivider} />
      <AppText variant="md" color="#050505">Danh Sách HOT</AppText>
      <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
        {vouchersCrud.data.map((v: any) => (
          <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <AppText variant="md" color="#0F172A">{v.code}</AppText>
            <AppText variant="md" color={colors.status.success}>
              {v.discount_type === 'percent' ? `-${v.discount_val}%` : formatVND(v.discount_val || 0)}
            </AppText>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity style={s.panelCta} onPress={() => vouchersCrud.openAdd()}>
        <Icon name="plus" size={16} color={colors.text.inverse} />
        <AppText variant="md" color={colors.text.inverse}>Tạo Voucher mới</AppText>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, position: 'relative' }}>
      {!isWide && (
        <View style={ss.topActionBar}>
          <View style={ss.searchInputWrap}>
            <Icon name="magnify" size={20} color="#64748B" />
            <TextInput value={search} onChangeText={setSearch} placeholder="Tìm mã..."
              placeholderTextColor="#94A3B8" style={ss.searchTextInput} />
          </View>
          <TouchableOpacity onPress={() => activeCrud.openAdd()} style={ss.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="md" color={colors.text.inverse}>Tạo mới</AppText>
          </TouchableOpacity>
        </View>
      )}
      {/* Tabs + filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, height: 44 }} contentContainerStyle={ss.filterChipsContainer}>
        {(['vouchers', 'rules'] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[ss.filterChip, tab === t && ss.filterChipActive]}>
            <AppText variant="md" color={tab === t ? colors.brand.primary : '#334155'}>
              {t === 'vouchers' ? `Voucher (${vouchersCrud.data.length})` : `Quy tắc (${rulesCrud.data.length})`}
            </AppText>
          </TouchableOpacity>
        ))}
        <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 4 }} />
        {[
          { key: 'all', label: `Tất cả (${allCount})` },
          { key: 'active', label: `Đang chạy (${activeCount})` },
          { key: 'paused', label: `Tạm dừng (${pausedCount})` },
        ].map((sItem) => (
          <TouchableOpacity key={sItem.key} onPress={() => setStatusFilter(sItem.key)}
            style={[ss.filterChip, statusFilter === sItem.key && ss.filterChipActive]}>
            <AppText variant="md" color={statusFilter === sItem.key ? colors.brand.primary : '#334155'}>{sItem.label}</AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#FFF7ED' }]}><AppText variant="md" color="#F97316">VC</AppText></View>
            <View><AppText variant="md" color="#050505">{vouchersCrud.data.length} mã</AppText><AppText variant="md" color="#65676B">Tổng Voucher</AppText></View>
          </View>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}><AppText variant="md" color="#2563EB">QT</AppText></View>
            <View><AppText variant="md" color="#2563EB">{rulesCrud.data.length} quy tắc</AppText><AppText variant="md" color="#65676B">Tự động</AppText></View>
          </View>
        </View>
      )}

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<any> columns={tab === 'vouchers' ? voucherCols : ruleCols} data={filteredList}
              getRowId={(item) => item.id} loading={loading} onRefresh={() => { vouchersCrud.loadData(); rulesCrud.loadData(); }}
              compact emptyIcon="ticket-outline" emptyTitle="Chưa có khuyến mãi" emptySubtitle="Nhấn + để tạo" />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <AppText variant="md" color="#1E293B" style={{ flex: 1 }}>
                {tab === 'vouchers' ? `DANH SÁCH VOUCHER (${filteredList.length})` : `QUY TẮC TỰ ĐỘNG (${filteredList.length})`}
              </AppText>
            </View>
            <View style={ss.sectionItems}>
              {filteredList.map((v: any) => (
                <View key={v.id} style={ss.listRow}>
                  <View style={[ss.iconCircleSm, { backgroundColor: '#FFF7ED' }]}>
                    <Icon name={tab === 'vouchers' ? 'ticket-confirmation' : 'flash'} size={16} color="#F97316" />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 10 }}>
                    <AppText variant="md" color="#0F172A" numberOfLines={1}>{v.code || v.name}</AppText>
                    <AppText variant="md" color="#64748B">Đơn từ {formatVND(v.min_order || v.min_order_val || 0)}</AppText>
                  </View>
                  <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                    <AppText variant="md" color={colors.status.success}>
                      {v.discount_type === 'percent' || v.discount_pct ? `Giảm ${v.discount_val || v.discount_pct}%` : formatVND(v.discount_val || 0)}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <FormModal visible={vouchersCrud.showForm} title="Tạo mã Voucher mới"
        onClose={() => vouchersCrud.setShowForm(false)}
        onSave={() => vouchersCrud.handleSave(() => !vouchersCrud.form.code || !vouchersCrud.form.discount_val ? 'Mã và mức giảm bắt buộc' : null)}>
        <View style={{ gap: 12 }}>
          <TextInput style={s.input} placeholder="Mã Voucher (*)" value={vouchersCrud.form.code}
            onChangeText={(v) => vouchersCrud.setForm((f: any) => ({ ...f, code: v.toUpperCase() }))} />
          <TextInput style={s.input} placeholder="Tên chương trình" value={vouchersCrud.form.name}
            onChangeText={(v) => vouchersCrud.setForm((f: any) => ({ ...f, name: v }))} />
          <TextInput style={s.input} placeholder="Mức giảm (VNĐ) (*)" keyboardType="numeric" value={vouchersCrud.form.discount_val}
            onChangeText={(v) => vouchersCrud.setForm((f: any) => ({ ...f, discount_val: v }))} />
          <TextInput style={s.input} placeholder="Đơn tối thiểu (VNĐ)" keyboardType="numeric" value={vouchersCrud.form.min_order}
            onChangeText={(v) => vouchersCrud.setForm((f: any) => ({ ...f, min_order: v }))} />
        </View>
      </FormModal>

      <FormModal visible={rulesCrud.showForm} title="Thêm quy tắc tự động"
        onClose={() => rulesCrud.setShowForm(false)}
        onSave={() => rulesCrud.handleSave(() => !rulesCrud.form.name ? 'Tên quy tắc bắt buộc' : null)}>
        <View style={{ gap: 12 }}>
          <TextInput style={s.input} placeholder="Tên quy tắc (*)" value={rulesCrud.form.name}
            onChangeText={(v) => rulesCrud.setForm((f: any) => ({ ...f, name: v }))} />
          <TextInput style={s.input} placeholder="Đơn từ (VNĐ)" keyboardType="numeric" value={rulesCrud.form.min_order_val}
            onChangeText={(v) => rulesCrud.setForm((f: any) => ({ ...f, min_order_val: v }))} />
          <TextInput style={s.input} placeholder="Giảm (%)" keyboardType="numeric" value={rulesCrud.form.discount_pct}
            onChangeText={(v) => rulesCrud.setForm((f: any) => ({ ...f, discount_pct: v }))} />
        </View>
      </FormModal>
    </View>
  );
}

const s = StyleSheet.create({
  avatarCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: 999, height: 44, marginTop: 4 },
  input: { height: 44, borderWidth: 1, borderColor: colors.border.default, borderRadius: 8, paddingHorizontal: 12, color: colors.text.primary },
});
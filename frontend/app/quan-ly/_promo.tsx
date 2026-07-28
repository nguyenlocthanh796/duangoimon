import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND, ss } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import FormModal from '../../lib/components/ui/FormModal';
import DetailModal from '../../lib/components/ui/DetailModal';
import FAB from '../../lib/components/ui/FAB';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import { useSidebar } from '../../lib/context/SidebarContext';

const API = '/api/v1/quan-ly';

type TabKey = 'vouchers' | 'rules';

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

export default function PromoScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const { openSidebar } = useSidebar();
  const [tab, setTab] = useState<TabKey>('vouchers');
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', discount_val: '', min_order: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [vData, rData]: any[] = await Promise.all([
        request(`${API}/promotions/vouchers`).catch(() => generateFallbackVouchers()),
        request(`${API}/promotions/rules`).catch(() => generateFallbackRules()),
      ]);
      const vList = Array.isArray(vData) ? vData : (vData?.items || []);
      const rList = Array.isArray(rData) ? rData : (rData?.items || []);
      setVouchers(vList.length > 0 ? vList : generateFallbackVouchers());
      setRules(rList.length > 0 ? rList : generateFallbackRules());
    } catch {
      setVouchers(generateFallbackVouchers());
      setRules(generateFallbackRules());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveVoucher = async () => {
    if (!form.code || !form.discount_val) { Alert.alert('Lỗi', 'Mã và mức giảm là bắt buộc'); return; }
    try {
      await request(`${API}/promotions/vouchers`, {
        method: 'POST',
        body: JSON.stringify({
          code: form.code,
          name: form.name || form.code,
          discount_val: parseFloat(form.discount_val) || 0,
          min_order: parseFloat(form.min_order) || 0,
        }),
      });
      setShowForm(false); setForm({ code: '', name: '', discount_val: '', min_order: '' }); load();
    } catch { Alert.alert('Lỗi', 'Không thể lưu Voucher'); }
  };

  const voucherCols: Column<any>[] = [
    {
      key: 'code',
      title: 'Mã Voucher',
      flex: 1,
      render: (v) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.avatarCircle, { backgroundColor: '#FFF7ED', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="sm" weight="bold" color="#F97316" style={{ fontSize: 11 }}>VC</AppText>
          </View>
          <View>
            <AppText variant="sm" weight="bold" color="#050505" numberOfLines={1}>{v.code}</AppText>
            <AppText variant="sm" color="#65676B">{v.name || 'Voucher ưu đãi'}</AppText>
          </View>
        </View>
      ),
    },
    {
      key: 'discount_val',
      title: 'Mức giảm',
      width: 130,
      align: 'right',
      render: (v) => (
        <AppText variant="sm" weight="bold" color={colors.status.success}>
          {v.discount_type === 'percent' ? `Giảm ${v.discount_val}%` : formatVND(v.discount_val || 0)}
        </AppText>
      ),
    },
    {
      key: 'min_order',
      title: 'Đơn tối thiểu',
      width: 140,
      align: 'right',
      render: (v) => <AppText variant="sm" color="#050505">{formatVND(v.min_order || 0)}</AppText>,
    },
  ];

  const ruleCols: Column<any>[] = [
    {
      key: 'name',
      title: 'Tên quy tắc',
      flex: 1,
      render: (r) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="sm" weight="bold" color="#2563EB" style={{ fontSize: 11 }}>QT</AppText>
          </View>
          <AppText variant="sm" weight="bold" color="#050505">{r.name}</AppText>
        </View>
      ),
    },
    {
      key: 'min_order_val',
      title: 'Đơn từ',
      width: 140,
      align: 'right',
      render: (r) => <AppText variant="sm" color="#050505">{formatVND(r.min_order_val || 0)}</AppText>,
    },
    {
      key: 'discount_pct',
      title: 'Giảm %',
      width: 100,
      align: 'right',
      render: (r) => <AppText variant="sm" weight="bold" color={colors.status.success}>-{r.discount_pct}%</AppText>,
    },
  ];

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <AppText variant="md" weight="bold" color="#050505">Thống Kê Chương Trình Khuyến Mãi</AppText>
      </View>

      <View style={{ gap: 10, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF7ED', padding: 12, borderRadius: 12 }}>
          <AppText variant="sm" color="#65676B">Voucher đang hoạt động</AppText>
          <AppText variant="md" weight="bold" color="#F97316">{vouchers.length} mã</AppText>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12 }}>
          <AppText variant="sm" color="#65676B">Quy tắc tự động áp dụng</AppText>
          <AppText variant="md" weight="bold" color="#2563EB">{rules.length} quy tắc</AppText>
        </View>
      </View>

      <View style={styles.panelDivider} />

      <AppText variant="sm" weight="bold" color="#050505">Danh Sách Mã Ưu Đãi HOT</AppText>
      <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
        {vouchers.map(v => (
          <View key={v.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <AppText variant="sm" weight="bold" color="#F97316" style={{ fontSize: 14 }}>%</AppText>
              <View>
                <AppText variant="sm" weight="bold" color="#050505">{v.code}</AppText>
                <AppText variant="sm" color="#65676B">Đơn từ {formatVND(v.min_order || 0)}</AppText>
              </View>
            </View>
            <AppText variant="sm" weight="bold" color={colors.status.success}>
              {v.discount_type === 'percent' ? `Giảm ${v.discount_val}%` : formatVND(v.discount_val || 0)}
            </AppText>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.panelCta} onPress={() => setShowForm(true)}>
        <Icon name="plus" size={16} color={colors.text.inverse} />
        <AppText variant="sm" weight="bold" color={colors.text.inverse}>Tạo Voucher mới</AppText>
      </TouchableOpacity>
    </View>
  );

  const renderMobilePromoCard = ({ item: v }: { item: any }) => (
    <TouchableOpacity
      style={ss.listRow}
      onPress={() => setSelected(v)}
      activeOpacity={0.7}
    >
      <View style={[ss.iconCircleSm, { backgroundColor: '#FFF7ED' }]}>
        <Icon name={tab === 'vouchers' ? "ticket-confirmation" : "flash"} size={16} color="#F97316" />
      </View>
      <View style={{ flex: 1, paddingLeft: 10, justifyContent: 'center' }}>
        <AppText variant="sm" weight="bold" color="#0F172A" numberOfLines={1}>{v.code || v.name}</AppText>
        <AppText variant="sm" color="#64748B" numberOfLines={1} style={{ marginTop: 2, fontSize: 11 }}>
          Đơn từ {formatVND(v.min_order || v.min_order_val || 0)}
        </AppText>
      </View>
      <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
        <AppText variant="sm" weight="bold" color={colors.status.success} style={{ fontSize: 11 }}>
          {v.discount_type === 'percent' || v.discount_pct ? `Giảm ${v.discount_val || v.discount_pct}%` : formatVND(v.discount_val || 0)}
        </AppText>
      </View>
    </TouchableOpacity>
  );

  const activeList = tab === 'vouchers' ? vouchers : rules;
  const allCount = activeList.length;
  const activeCount = activeList.filter(item => item.is_active !== false).length;
  const pausedCount = activeList.filter(item => item.is_active === false).length;

  const filteredList = useMemo(() => {
    let list = activeList;
    if (statusFilter === 'active') list = list.filter(item => item.is_active !== false);
    if (statusFilter === 'paused') list = list.filter(item => item.is_active === false);
    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(item =>
      (item.code && item.code.toLowerCase().includes(q)) ||
      (item.name && item.name.toLowerCase().includes(q))
    );
  }, [activeList, statusFilter, search]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app, position: 'relative' }}>
      {/* Top Mobile Header */}
      {!isWide && (
        isSearchOpen || search.length > 0 ? (
          <View style={ss.topActionBar}>
            <View style={ss.searchInputWrap}>
              <Icon name="magnify" size={20} color="#64748B" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Tìm mã khuyến mãi..."
                placeholderTextColor="#94A3B8"
                style={ss.searchTextInput}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowForm(true)} style={ss.addBtn}>
              <Icon name="plus" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Tạo mới</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={ss.mobileActionRow}>
            <AppText variant="md" weight="bold" color="#050505">{filteredList.length} khuyến mãi</AppText>
            <TouchableOpacity onPress={() => setShowForm(true)} style={ss.addBtn}>
              <Icon name="plus" size={16} color={colors.text.inverse} />
              <AppText variant="sm" weight="bold" color={colors.text.inverse}>Tạo mới</AppText>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* ── Unified Toolbar: Section Switcher & Status Filter Chips ────────── */}
      <View style={{ width: '100%', marginBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%', flexGrow: 0, height: 44 }}
          contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 }}
        >
          {/* Section Switchers */}
          {(['vouchers', 'rules'] as const).map((t) => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[ss.filterChip, active && ss.filterChipActive]}
              >
                <AppText
                  variant="sm"
                  weight="bold"
                  color={active ? colors.brand.primary : '#334155'}
                >
                  {t === 'vouchers' ? `Mã Voucher (${vouchers.length})` : `Quy tắc tự động (${rules.length})`}
                </AppText>
              </TouchableOpacity>
            );
          })}

          {/* Vertical Divider */}
          <View style={{ width: 1, height: 20, backgroundColor: '#E2E8F0', marginHorizontal: 2 }} />

          {/* Status Filters */}
          {[
            { key: 'all', label: `Tất cả (${allCount})` },
            { key: 'active', label: `Đang diễn ra (${activeCount})` },
            { key: 'paused', label: `Tạm dừng (${pausedCount})` },
          ].map((sItem) => {
            const active = statusFilter === sItem.key;
            return (
              <TouchableOpacity
                key={sItem.key}
                onPress={() => setStatusFilter(sItem.key)}
                style={[ss.filterChip, active && ss.filterChipActive]}
              >
                <AppText
                  variant="sm"
                  weight="bold"
                  color={active ? colors.brand.primary : '#334155'}
                >
                  {sItem.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 📊 Executive KPI Strip (Desktop only) */}
      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#FFF7ED' }]}>
              <AppText variant="sm" weight="bold" color="#F97316" style={{ fontSize: 11 }}>VC</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#050505">{vouchers.length} mã</AppText>
              <AppText variant="sm" color="#65676B">Tổng Voucher</AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
              <AppText variant="sm" weight="bold" color={colors.status.success} style={{ fontSize: 12 }}>✓</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color={colors.status.success}>Đang chạy</AppText>
              <AppText variant="sm" color="#65676B">Trạng thái ưu đãi</AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}>
              <AppText variant="sm" weight="bold" color="#2563EB" style={{ fontSize: 11 }}>QT</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#2563EB">{rules.length} quy tắc</AppText>
              <AppText variant="sm" color="#65676B">Tự động áp dụng</AppText>
            </View>
          </View>
        </View>
      )}

      {!isWide && (
        <DetailModal
          visible={!!selected}
          title="Chi Tiết Khuyến Mãi"
          subtitle={selected?.code || selected?.name ? `${selected.code || ''} ${selected.name || ''}` : undefined}
          onClose={() => setSelected(null)}
        >
          {renderPanel()}
        </DetailModal>
      )}

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<any>
              columns={tab === 'vouchers' ? voucherCols : ruleCols}
              data={filteredList}
              getRowId={(item) => item.id}
              loading={loading}
              onRefresh={load}
              compact
              emptyIcon="ticket-outline"
              emptyTitle="Chưa có khuyến mãi nào"
              emptySubtitle="Nhấn + để tạo khuyến mãi đầu tiên"
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <View style={[ss.iconCircleSm, { backgroundColor: '#FFF7ED' }]}>
                <Icon name="ticket-percent" size={14} color="#F97316" />
              </View>
              <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1 }}>
                {tab === 'vouchers' ? `DANH SÁCH VOUCHER (${filteredList.length})` : `QUY TẮC TỰ ĐỘNG (${filteredList.length})`}
              </AppText>
            </View>

            <View style={ss.sectionItems}>
              {filteredList.map((v: any) => (
                <React.Fragment key={v.id}>
                  {renderMobilePromoCard({ item: v })}
                </React.Fragment>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <FormModal
        visible={showForm}
        title="Tạo mã Voucher mới"
        onClose={() => setShowForm(false)}
        onSave={handleSaveVoucher}
      >
        <View style={{ gap: 12 }}>
          <TextInput style={styles.input} placeholder="Mã Voucher (VD: SUMMER20) (*)" value={form.code} onChangeText={(v) => setForm(f => ({ ...f, code: v.toUpperCase() }))} />
          <TextInput style={styles.input} placeholder="Tên chương trình" value={form.name} onChangeText={(v) => setForm(f => ({ ...f, name: v }))} />
          <TextInput style={styles.input} placeholder="Mức giảm (VNĐ) (*)" keyboardType="numeric" value={form.discount_val} onChangeText={(v) => setForm(f => ({ ...f, discount_val: v }))} />
          <TextInput style={styles.input} placeholder="Đơn hàng tối thiểu (VNĐ)" keyboardType="numeric" value={form.min_order} onChangeText={(v) => setForm(f => ({ ...f, min_order: v }))} />
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
    paddingVertical: 6,
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

  /* Filter chips */
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: colors.brand.primaryBg,
    borderColor: '#FFEDD5',
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
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircleSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionWrap: {
    backgroundColor: colors.surface.card,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionItems: {
    backgroundColor: colors.surface.card,
  },
  metricContainer: {
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
  metricCard: {
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
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 12,
    ...font.md,
    color: colors.text.primary,
  },
  pillChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  pillChipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.brand.primary,
  },
});
import React, { useCallback, useEffect, useState } from 'react';
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

export default function PromoScreen() {
  const { isWide } = useResponsive();
  const [tab, setTab] = useState<TabKey>('vouchers');
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
          <View style={[styles.avatarCircle, { backgroundColor: '#FFF7ED', width: 36, height: 36, borderRadius: 18 }]}>
            <Icon name="ticket-percent" size={20} color="#F97316" />
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
          <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF', width: 36, height: 36, borderRadius: 18 }]}>
            <Icon name="sale" size={20} color="#2563EB" />
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
        <Icon name="ticket-percent" size={20} color="#F97316" />
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
              <Icon name="ticket-confirmation" size={18} color="#F97316" />
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
    <View style={styles.itemMobile}>
      <View style={styles.cardHeaderRow}>
        <View style={[styles.avatarCircle, { backgroundColor: '#FFF7ED' }]}>
          <Icon name="ticket-percent" size={22} color="#F97316" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>{v.code || v.name}</AppText>
          <AppText variant="sm" color="#65676B" style={{ marginTop: 2 }}>
            Áp dụng cho đơn từ {formatVND(v.min_order || v.min_order_val || 0)}
          </AppText>
        </View>
        <View style={{ backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
          <AppText variant="md" weight="bold" color={colors.status.success}>
            {v.discount_type === 'percent' || v.discount_pct ? `Giảm ${v.discount_val || v.discount_pct}%` : formatVND(v.discount_val || 0)}
          </AppText>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Mobile Header */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{vouchers.length} mã khuyến mãi</AppText>
          <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Tạo mới</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* 📊 Native App Style KPI Widget Cards Strip */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="ticket-percent" size={20} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{vouchers.length} mã</AppText>
            <AppText variant="sm" color="#65676B">Tổng Voucher</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="check-circle" size={20} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>Đang chạy</AppText>
            <AppText variant="sm" color="#65676B">Trạng thái</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="sale" size={20} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#2563EB">{rules.length} quy tắc</AppText>
            <AppText variant="sm" color="#65676B">Tự động áp dụng</AppText>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={{ marginVertical: 4, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {(['vouchers', 'rules'] as const).map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Icon name={t === 'vouchers' ? 'ticket-percent' : 'sale'} size={14} color={active ? colors.brand.primary : '#65676B'} />
                <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                  {t === 'vouchers' ? `Mã Voucher (${vouchers.length})` : `Quy tắc tự động (${rules.length})`}
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
              columns={tab === 'vouchers' ? voucherCols : ruleCols}
              data={tab === 'vouchers' ? vouchers : rules}
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
        <FlatList
          data={tab === 'vouchers' ? vouchers : rules}
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
                subtitle="Nhấn + để tạo khuyến mãi đầu tiên"
              />
            )
          }
        />
      )}

      {!isWide && <FAB onPress={() => setShowForm(true)} />}

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
    justify: 'center',
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
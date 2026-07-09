import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, Transaction } from '../../lib/api';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import FAB from '../../lib/components/ui/FAB';
import EmptyState from '../../lib/components/ui/EmptyState';
import TransactionFormContent from '../../lib/components/ke-toan/TransactionFormContent';
import BillDetailModal from '../../lib/components/ke-toan/BillDetailModal';

type FilterType = null | 'thu' | 'chi';
type FormState = { type: 'thu' | 'chi'; category: string; amount: string; note: string };

const INITIAL_FORM: FormState = { type: 'thu', category: '', amount: '', note: '' };
const formatAmount = (n: number) => n.toLocaleString('vi-VN') + '₫';
const formatDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');

export default function KeToanScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();

  const [txs, setTxs] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<FilterType>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const loadTxs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await api.getTransactions(filter ?? undefined);
      setTxs(data);
    } catch (e: unknown) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Không thể tải dữ liệu');
    } finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { loadTxs(); }, [loadTxs]);

  const totalThu = txs.filter(t => t.type === 'thu').reduce((s, t) => s + t.amount, 0);
  const totalChi = txs.filter(t => t.type === 'chi').reduce((s, t) => s + t.amount, 0);

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.category.trim()) e.category = 'Vui lòng nhập danh mục';
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) e.amount = 'Số tiền phải lớn hơn 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.createTransaction({ type: form.type, category: form.category.trim(), amount: parseFloat(form.amount), note: form.note.trim() });
      setShowForm(false); setForm(INITIAL_FORM); setErrors({}); loadTxs();
    } catch (e: unknown) {
      Alert.alert('Lỗi', e instanceof Error ? e.message : 'Ghi nhận thất bại');
    } finally { setSubmitting(false); }
  };

  const openForm = () => { setForm(INITIAL_FORM); setErrors({}); setShowForm(true); };

  // ── KPI panel (iPad right) ──
  const renderKpiPanel = () => (
    <View style={styles.cardBox}>
      <View style={styles.cardHeader}>
        <Icon name="chart-box-outline" size={18} color={colors.brand.primary} />
        <Text style={styles.cardHeaderText}>Tổng quan thu chi</Text>
      </View>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCol}>
          <View style={[styles.kpiDot, { backgroundColor: colors.status.success }]} />
          <Text style={styles.kpiLabel}>Tổng Thu</Text>
          <Text style={[styles.kpiValue, { color: colors.status.success }]}>{formatAmount(totalThu)}</Text>
        </View>
        <View style={styles.kpiDividerV} />
        <View style={styles.kpiCol}>
          <View style={[styles.kpiDot, { backgroundColor: colors.status.danger }]} />
          <Text style={styles.kpiLabel}>Tổng Chi</Text>
          <Text style={[styles.kpiValue, { color: colors.status.danger }]}>{formatAmount(totalChi)}</Text>
        </View>
      </View>
      <View style={styles.kpiDivider} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.kpiDot, { backgroundColor: totalThu - totalChi >= 0 ? colors.status.success : colors.status.danger }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kpiLabel}>Thực tế</Text>
          <Text style={[styles.kpiValue, { color: totalThu - totalChi >= 0 ? colors.status.success : colors.status.danger }]}>
            {formatAmount(totalThu - totalChi)}
          </Text>
        </View>
        <TouchableOpacity style={styles.kpiCta} onPress={openForm}>
          <Icon name="plus" size={16} color={colors.text.inverse} />
          <Text style={styles.kpiCtaText}>Ghi nhận</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Table Header ──
  const renderTableHeader = () => {
    if (isWide) {
      return (
        <View style={styles.tableHeader}>
          <Text style={[styles.colHead, { flex: 1.2 }]}>Ngày</Text>
          <Text style={[styles.colHead, { flex: 1.2 }]}>Danh mục</Text>
          <Text style={[styles.colHead, { flex: 2 }]}>Diễn giải</Text>
          <Text style={[styles.colHead, { flex: 1.2, textAlign: 'right' }]}>Thu (+)</Text>
          <Text style={[styles.colHead, { flex: 1.2, textAlign: 'right' }]}>Chi (-)</Text>
          <Text style={[styles.colHead, { flex: 1, textAlign: 'center' }]}>Người tạo</Text>
        </View>
      );
    }
    return (
      <View style={styles.tableHeader}>
        <Text style={[styles.colHead, { flex: 2 }]}>Diễn giải & Ngày</Text>
        <Text style={[styles.colHead, { flex: 1.2 }]}>Danh mục</Text>
        <Text style={[styles.colHead, { flex: 1.2, textAlign: 'right' }]}>Số tiền</Text>
      </View>
    );
  };

  // ── Transaction Row ──
  const renderItem = ({ item }: { item: Transaction }) => {
    const hasOrder = !!item.ref_id;
    const handlePress = () => { if (hasOrder) setSelectedOrderId(item.ref_id!.toString()); };

    if (isWide) {
      return (
        <TouchableOpacity style={styles.tableRow} onPress={handlePress} disabled={!hasOrder} activeOpacity={0.7}>
          <Text style={[styles.colText, { flex: 1.2 }]}>{formatDate(item.created_at)}</Text>
          <Text style={[styles.colText, { flex: 1.2 }]} numberOfLines={1}>{item.category || 'Khác'}</Text>
          <Text style={[styles.colText, { flex: 2 }]} numberOfLines={1}>{item.note?.trim() || '-'}</Text>
          <Text style={[styles.colText, { flex: 1.2, textAlign: 'right', color: colors.status.success, fontWeight: '700' }]}>
            {item.type === 'thu' ? formatAmount(item.amount) : ''}
          </Text>
          <Text style={[styles.colText, { flex: 1.2, textAlign: 'right', color: colors.status.danger, fontWeight: '700' }]}>
            {item.type === 'chi' ? formatAmount(item.amount) : ''}
          </Text>
          <Text style={[styles.colText, { flex: 1, textAlign: 'center', color: colors.text.muted }]} numberOfLines={1}>admin</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={styles.tableRow} onPress={handlePress} disabled={!hasOrder} activeOpacity={0.7}>
        <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.typeIcon, { backgroundColor: item.type === 'thu' ? '#F0FDF4' : '#FEF2F2' }]}>
            <Icon name={item.type === 'thu' ? 'arrow-bottom-left' : 'arrow-top-right'} size={14} color={item.type === 'thu' ? colors.status.success : colors.status.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.colTextPrimary} numberOfLines={1}>{item.note?.trim() ? item.note : (item.category || 'Không ghi chú')}</Text>
            <Text style={styles.colTextSub}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        <Text style={[styles.colText, { flex: 1.2 }]} numberOfLines={1}>{item.category || 'Khác'}</Text>
        <Text style={[styles.colText, { flex: 1.2, textAlign: 'right', fontWeight: '800', color: item.type === 'thu' ? colors.status.success : colors.status.danger }]}>
          {item.type === 'thu' ? '+' : '-'}{formatAmount(item.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <EmptyState icon="wallet-outline" title="Chưa có giao dịch"
      subtitle={filter === 'thu' ? 'Không có khoản thu nào.' : filter === 'chi' ? 'Không có khoản chi nào.' : 'Nhấn + để ghi nhận giao dịch đầu tiên.'} />
  );

  const renderList = () => {
    if (loading) return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
    return (
      <FlatList data={txs} keyExtractor={t => t.id} renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={txs.length > 0 ? renderTableHeader : null}
        stickyHeaderIndices={txs.length > 0 ? [0] : undefined}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: isWide ? 12 : 4 }, txs.length === 0 && { flex: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadTxs(true)} tintColor={colors.brand.primary} colors={[colors.brand.primary]} />} />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScreenHeader title="Kế Toán" subtitle="Quản lý thu chi" onMenuPress={openSidebar}
        right={
          <TouchableOpacity onPress={openForm} style={styles.addBtn}>
            <Icon name="plus" size={18} color={colors.text.inverse} />
            <Text style={styles.addBtnText}>Ghi nhận</Text>
          </TouchableOpacity>
        } />
      {/* Filter chips */}
      <View style={styles.filterRow}>
        {([null, 'thu', 'chi'] as FilterType[]).map(f => (
          <TouchableOpacity key={f ?? 'all'} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
            {f === 'thu' ? <Icon name="arrow-bottom-left" size={13} color={filter === f ? '#fff' : colors.status.success} /> : null}
            {f === 'chi' ? <Icon name="arrow-top-right" size={13} color={filter === f ? '#fff' : colors.status.danger} /> : null}
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f ? (f === 'thu' ? 'Thu' : 'Chi') : 'Tất cả'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 12 }}>{renderKpiPanel()}</View>
        </View>
      ) : renderList()}
      {!isWide && <FAB onPress={openForm} />}
      <FormModal visible={showForm} title="Ghi nhận giao dịch"
        onClose={() => { setShowForm(false); setErrors({}); }}
        onSave={handleAdd} saveLabel={form.type === 'thu' ? 'Thêm thu' : 'Thêm chi'} saving={submitting}>
        <TransactionFormContent form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
      </FormModal>
      <BillDetailModal visible={!!selectedOrderId} orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 44, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  addBtnText: { ...font.buttonSmall, fontWeight: '600', color: colors.text.inverse },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { ...font.badge, color: colors.text.muted },
  chipTextActive: { color: '#fff' },

  cardBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  cardHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },

  kpiRow: { flexDirection: 'row', gap: 12 },
  kpiCol: { flex: 1, alignItems: 'center', gap: 4 },
  kpiDot: { width: 8, height: 8, borderRadius: 4 },
  kpiLabel: { ...font.caption, color: colors.text.muted },
  kpiValue: { ...font.h3 },
  kpiDivider: { height: 1, backgroundColor: colors.border.light },
  kpiDividerV: { width: 1, backgroundColor: colors.border.light },
  kpiCta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand.primary, borderRadius: shape.radius.md, paddingHorizontal: 14, paddingVertical: 10, minHeight: 38 },
  kpiCtaText: { ...font.buttonSmall, color: colors.text.inverse },

  listContent: { paddingTop: 0, paddingBottom: 100 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...font.bodySmall, color: colors.text.muted },

  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1.5, borderBottomColor: colors.border.default },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  colHead: { ...font.caption, color: colors.text.muted, fontWeight: '700' },
  colText: { ...font.bodySmall, color: colors.text.primary },
  colTextPrimary: { ...font.bodySmall, fontWeight: '600', color: colors.text.primary },
  colTextSub: { ...font.caption, color: colors.text.muted, marginTop: 1 },

  typeIcon: { width: 28, height: 28, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },

  separator: { width: 1, backgroundColor: colors.border.light },
});
